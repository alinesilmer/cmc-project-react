import { useSyncExternalStore } from "react";
import { fetchClinicasTodas, fetchMedicosTodos, fetchObrasSocialesTodas } from "../api";
import { dedupePorId } from "../components/localSearch";
import type { ClinicaOption, MedicoOption, ObraSocialOption } from "../types";

// Catálogos del formulario de carga (médicos, obras sociales, clínicas), compartidos por
// todas las aperturas del formulario. Se guardan en IndexedDB: el formulario abre al
// instante con la última copia (también después de un F5 o entrando desde el menú) y
// cada apertura la refresca de fondo, así un alta reciente aparece a los segundos.
// IndexedDB y no localStorage: los médicos solos son ~900 KB de JSON.

export interface CatalogosCarga {
  medicos: MedicoOption[];
  obrasSociales: ObraSocialOption[];
  clinicas: ClinicaOption[];
}

interface Estado {
  catalogos: CatalogosCarga | null;
  /** Falló el pedido y no hay ninguna copia para mostrar. */
  error: boolean;
}

const BASE_IDB = "cmc-cache";
const ALMACEN = "kv";
// Cambiar la versión si cambia la forma de los datos: la copia vieja se ignora.
const CLAVE = "facturacion:catalogos-carga:v1";

let estado: Estado = { catalogos: null, error: false };
const oyentes = new Set<() => void>();
let enCurso: Promise<void> | null = null;
let leidoDeDisco = false;
let esperando: Array<(c: CatalogosCarga) => void> = [];
let actualizadoEn = 0;
// Dentro de este margen no se vuelve a pedir: el listado precarga y enseguida se abre
// el formulario, o se editan varias prestaciones seguidas.
const FRESCO_MS = 60 * 1000;

const emitir = (nuevo: Estado) => {
  estado = nuevo;
  if (nuevo.catalogos) {
    const c = nuevo.catalogos;
    esperando.forEach((r) => r(c));
    esperando = [];
  }
  oyentes.forEach((o) => o());
};

// ── IndexedDB mínimo (una base, un almacén clave → valor) ─────────────────────
const abrir = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(BASE_IDB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(ALMACEN);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const leerDisco = async (): Promise<CatalogosCarga | null> => {
  try {
    const db = await abrir();
    return await new Promise((resolve) => {
      const req = db.transaction(ALMACEN, "readonly").objectStore(ALMACEN).get(CLAVE);
      req.onsuccess = () => resolve((req.result as CatalogosCarga | undefined) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

const escribirDisco = async (valor: CatalogosCarga | null) => {
  try {
    const db = await abrir();
    const almacen = db.transaction(ALMACEN, "readwrite").objectStore(ALMACEN);
    if (valor) almacen.put(valor, CLAVE);
    else almacen.delete(CLAVE);
  } catch {
    /* sin IndexedDB (modo privado, bloqueado): queda solo en memoria */
  }
};

// ── API ───────────────────────────────────────────────────────────────────────

/** Pide los catálogos al backend (un solo pedido en vuelo a la vez) y los guarda. */
export function refrescarCatalogos(): Promise<void> {
  if (enCurso) return enCurso;
  enCurso = (async () => {
    try {
      const [medicos, obrasSociales, clinicas] = await Promise.all([
        fetchMedicosTodos(),
        fetchObrasSocialesTodas(),
        fetchClinicasTodas(),
      ]);
      // `listado_medico` tiene NRO_SOCIO duplicado en algunas filas (mismo médico
      // cargado dos veces — dato legacy, no un caso de negocio real). Sin dedupar,
      // el Autocomplete renderiza dos <li> con la misma key y React mezcla su
      // contenido entre renders al filtrar — eso se veía como "el filtro falla".
      const catalogos: CatalogosCarga = {
        medicos: dedupePorId(medicos, (m) => m.cod),
        obrasSociales: dedupePorId(obrasSociales, (o) => o.nro_obra_social),
        clinicas: dedupePorId(clinicas, (c) => c.cod),
      };
      actualizadoEn = Date.now();
      emitir({ catalogos, error: false });
      void escribirDisco(catalogos);
    } catch {
      // Con una copia en pantalla el error no se muestra: se sigue con la copia.
      if (!estado.catalogos) emitir({ ...estado, error: true });
    } finally {
      enCurso = null;
    }
  })();
  return enCurso;
}

/**
 * Al abrir el formulario: muestra la copia guardada si todavía no hay nada en memoria y
 * pide la versión actual de fondo.
 */
export function cargarCatalogos(): void {
  if (!leidoDeDisco) {
    leidoDeDisco = true;
    void leerDisco().then((guardados) => {
      // Si la red ganó la carrera, la copia del disco ya está vieja.
      if (guardados && !estado.catalogos) emitir({ catalogos: guardados, error: false });
    });
  }
  if (estado.error) emitir({ ...estado, error: false });
  if (estado.catalogos && Date.now() - actualizadoEn < FRESCO_MS) return;
  void refrescarCatalogos();
}

/** Resuelve en cuanto hay catálogos (de disco o de red). */
export function esperarCatalogos(): Promise<CatalogosCarga> {
  if (estado.catalogos) return Promise.resolve(estado.catalogos);
  return new Promise((resolve) => esperando.push(resolve));
}

/** Cambios locales (alta/baja de clínica desde el formulario). */
export function actualizarClinicas(fn: (prev: ClinicaOption[]) => ClinicaOption[]): void {
  if (!estado.catalogos) return;
  const catalogos = { ...estado.catalogos, clinicas: fn(estado.catalogos.clinicas) };
  emitir({ ...estado, catalogos });
  void escribirDisco(catalogos);
}

/** Al cerrar sesión: que la copia no quede en el navegador. */
export function olvidarCatalogos(): void {
  emitir({ catalogos: null, error: false });
  leidoDeDisco = false;
  actualizadoEn = 0;
  void escribirDisco(null);
}

const suscribir = (o: () => void) => {
  oyentes.add(o);
  return () => { oyentes.delete(o); };
};
const instantanea = () => estado;

export function useCatalogosCarga(): Estado {
  return useSyncExternalStore(suscribir, instantanea, instantanea);
}

/** Para precargar el formulario antes de abrirlo (sin suscribirse). */
export const catalogosEnMemoria = () => estado.catalogos;

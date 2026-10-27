import { fetchPrestacion, fetchMedicos, fetchCodigosHabilitados } from "../api";
import type { TipoCalculo, PrestacionRead, MedicoOption } from "../types";
import { parseMoney } from "../money";
import { crearAyudanteLinea } from "./sections/ayudante.helpers";
import type { AyudanteLinea } from "./sections/AyudanteSection";
import { crearPediatraLinea } from "./sections/pediatra.helpers";
import type { PediatraLinea } from "./sections/PediatraSection";

// Al editar/replicar puede clickearse cualquier fila del equipo, incluida un ayudante.
export const fetchPrestacionCabecera = async (id: string | number): Promise<PrestacionRead> => {
  const p = await fetchPrestacion(id);
  if (p.grupo_equipo_id != null && p.grupo_equipo_id !== p.id) {
    return fetchPrestacion(p.grupo_equipo_id);
  }
  return p;
};

/** Los campos del formulario (Nro socio, Médico ejecutor, Clínica) para una fila guardada — el mismo criterio que `seleccion_prestador_de` en el backend. */
export const seleccionPrestadorDe = (p: PrestacionRead) => {
  if (p.cod_medico_ejecutor) {
    // Fila legacy: `cod_medico` era la clínica y el ejecutor iba aparte.
    return { payee: p.cod_medico, ejecutor: p.cod_medico_ejecutor, clinica: null };
  }
  if (p.tipo === "Sanatorio" && p.cod_clinica != null) {
    return { payee: String(p.cod_clinica), ejecutor: p.cod_medico, clinica: null };
  }
  // Médico solo, o médico con la clínica como ámbito (Honorarios individuales).
  return { payee: p.cod_medico, ejecutor: null, clinica: p.cod_clinica ?? null };
};

// El médico de una línea del equipo: de la lista precargada si está, si no del backend.
const resolverMedico = async (
  cod: string, medicos?: MedicoOption[],
): Promise<MedicoOption | null> => {
  const precargado = medicos?.find((m) => m.cod === cod);
  if (precargado) return precargado;
  try {
    const rows = await fetchMedicos(cod);
    return rows.find((m) => m.cod === cod) ?? null;
  } catch {
    return null; // best-effort: sin nombre, la línea igual funciona con el código.
  }
};

// Reconstruye las líneas de ayudante desde el `grupo` de una prestación (al replicar o
// editar un equipo). Resuelve el nombre de cada médico (best-effort) para el autocomplete.
export const buildAyudantesFromGrupo = async (
  grupo: PrestacionRead[],
  medicos?: MedicoOption[],
): Promise<AyudanteLinea[]> => {
  const miembros = grupo.filter((g) => parseMoney(g.ayudante) > 0);
  return Promise.all(
    miembros.map(async (g) => {
      const medico = await resolverMedico(g.cod_medico, medicos);
      const precioAyudante = g.ayudante != null ? String(g.ayudante) : "0";
      return {
        ...crearAyudanteLinea(precioAyudante, g.autorizacion ?? ""),
        prestacionId: g.id,
        codMedico: g.cod_medico,
        medico,
        porcentaje: String(g.porcentaje ?? 100),
        tipoCalculo: (g.tipo_calculo as TipoCalculo) ?? "A",
        precioManual: precioAyudante,
      };
    }),
  );
};

// Reconstruye la línea de pediatra (máx. 1) desde el `grupo` de una prestación — función HERMANA de `buildAyudantesFromGrupo`, no la toca ni comparte su filtro.
// por `tipo_prestador === "Pediatra"` (lo pone el backend vía tpo_funcion='P'), NUNCA
// por montos: la fila del pediatra también tiene `ayudante=0` como cualquier cirujano, así que el filtro de ayudantes.
export const buildPediatraFromGrupo = async (
  grupo: PrestacionRead[],
  medicos?: MedicoOption[],
): Promise<PediatraLinea | null> => {
  const g = grupo.find((m) => m.tipo_prestador === "Pediatra");
  if (!g) return null;
  const [medico, codigoPreset] = await Promise.all([
    resolverMedico(g.cod_medico, medicos),
    (async () => {
      if (!g.cod_nomenclador) return null;
      try {
        const codigos = await fetchCodigosHabilitados(g.cod_medico, g.cod_nomenclador);
        return codigos.find((c) => c.codigo === g.cod_nomenclador)?.descripcion ?? null;
      } catch {
        return null; // best-effort: sin descripción, el código igual queda cargado.
      }
    })(),
  ]);
  return {
    ...crearPediatraLinea(g.autorizacion ?? ""),
    prestacionId: g.id,
    codMedico: g.cod_medico,
    medico,
    codNomenclador: g.cod_nomenclador ?? null,
    codigoPreset,
    porcentaje: String(g.porcentaje ?? 100),
    tipoCalculo: (g.tipo_calculo as TipoCalculo) ?? "A",
    precioManual: g.honorarios != null ? String(g.honorarios) : "0",
  };
};

// Auto-detecta si el equipo ya tiene autorizaciones distintas por integrante (carga vieja o hecha desde otra pantalla) para no pisarlas silenciosamente al guardar .
export const tieneAutorizacionDistintaPorIntegrante = (
  cabeza: PrestacionRead, lineas: AyudanteLinea[],
): boolean =>
  lineas.some((l) => (l.autorizacion || null) !== (cabeza.autorizacion || null));

export const toInt = (v: string, fallback: number): number => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
};

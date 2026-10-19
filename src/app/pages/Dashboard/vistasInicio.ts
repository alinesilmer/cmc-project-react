import type { LucideIcon } from "lucide-react";
import { FileCode2, Receipt, Users } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getJSON } from "@/app/shared/lib/http";
import { listarFacturas } from "@/app/pages/facturacion/api";
import { formatMoney } from "@/app/pages/facturacion/money";
import { getTablaValores } from "@/app/pages/NomencladorNacional/nomenclador.api";
import { useObrasSociales } from "@/app/pages/ObrasSociales/useObrasSociales";

/** Cuántas filas muestra cada vista del Inicio. */
const FILAS = 10;

const CINCO_MINUTOS = 5 * 60 * 1000;

type Columna = { titulo: string; angosta?: boolean; derecha?: boolean };

type EstadoFilas = {
  filas: string[][];
  cargando: boolean;
  error: boolean;
  /** Reemplaza a la tabla: lo que falta para poder mostrarla. */
  aviso?: string;
};

/** Una tabla en miniatura del Inicio: las primeras filas de un listado. */
export type Vista = {
  id: string;
  titulo: string;
  icono: LucideIcon;
  /** Mismo permiso que exige la pantalla completa. */
  permiso: string;
  ruta: string;
  columnas: Columna[];
  /** Texto de ayuda del buscador. */
  buscar: string;
  /** Suma el selector de obra social al lado del buscador. */
  eligeObraSocial?: boolean;
  /** Hook: sólo lo llama `TablaVista`, que se monta una vez por vista. */
  useFilas: (busqueda: string, obraSocial: number | null) => EstadoFilas;
};

const texto = (v: unknown): string =>
  v === null || v === undefined || String(v).trim() === "" ? "—" : String(v).trim();

const sinAcentos = (v: string): string =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

// El listado de socios devuelve las columnas de la tabla tal cual, y según el origen llegan en minúscula o en mayúscula.
const campo = (fila: Record<string, unknown>, nombre: string): string =>
  texto(fila[nombre] ?? fila[nombre.toUpperCase()]);

function useFilasSocios(busqueda: string): EstadoFilas {
  // El listado busca a partir de dos letras, igual que la pantalla completa.
  const q = busqueda.length >= 2 ? busqueda : "";
  const consulta = useQuery({
    queryKey: ["inicio", "socios", q],
    queryFn: () =>
      getJSON<Record<string, unknown>[]>("/api/medicos/all", { skip: 0, limit: FILAS, ...(q ? { q } : {}) }),
    staleTime: CINCO_MINUTOS,
    placeholderData: keepPreviousData,
  });
  const datos = Array.isArray(consulta.data) ? consulta.data : [];

  return {
    filas: datos.map((m) => [campo(m, "nro_socio"), campo(m, "nombre"), campo(m, "matricula_prov")]),
    cargando: consulta.isPending,
    error: consulta.isError,
  };
}

// Los valores vigentes de una obra social: sin elegirla no hay precio que mostrar.
function useFilasCodigos(busqueda: string, obraSocial: number | null): EstadoFilas {
  const consulta = useQuery({
    queryKey: ["inicio", "valores", obraSocial, busqueda],
    queryFn: () =>
      getTablaValores({
        obra_social_nro: obraSocial ?? 0,
        size: FILAS,
        ...(busqueda ? { codigo: busqueda } : {}),
      }),
    enabled: obraSocial !== null,
    staleTime: CINCO_MINUTOS,
    placeholderData: keepPreviousData,
  });

  if (obraSocial === null) {
    return { filas: [], cargando: false, error: false, aviso: "Elegí una obra social para ver sus valores." };
  }

  return {
    filas: (consulta.data ?? []).map((v) => [
      v.codigo,
      texto(v.descripcion),
      v.por_presupuesto ? "Presupuesto" : formatMoney(v.precio_total),
    ]),
    cargando: consulta.isPending,
    error: consulta.isError,
  };
}

/** Tope de facturas abiertas que se traen: el filtro por nombre se hace acá. */
const ABIERTAS = 100;

// Las obras sociales con el período abierto —las que se están cargando— y lo que llevan facturado hasta ahora.
function useFilasFacturacion(busqueda: string): EstadoFilas {
  const consulta = useQuery({
    queryKey: ["inicio", "facturas-abiertas"],
    queryFn: () => listarFacturas({ estado: "A", limit: ABIERTAS }),
    // Es plata que cambia con cada carga: se vuelve a pedir al entrar.
    staleTime: 0,
  });
  // Sólo para mostrar el nombre: si el catálogo no llega, queda el número.
  const obras = useObrasSociales();
  const nombres = new Map((obras.data ?? []).map((o) => [String(o.nro_obra_social), o.nombre]));

  const buscado = sinAcentos(busqueda);
  const abiertas = (consulta.data?.data ?? []).map((f) => ({
    obra: nombres.get(String(f.cod_obr)) ?? `O.S. ${f.cod_obr}`,
    codigo: String(f.cod_obr),
    periodo: f.periodo_label || f.periodo,
    total: formatMoney(f.importe),
  }));
  const halladas = buscado
    ? abiertas.filter((f) => sinAcentos(f.obra).includes(buscado) || f.codigo.includes(buscado))
    : abiertas;

  return {
    filas: halladas.slice(0, FILAS).map((f) => [f.obra, f.periodo, f.total]),
    cargando: consulta.isPending,
    error: consulta.isError,
  };
}

const base = "/panel";

const VISTAS: Vista[] = [
  {
    id: "socios",
    titulo: "Socios",
    icono: Users,
    permiso: "medico:leer",
    ruta: `${base}/users`,
    columnas: [{ titulo: "N.º", angosta: true }, { titulo: "Nombre" }, { titulo: "Matrícula", angosta: true }],
    buscar: "Nombre, matrícula o n.º",
    useFilas: useFilasSocios,
  },
  {
    id: "codigos",
    titulo: "Códigos",
    icono: FileCode2,
    permiso: "nomenclador:leer",
    ruta: `${base}/nomenclador/consulta-valores`,
    columnas: [
      { titulo: "Código", angosta: true },
      { titulo: "Descripción" },
      { titulo: "Valor", angosta: true, derecha: true },
    ],
    buscar: "Código",
    eligeObraSocial: true,
    useFilas: useFilasCodigos,
  },
  {
    id: "facturacion",
    titulo: "Facturación",
    icono: Receipt,
    permiso: "facturacion:leer",
    ruta: `${base}/facturacion/periodos`,
    columnas: [
      { titulo: "Obra social" },
      { titulo: "Período", angosta: true },
      { titulo: "Hasta ahora", angosta: true, derecha: true },
    ],
    buscar: "Obra social",
    useFilas: useFilasFacturacion,
  },
];

export function vistasVisibles(puede: (permiso: string) => boolean): Vista[] {
  return VISTAS.filter((v) => puede(v.permiso));
}

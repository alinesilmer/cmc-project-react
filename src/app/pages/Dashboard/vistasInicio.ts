import type { LucideIcon } from "lucide-react";
import { CalendarDays, FileCode2, Users } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getJSON } from "@/app/shared/lib/http";
import { hoyISO } from "@/app/shared/lib/fechas";
import { getMes } from "@/app/pages/Agenda/agenda.api";
import { LABEL_TIPO, MESES, type OcurrenciaAgenda } from "@/app/pages/Agenda/agenda.types";
import { fijosDelMes } from "@/app/pages/Agenda/diasFijos";
import { formatMoney } from "@/app/pages/facturacion/money";
import { getTablaValores } from "@/app/pages/NomencladorNacional/nomenclador.api";
import type { TablaValorItem } from "@/app/pages/NomencladorNacional/nomenclador.types";

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
  /** Suma un filtro por tipo; el primero es «todos». */
  tipos?: { valor: string; rotulo: string }[];
  /** Hook: sólo lo llama `TablaVista`, que se monta una vez por vista. */
  useFilas: (busqueda: string, obraSocial: number | null, tipo: string) => EstadoFilas;
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

/** Los tipos de código del Inicio: de dónde sale el valor y cómo se calcula. */
const TIPOS_CODIGO_INICIO = [
  { valor: "todos", rotulo: "Todos los tipos" },
  { valor: "NN", rotulo: "NN" },
  { valor: "NE", rotulo: "NE" },
  { valor: "fijo", rotulo: "Fijo" },
  { valor: "presupuesto", rotulo: "A presupuesto" },
];

/** Con un tipo elegido se piden más filas: el filtro se hace acá y las primeras diez no alcanzarían. */
const FILAS_CON_FILTRO = 200;

function coincideTipo(v: TablaValorItem, tipo: string): boolean {
  if (tipo === "NN" || tipo === "NE") return v.origen === tipo;
  if (tipo === "fijo") return v.componentes.some((c) => c.tipo === "fijo");
  if (tipo === "presupuesto") return v.por_presupuesto;
  return true;
}

// Los valores vigentes de una obra social: sin elegirla no hay precio que mostrar.
function useFilasCodigos(busqueda: string, obraSocial: number | null, tipo: string): EstadoFilas {
  const size = tipo === "todos" ? FILAS : FILAS_CON_FILTRO;
  const consulta = useQuery({
    queryKey: ["inicio", "valores", obraSocial, busqueda, size],
    queryFn: () =>
      getTablaValores({
        obra_social_nro: obraSocial ?? 0,
        size,
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
    filas: (consulta.data ?? [])
      .filter((v) => coincideTipo(v, tipo))
      .slice(0, FILAS)
      .map((v) => [
        v.codigo,
        texto(v.descripcion),
        v.por_presupuesto ? "Presupuesto" : formatMoney(v.precio_total),
      ]),
    cargando: consulta.isPending,
    error: consulta.isError,
  };
}

/** Lo del calendario de un mes: comparte la caché con la pantalla del Calendario. */
function useMesAgenda(anio: number, mes: number) {
  return useQuery({
    queryKey: ["agenda", "mes", anio, mes],
    queryFn: () => getMes(anio, mes),
    staleTime: CINCO_MINUTOS,
  });
}

// Lo que viene en el calendario: desde hoy, de este mes y del siguiente, ordenado por fecha.
function useFilasCalendario(busqueda: string): EstadoFilas {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;
  const sigAnio = mes === 12 ? anio + 1 : anio;
  const sigMes = mes === 12 ? 1 : mes + 1;

  const actual = useMesAgenda(anio, mes);
  const siguiente = useMesAgenda(sigAnio, sigMes);

  const cargados = [...(actual.data ?? []), ...(siguiente.data ?? [])];
  const todos: OcurrenciaAgenda[] = [
    ...(actual.data ?? []),
    ...fijosDelMes(anio, mes, actual.data ?? [], null),
    ...(siguiente.data ?? []),
    ...fijosDelMes(sigAnio, sigMes, siguiente.data ?? [], null),
  ];
  const desde = hoyISO();
  const buscado = sinAcentos(busqueda);

  const filas = todos
    .filter((o) => o.ocurre_el >= desde && (!buscado || sinAcentos(o.titulo).includes(buscado)))
    .sort((a, b) => a.ocurre_el.localeCompare(b.ocurre_el) || a.titulo.localeCompare(b.titulo, "es"))
    .slice(0, FILAS)
    .map((o) => {
      const [, m, d] = o.ocurre_el.split("-");
      const tipo = LABEL_TIPO[o.tipo];
      return [`${Number(d)} ${MESES[Number(m) - 1].slice(0, 3).toLowerCase()}`, o.titulo, tipo.charAt(0).toUpperCase() + tipo.slice(1)];
    });

  return {
    filas,
    cargando: cargados.length === 0 && (actual.isPending || siguiente.isPending),
    error: actual.isError && siguiente.isError,
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
    tipos: TIPOS_CODIGO_INICIO,
    useFilas: useFilasCodigos,
  },
  {
    id: "calendario",
    titulo: "Calendario",
    icono: CalendarDays,
    permiso: "catalogo:leer",
    ruta: `${base}/agenda`,
    columnas: [{ titulo: "Fecha", angosta: true }, { titulo: "Evento" }, { titulo: "Tipo", angosta: true }],
    buscar: "Evento",
    useFilas: useFilasCalendario,
  },
];

export function vistasVisibles(puede: (permiso: string) => boolean): Vista[] {
  return VISTAS.filter((v) => puede(v.permiso));
}

// Web Worker para LiquidationCycle
// Mantiene estructuras pesadas en memoria y responde con slices paginados

export type ServerEstado = "a" | "c" | "e" | string | null | undefined;

type InsuranceItem = { id: string; name: string };

interface LiquidacionItem {
  id?: number | string;
  obra_social_id?: string | number;
  obraSocialId?: string | number;
  obra_social_codigo?: string | number;
  obra_social_code?: string | number;
  os_id?: string | number;
  total_bruto?: number | string | null;
  total_debitos?: number | string | null;
  total_deduccion?: number | string | null;
  total_neto?: number | string | null;
  anio_periodo?: number;
  mes_periodo?: number;
  nro_liquidacion?: string | null;
  estado?: string | null;
}

interface RawOS {
  NRO_OBRASOCIAL: number | string;
  OBRA_SOCIAL: string;
}

type CardPeriodRow = {
  periodo: string;
  bruto: number;
  descuentos: number;
  neto: number;
  liquidacionId?: number | string;
  nroLiquidacion?: string;
  estado?: "A" | "C";
};

type PreviewRow = {
  osId: string;
  osName: string;
  periodo: string;
  estado: "A" | "C";
  bruto: number;
  debitos: number;
  deduccion: number;
  neto: number;
  nro: string;
};

type Totals = {
  cerradasNeto: number;
  abiertasNeto: number;
  resumenDeduccion: number;
  totalGeneral: number;
};

type BuildMsg = {
  type: "BUILD";
  osList: RawOS[];
  liquidaciones: LiquidacionItem[];
  periodTitle: string;
  resumenDeduccion: number; // desde LiquidacionResumen
};

type FilterMsg = {
  type: "FILTER";
  query: string;
  hidden: string[];
  page: number;
  pageSize: number;
};

type BuiltResp = {
  type: "BUILT";
  allInsurances: InsuranceItem[]; // orden alfabético (sin filtro)
  previewRows: PreviewRow[];
  totals: Totals;
};

type FilterResp = {
  type: "FILTERED";
  pageItems: InsuranceItem[];
  totalItems: number;
  totalPages: number;
  rowsForPage: Record<string, CardPeriodRow[]>;
};

const currencyNum = (x: unknown): number => {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Number.parseFloat(x);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

// ======== Estado interno del worker ========
let _allInsurances: InsuranceItem[] = [];
let _rowsByOS: Record<string, CardPeriodRow[]> = {};
let _hasLiq = new Set<string>();
let _osNameById: Record<string, string> = {};
let _previewRows: PreviewRow[] = [];
let _totals: Totals = {
  cerradasNeto: 0,
  abiertasNeto: 0,
  resumenDeduccion: 0,
  totalGeneral: 0,
};

function buildStructures(osList: RawOS[], liquidaciones: LiquidacionItem[], periodTitle: string, resumenDeduccion: number) {
  // Map nombres OS
  _osNameById = {};
  for (const os of osList ?? []) {
    _osNameById[String(os.NRO_OBRASOCIAL)] = (os.OBRA_SOCIAL ?? "").toString().trim();
  }

  // Lista de OS (siempre todas)
  _allInsurances = (osList ?? [])
    .map((os) => {
      const id = String(os.NRO_OBRASOCIAL);
      const name = `${id} ` + (os.OBRA_SOCIAL ?? "").toString().trim();
      return { id, name };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  // rowsByOS + hasLiq
  _rowsByOS = {};
  _hasLiq = new Set();
  for (const liq of Array.isArray(liquidaciones) ? liquidaciones : []) {
    const osIdAny =
      liq.obra_social_id ??
      liq.obraSocialId ??
      liq.obra_social_codigo ??
      liq.obra_social_code ??
      liq.os_id;
    if (osIdAny == null) continue;

    const osId = String(osIdAny);
    _hasLiq.add(osId);

    const periodo =
      liq.anio_periodo && liq.mes_periodo
        ? `${liq.anio_periodo}-${String(liq.mes_periodo).padStart(2, "0")}`
        : periodTitle;

    const bruto = currencyNum(liq.total_bruto);
    const debitos = currencyNum(liq.total_debitos);
    const deduccion = currencyNum(liq.total_deduccion);
    const descuentos = debitos + deduccion;
    const neto =
      liq.total_neto != null ? currencyNum(liq.total_neto) : bruto - descuentos;

    if (!_rowsByOS[osId]) _rowsByOS[osId] = [];
    _rowsByOS[osId].push({
      periodo,
      bruto,
      descuentos,
      neto,
      liquidacionId: (liq as any)?.id,
      nroLiquidacion: (liq as any)?.nro_liquidacion,
      estado: String((liq as any)?.estado ?? "A").toUpperCase() === "C" ? "C" : "A",
    });
  }
  for (const k of Object.keys(_rowsByOS)) {
    _rowsByOS[k].sort((a, b) => a.periodo.localeCompare(b.periodo));
  }

  // Preview rows
  _previewRows = [];
  for (const [osId, rows] of Object.entries(_rowsByOS)) {
    const osName = _osNameById[osId] ?? `OS ${osId}`;
    for (const r of rows) {
      _previewRows.push({
        osId,
        osName,
        periodo: r.periodo,
        estado: r.estado === "C" ? "C" : "A",
        bruto: r.bruto,
        debitos: r.descuentos - currencyNum((null as any)), // ya viene como debitos+deduccion; mantenemos columnas del front
        deduccion: 0, // no la discriminamos aquí; el front no la usa por separado
        neto: r.neto,
        nro: r.nroLiquidacion ?? "",
      });
    }
  }
  _previewRows.sort((a, b) => (a.estado === b.estado ? 0 : a.estado === "C" ? -1 : 1));

  // Totales (usamos la misma lógica del front)
  const c = _previewRows.filter((r) => r.estado === "C");
  const a = _previewRows.filter((r) => r.estado === "A");
  const sum = (arr: PreviewRow[], key: keyof PreviewRow) =>
    arr.reduce((s, x) => s + (Number(x[key]) || 0), 0);

  const cerradasNeto = sum(c, "neto");
  const abiertasNeto = sum(a, "neto");
  const totalGeneral = cerradasNeto + abiertasNeto - (Number(resumenDeduccion) || 0);

  _totals = {
    cerradasNeto,
    abiertasNeto,
    resumenDeduccion: Number(resumenDeduccion) || 0,
    totalGeneral,
  };
}

function filterAndPage(query: string, hidden: string[], page: number, pageSize: number): FilterResp {
  const q = (query || "").trim().toLowerCase();
  const hiddenSet = new Set(hidden ?? []);

  // Filtro
  let filtered = _allInsurances.filter((i) => !hiddenSet.has(i.id));
  if (q) {
    filtered = filtered.filter((i) =>
      (i.name || `Obra Social ${i.id}`).toLowerCase().includes(q)
    );
  }

  // Orden: primero con liqs, luego alfabético
  filtered.sort((a, b) => {
    const aHas = _hasLiq.has(a.id) ? 1 : 0;
    const bHas = _hasLiq.has(b.id) ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    return a.name.localeCompare(b.name, "es");
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = filtered.slice(start, end);

  // Slicing de rowsByOS para esta página
  const rowsForPage: Record<string, CardPeriodRow[]> = {};
  for (const it of pageItems) {
    rowsForPage[it.id] = _rowsByOS[it.id] ?? [];
  }

  return {
    type: "FILTERED",
    pageItems,
    totalItems,
    totalPages,
    rowsForPage,
  };
}

// ======== Mensajería ========
self.onmessage = (ev: MessageEvent<BuildMsg | FilterMsg>) => {
  const msg = ev.data;
  if (msg.type === "BUILD") {
    buildStructures(msg.osList, msg.liquidaciones, msg.periodTitle, msg.resumenDeduccion);
    const resp: BuiltResp = {
      type: "BUILT",
      allInsurances: _allInsurances,
      previewRows: _previewRows,
      totals: _totals,
    };
    (self as any).postMessage(resp);
    return;
  }

  if (msg.type === "FILTER") {
    const resp = filterAndPage(msg.query, msg.hidden, msg.page, msg.pageSize);
    (self as any).postMessage(resp);
    return;
  }
};

// app/pages/LiquidationCycle/LiquidationCycle.tsx
"use client";

import type React from "react";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import SearchBar from "../../../components/molecules/SearchBar/SearchBar";
import Button from "../../../components/atoms/Button/Button";
import InsuranceCard from "../../../components/molecules/InsuranceCard/InsuranceCard";
import Alert from "../../../components/atoms/Alert/Alert";
import styles from "./LiquidationCycle.module.scss";

/* ================== Config ================== */
const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";

const RESUMEN_BY_ID = (id: string | number) =>
  `${API_BASE}/api/liquidacion/resumen/${id}`;
const OBRAS_SOCIALES_URL = `${API_BASE}/api/obras_social/`;

// Débitos de colegio
const DESCUENTOS_URL = `${API_BASE}/api/descuentos`;
const ESPECIALIDADES_URL = `${API_BASE}/api/especialidades`;
const GEN_DESC_URL = (resumenId: string | number, descId: string | number) =>
  `${API_BASE}/api/deducciones/${resumenId}/colegio/bulk_generar_descuento/${descId}`;
const GEN_ESP_URL = (resumenId: string | number, espId: string | number) =>
  `${API_BASE}/api/deducciones/${resumenId}/colegio/bulk_generar_especialidad/${espId}`;
const APLICAR_URL = (resumenId: string | number) =>
  `${API_BASE}/api/deducciones/${resumenId}/colegio/aplicar`;

// Paginación front
const PAGE_SIZE = 18;

/* ================== Tipos ================== */
type InsuranceItem = { id: string; name: string };
type ServerEstado = "a" | "c" | "e" | string | null | undefined;

interface LiquidacionItem {
  id?: number | string;
  obra_social_id?: string | number;
  obraSocialId?: string | number;
  obra_social_codigo?: string | number;
  obra_social_code?: string | number;
  obra_social?: string;
  obraSocial?: string;
  obra_social_nombre?: string;
  obraSocialNombre?: string;
  os_id?: string | number;
  os?: string;
  total_bruto?: number | string | null;
  total_debitos?: number | string | null;
  total_deduccion?: number | string | null;
  total_neto?: number | string | null;
  anio_periodo?: number;
  mes_periodo?: number;
  nro_liquidacion?: string | null;
  estado?: string | null;
}

interface ResumenDetail {
  id: number;
  anio: number;
  mes: number;
  estado: ServerEstado;
  total_bruto: number | string | null | undefined;
  total_debitos: number | string | null | undefined;
  total_deduccion: number | string | null | undefined;
  liquidaciones?: unknown;
}

/** Shape real de obras sociales */
interface RawOS {
  NRO_OBRASOCIAL: number | string;
  OBRA_SOCIAL: string;
  MARCA?: string;
  VER_VALOR?: string;
  ID: number | string;
}

/* ====== Tipos para Débitos de Colegio ====== */
type DiscountRow = {
  id: string;          // descuentos.id
  nro_colegio: string;     // descuentos.nombre
  concept: string;     // descuentos.nombre
  price: number;       // descuentos.precio
  percentage: number;  // descuentos.porcentaje
};

type SpecialtyRow = {
  id: string;          // especialidad.ID
  name: string;        // especialidad.ESPECIALIDAD
};

/* ========== Utils ========== */
const currency = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 });

function toNumber(x: unknown): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Number.parseFloat(x);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

// function estadoToLabel(
//   e: ServerEstado
// ): "EN CURSO" | "FINALIZADO" | "DESCONOCIDO" {
//   if (e === "a") return "EN CURSO";
//   if (e === "c" || e === "e") return "FINALIZADO";
//   return "DESCONOCIDO";
// }

function getLiquidacionesArray(x: unknown): LiquidacionItem[] {
  if (!Array.isArray(x)) return [];
  return x.filter((i) => i && typeof i === "object") as LiquidacionItem[];
}

function mapDiscount(raw: any): DiscountRow {
  return {
    id: String(raw?.id ?? ""),
    nro_colegio: String(raw?.nro_colegio ?? ""),
    concept: String(raw?.nombre ?? raw?.concept ?? "—"),
    price: Number(raw?.precio ?? raw?.price ?? 0) || 0,
    percentage: Number(raw?.porcentaje ?? raw?.percentage ?? 0) || 0,
  };
}

function mapSpecialty(raw: any): SpecialtyRow {
  return {
    id: String(raw?.id ?? raw?.ID ?? ""),
    name: String(raw?.nombre ?? raw?.ESPECIALIDAD ?? raw?.name ?? "—"),
  };
}

/* ================== Componente ================== */
const LiquidationCycle: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Vista activa estilo “carrusel”
  const [activeView, setActiveView] = useState<"obras" | "debitos">("obras");

  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [openAddPeriod, setOpenAddPeriod] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<Date | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DiscountRow | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [editPct, setEditPct] = useState<string>("");
  const [editErr, setEditErr] = useState<string | null>(null);

  // Previsualización (sigue como modal)
  const [openPreview, setOpenPreview] = useState(false);

  // Paginación
  const [page, setPage] = useState<number>(1);

  // Estado resumen
  const [data, setData] = useState<ResumenDetail | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Obras sociales
  const [osList, setOsList] = useState<RawOS[]>([]);
  const [osError, setOsError] = useState<string | null>(null);

  // ====== Débitos de Colegio (en la “ventana” deslizante) ======
  const [searchDiscount, setSearchDiscount] = useState("");
  const [searchSpec, setSearchSpec] = useState("");

  const [discounts, setDiscounts] = useState<DiscountRow[]>([]);
  const [specs, setSpecs] = useState<SpecialtyRow[]>([]);

  const [loadingDeb, setLoadingDeb] = useState(false);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [debError, setDebError] = useState<string | null>(null);
  const [specError, setSpecError] = useState<string | null>(null);

  // confirm + generar
  const [confirmGen, setConfirmGen] = useState<null | { kind: "desc" | "esp"; id: string; name: string }>(null);
  const [genStatus, setGenStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [genError, setGenError] = useState<string | null>(null);

  // Fetch resumen
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    (async () => {
      if (!id) return;
      setIsLoading(true);
      setIsError(false);
      setError(null);
      try {
        const res = await fetch(RESUMEN_BY_ID(id), { signal: controller.signal });
        if (!res.ok) throw new Error(`Error ${res.status} al obtener el resumen`);
        const json: ResumenDetail = await res.json();
        if (!ignore) setData(json);
      } catch (e: any) {
        if (!ignore && e?.name !== "AbortError") {
          setIsError(true);
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [id]);

  // Fetch OS
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(OBRAS_SOCIALES_URL, { signal: controller.signal });
        if (!res.ok) throw new Error(`Error ${res.status} al obtener obras sociales`);
        const list: RawOS[] = await res.json();
        if (!ignore) {
          setOsList(list ?? []);
          setOsError(null);
        }
      } catch (e: any) {
        if (!ignore && e?.name !== "AbortError") setOsError(String(e?.message || e));
      }
    })();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  // Cuando entro a la vista “debitos”, cargo descuentos + especialidades
  useEffect(() => {
    if (activeView !== "debitos") return;

    let ignore = false;
    const controller = new AbortController();

    // Descuentos
    (async () => {
      setLoadingDeb(true);
      setDebError(null);
      try {
        const r = await fetch(DESCUENTOS_URL, { signal: controller.signal });
        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          throw new Error(`Descuentos HTTP ${r.status} ${txt ? `- ${txt}` : ""}`);
        }
        const list = (await r.json()) as any[];
        if (!ignore) setDiscounts((list ?? []).map(mapDiscount));
      } catch (e: any) {
        if (!ignore) setDebError(e?.message || "No se pudo cargar descuentos.");
      } finally {
        if (!ignore) setLoadingDeb(false);
      }
    })();

    // Especialidades
    (async () => {
      setLoadingSpecs(true);
      setSpecError(null);
      try {
        const r = await fetch(ESPECIALIDADES_URL, { signal: controller.signal });
        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          throw new Error(`Especialidades HTTP ${r.status} ${txt ? `- ${txt}` : ""}`);
        }
        const list = (await r.json()) as any[];
        if (!ignore) setSpecs((list ?? []).map(mapSpecialty));
      } catch (e: any) {
        if (!ignore) setSpecError(e?.message || "No se pudo cargar especialidades.");
      } finally {
        if (!ignore) setLoadingSpecs(false);
      }
    })();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [activeView]);

  // reset página al cambiar búsqueda
  useEffect(() => {
    setPage(1);
  }, [query]);

  /* ======= Encabezado ======= */
  const { periodTitle } = useMemo(() => {
    const mm = String(data?.mes ?? 1).padStart(2, "0");
    const period = `${data?.anio ?? "----"}-${mm}`;
    return { periodTitle: period };
  }, [data]);

  const reloadResumen = useCallback(async () => {
    if (!id) return;
    const res = await fetch(RESUMEN_BY_ID(id));
    if (res.ok) setData(await res.json());
  }, [id]);

  const totalBruto = toNumber(data?.total_bruto);
  const totalDebitos = toNumber(data?.total_debitos);
  const totalDeduccion = toNumber(data?.total_deduccion);
  const totalNeto = totalBruto - (totalDebitos + totalDeduccion);

  /* ======= SIEMPRE listar TODAS las OS ======= */
  const allInsurances: InsuranceItem[] = useMemo(() => {
    return (osList ?? [])
      .map((os) => {
        const id = String(os.NRO_OBRASOCIAL);
        const name = (os.OBRA_SOCIAL ?? "").toString().trim() || `Obra Social ${id}`;
        return { id, name };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [osList]);

  // Mapa para nombres de OS
  const osNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const os of osList ?? []) {
      m.set(String(os.NRO_OBRASOCIAL), (os.OBRA_SOCIAL ?? "").toString().trim());
    }
    return m;
  }, [osList]);

  /* ======= Períodos precargados por OS desde el resumen ======= */
  type CardPeriodRow = {
    periodo: string;
    bruto: number;
    descuentos: number;
    neto: number;
    liquidacionId?: number | string;
    nroLiquidacion?: string;
    estado?: "A" | "C";
  };

  const rowsByOS: Record<string, CardPeriodRow[]> = useMemo(() => {
    const map: Record<string, CardPeriodRow[]> = {};
    const liqs = getLiquidacionesArray(data?.liquidaciones);

    for (const liq of liqs) {
      const osId =
        liq.obra_social_id ??
        liq.obraSocialId ??
        liq.obra_social_codigo ??
        liq.obra_social_code ??
        liq.os_id;
      if (osId == null) continue;

      const periodo =
        liq.anio_periodo && liq.mes_periodo
          ? `${liq.anio_periodo}-${String(liq.mes_periodo).padStart(2, "0")}`
          : periodTitle;

      const bruto = toNumber(liq.total_bruto);
      const debitos = toNumber(liq.total_debitos);
      const deduccion = toNumber(liq.total_deduccion);
      const descuentos = debitos + deduccion;

      const neto =
        liq.total_neto != null ? toNumber(liq.total_neto) : bruto - descuentos;

      const key = String(osId);
      if (!map[key]) map[key] = [];
      map[key].push({
        periodo,
        bruto,
        descuentos,
        neto,
        liquidacionId: (liq as any)?.id,
        nroLiquidacion: (liq as any)?.nro_liquidacion,
        estado: String((liq as any)?.estado ?? "A").toUpperCase() as "A" | "C",
      });
    }

    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.periodo.localeCompare(b.periodo));
    }
    return map;
  }, [data?.liquidaciones, periodTitle]);


  const openEdit = (d: DiscountRow) => {
    setEditTarget(d);
    setEditPrice(String(d.price));
    setEditPct(String(d.percentage));
    setEditErr(null);
    setEditOpen(true);
  };
  const closeEdit = () => {
    setEditOpen(false);
    setEditTarget(null);
    setEditErr(null);
  };

  const saveEdit = async () => {
    const priceVal = Number(String(editPrice).replace(",", "."));
    const pctVal = Number(String(editPct).replace(",", "."));

    if (!Number.isFinite(priceVal) || priceVal < 0) {
      setEditErr("Precio inválido.");
      return;
    }
    if (!Number.isFinite(pctVal) || pctVal < 0 || pctVal > 100) {
      setEditErr("El porcentaje debe estar entre 0 y 100.");
      return;
    }
    if (!editTarget) return;

    try {
      const r = await fetch(`${DESCUENTOS_URL}/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precio: priceVal, porcentaje: pctVal }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(txt || `Error ${r.status}`);
      }
      // reflejar cambios en UI
      setDiscounts((prev) =>
        prev.map((x) =>
          x.id === editTarget.id ? { ...x, price: priceVal, percentage: pctVal } : x
        )
      );
      closeEdit();
    } catch (e: any) {
      setEditErr(e?.message || "No se pudo guardar.");
    }
  };

  /* ======= buscador + ocultos ======= */
  const filtered = useMemo(() => {
    const q = (query ?? "").trim().toLowerCase();
    return allInsurances
      .filter((i) => !hidden.has(i.id))
      .filter((i) => (i.name || `Obra Social ${i.id}`).toLowerCase().includes(q));
  }, [allInsurances, hidden, query]);

  /* ======= ORDEN: primero las que tienen liquidaciones ======= */
  const ordered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aHas = (rowsByOS[a.id]?.length ?? 0) > 0 ? 1 : 0;
      const bHas = (rowsByOS[b.id]?.length ?? 0) > 0 ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      return a.name.localeCompare(b.name, "es");
    });
  }, [filtered, rowsByOS]);

  /* ======= Paginación front ======= */
  const totalItems = ordered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = ordered.slice(start, end);

  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setPage(totalPages);

  // Buscar por año/mes
  const findResumenIdByYearMonth = useCallback(
    async (_anio: number, _mes: number): Promise<number | null> => null,
    []
  );

  const handlePickerConfirm = async () => {
    setPickerError(null);
    if (!pickerMonth) return;
    const y = pickerMonth.getFullYear();
    const m = pickerMonth.getMonth() + 1;
    const targetId = await findResumenIdByYearMonth(y, m);
    if (targetId) {
      setOpenAddPeriod(false);
      navigate(`/liquidation/${targetId}`);
    } else {
      setPickerError("No existe una liquidación para el mes seleccionado.");
    }
  };

  // Tabs -> cambian la vista del carrusel
  const onTab = (tab: "obras" | "debitos") => setActiveView(tab);



  /* ================== PREVIEW DATA (modal) ================== */
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

  const previewRows: PreviewRow[] = useMemo(() => {
    const liqs = getLiquidacionesArray(data?.liquidaciones);
    const out: PreviewRow[] = [];
    for (const liq of liqs) {
      const osId =
        liq.obra_social_id ??
        liq.obraSocialId ??
        liq.obra_social_codigo ??
        liq.obra_social_code ??
        liq.os_id;
      if (osId == null) continue;
      const periodo =
        liq.anio_periodo && liq.mes_periodo
          ? `${liq.anio_periodo}-${String(liq.mes_periodo).padStart(2, "0")}`
          : periodTitle;

      const bruto = toNumber(liq.total_bruto);
      const debitos = toNumber(liq.total_debitos);
      const deduccion = toNumber(liq.total_deduccion);
      const neto =
        liq.total_neto != null
          ? toNumber(liq.total_neto)
          : bruto - (debitos + deduccion);

      const estado = String(liq.estado ?? "A").toUpperCase() === "C" ? "C" : "A";
      const osIdStr = String(osId);
      const osName = osNameById.get(osIdStr) ?? `OS ${osIdStr}`;

      out.push({ osId: osIdStr, osName, periodo, estado, bruto, debitos, deduccion, neto, nro: (liq as any)?.nro_liquidacion ?? "" });
    }
    return out.sort((a, b) => (a.estado === b.estado ? 0 : a.estado === "C" ? -1 : 1));
  }, [data?.liquidaciones, osNameById, periodTitle]);

  const totals = useMemo(() => {
    const c = previewRows.filter((r) => r.estado === "C");
    const a = previewRows.filter((r) => r.estado === "A");
    const sum = (arr: PreviewRow[], key: keyof PreviewRow) =>
      arr.reduce((s, x) => s + (Number(x[key]) || 0), 0);

    const cerradasNeto = sum(c, "neto");
    const abiertasNeto = sum(a, "neto");
    const resumenDeduccion = toNumber(data?.total_deduccion);
    const totalGeneral = cerradasNeto + abiertasNeto + resumenDeduccion;

    return { cerradasNeto, abiertasNeto, resumenDeduccion, totalGeneral };
  }, [previewRows, data?.total_deduccion]);

  // === acciones de generar ===
  const doGenerate = async () => {
    if (!confirmGen || !id) return;
    setGenStatus("loading");
    setGenError(null);

    try {
      const generateUrl =
        confirmGen.kind === "desc"
          ? GEN_DESC_URL(id, confirmGen.id)
          : GEN_ESP_URL(id, confirmGen.id);

      // Body: para descuentos mandamos override de snapshot; para especialidad podés omitirlo
      let body: any = undefined;
      if (confirmGen.kind === "desc") {
        const row = discounts.find((d) => d.id === confirmGen.id);
        if (row) body = { monto: row.price, porcentaje: row.percentage };
      }

      // 1) Generar (cargar mes / actualizar saldos)
      const genRes = await fetch(generateUrl, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!genRes.ok) {
        const txt = await genRes.text().catch(() => "");
        throw new Error(txt || `Error ${genRes.status} al generar`);
      }

      // 2) Aplicar (consumir saldos según disponible)
      const aplRes = await fetch(APLICAR_URL(id), { method: "POST" });
      if (!aplRes.ok) {
        const txt = await aplRes.text().catch(() => "");
        throw new Error(
          `Se generó, pero falló la aplicación: ${txt || `Error ${aplRes.status}`}`
        );
      }

      // 3) Refrescar resumen (totales actualizados, incl. total_deduccion)
      await reloadResumen();
      setGenStatus("done");
    } catch (e: any) {
      setGenStatus("error");
      setGenError(e?.message || "No se pudo generar/aplicar.");
    }
  };

  const closeGenModal = () => {
    setConfirmGen(null);
    setGenStatus("idle");
    setGenError(null);
  };

  return (
    <div className={styles.liquidationCyclePage}>
      <Sidebar />
      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.header}>
            <div className={styles.headerInfo}>
              <div className={styles.breadcrumb}>CICLO DE LIQUIDACIÓN</div>
              <h1 className={styles.title}>Período {periodTitle}</h1>
              <div className={styles.subtotals}>
                <span><b>Bruto:</b> ${totalBruto.toLocaleString("es-AR")}</span>
                <span className={styles.dot}>·</span>
                <span><b>Débitos:</b> ${totalDebitos.toLocaleString("es-AR")}</span>
                <span className={styles.dot}>·</span>
                <span><b>Deducción:</b> ${totalDeduccion.toLocaleString("es-AR")}</span>
                <span className={styles.dot}>·</span>
                <span><b>Neto:</b> ${totalNeto.toLocaleString("es-AR")}</span>
              </div>
            </div>

            <div className={styles.headerButtons}>
              <Button variant="secondary" onClick={() => setOpenPreview(true)}>
                Pre-Visualizar
              </Button>
              <Button variant="success" onClick={() => console.log("Exportar Todo", data)}>
                Exportar Todo
              </Button>
            </div>
          </div>

          {/* Tabs controlan la vista del carrusel */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeView === "obras" ? styles.active : ""}`}
              onClick={() => onTab("obras")}
            >
              Obras Sociales
            </button>
            <button
              className={`${styles.tab} ${activeView === "debitos" ? styles.active : ""}`}
              onClick={() => onTab("debitos")}
            >
              Débitos de Colegio
            </button>
          </div>

          {/* Carrusel de vistas */}
          <div className={styles.viewport}>
            <motion.div
              className={styles.carousel}
              animate={{ x: activeView === "obras" ? "0%" : "-100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
            >
              {/* ===== Pane 1: Obras Sociales ===== */}
              <div className={styles.pane}>
                <div className={styles.searchSection}>
                  <SearchBar
                    placeholder="Buscar obra social..."
                    value={query}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                  />
                </div>

                {pickerError && (
                  <Alert
                    type="warning"
                    title="Sin resultados"
                    message={pickerError}
                    onClose={() => setPickerError(null)}
                  />
                )}

                {isLoading && (
                  <Alert
                    type="info"
                    title="Cargando"
                    message="Obteniendo detalle del período…"
                    onClose={() => {}}
                  />
                )}

                {(isError || osError) && (
                  <Alert
                    type="error"
                    title="Error"
                    message={(error as Error | undefined)?.message || osError || "No se pudo cargar la información"}
                    onClose={() => navigate(-1)}
                  />
                )}

                {!isLoading && !isError && !osError && (
                  <>
                    <div className={styles.socialWorksList}>
                      {pageItems.length === 0 && (
                        <div className={styles.emptyState}>No hay obras sociales para mostrar.</div>
                      )}

                      {pageItems.map((ins) => (
                        <InsuranceCard
                          key={ins.id}
                          name={ins.name}
                          osId={ins.id}
                          resumenId={id!}
                          initialPeriods={(rowsByOS[ins.id] ?? []).map((r) => ({
                            period: r.periodo,
                            grossTotal: r.bruto,
                            discounts: r.descuentos,
                            netTotal: r.neto,
                            liquidacionId: r.liquidacionId,
                            nroLiquidacion: r.nroLiquidacion,
                            estado: r.estado,
                          }))}
                          onSummary={(periods) => console.log("Ver Resumen", ins.name, periods)}
                          onExport={(periods) => console.log("Exportar", ins.name, periods)}
                          onDelete={() => {
                            setHidden((prev) => {
                              const next = new Set(prev);
                              next.add(ins.id);
                              return next;
                            });
                          }}
                        />
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className={styles.pagination}>
                        <div className={styles.paginationInfo}>
                          Mostrando {start + 1}-{Math.min(end, totalItems)} de {totalItems}
                        </div>
                        <div className={styles.paginationButtons}>
                          <Button variant="secondary" onClick={goFirst} disabled={currentPage === 1}>«</Button>
                          <Button variant="secondary" onClick={goPrev} disabled={currentPage === 1}>Anterior</Button>
                          <span className={styles.pageNumber}>Página {currentPage} / {totalPages}</span>
                          <Button variant="secondary" onClick={goNext} disabled={currentPage === totalPages}>Siguiente</Button>
                          <Button variant="secondary" onClick={goLast} disabled={currentPage === totalPages}>»</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ===== Pane 2: Débitos de Colegio ===== */}
              <div className={styles.pane}>
                <div className={styles.debitosHeader}>
                  {/* <Button variant="ghost" onClick={() => setActiveView("obras")}>← Volver</Button> */}
                  <h2>Débitos de Colegio — Período {periodTitle}</h2>
                  <div />
                </div>

                <div className={styles.debitosGrid}>
                  {/* BOX Descuentos */}
                  <div className={styles.box}>
                    <div className={styles.boxHeader}>
                      <h4>Descuentos</h4>
                      <input
                        value={searchDiscount}
                        onChange={(e) => setSearchDiscount(e.target.value)}
                        placeholder="Buscar descuento…"
                        className={styles.input}
                        style={{ width: 240 }}
                      />
                    </div>

                    {debError && <div className={styles.errorInline}>Error: {debError}</div>}
                    {loadingDeb ? (
                      <div className={styles.muted}>Cargando descuentos…</div>
                    ) : (
                      <div className={styles.tableWrap}>
                        <table className={styles.simpleTable}>
                          <thead>
                            <tr>
                              <th>Nro concepto</th>
                              <th>Concepto</th>
                              <th>Precio</th>
                              <th>%</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {discounts
                              .filter((d) => {
                                const q = searchDiscount.trim().toLowerCase();
                                if (!q) return true;
                                return d.id.toLowerCase().includes(q) || d.concept.toLowerCase().includes(q);
                              })
                              .map((d) => (
                                <tr key={d.id}>
                                  <td>{d.nro_colegio}</td>
                                  <td className={styles.ellipsis}>{d.concept}</td>
                                  <td>${d.price.toLocaleString("es-AR", { maximumFractionDigits: 2 })}</td>
                                  <td>{d.percentage}%</td>
                                  <td style={{ display: "flex", gap: 8 }}>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => openEdit(d)}
                                    >
                                      Editar
                                    </Button>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => setConfirmGen({ kind: "desc", id: d.id, name: d.concept })}
                                    >
                                      Generar
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            {discounts.length === 0 && (
                              <tr><td colSpan={5} className={styles.mutedCenter}>Sin descuentos</td></tr>
                            )}
                          </tbody>

                        </table>
                      </div>
                    )}
                  </div>

                  {/* BOX Especialidades */}
                  <div className={styles.box}>
                    <div className={styles.boxHeader}>
                      <h4>Especialidades</h4>
                      <input
                        value={searchSpec}
                        onChange={(e) => setSearchSpec(e.target.value)}
                        placeholder="Buscar especialidad…"
                        className={styles.input}
                        style={{ width: 240 }}
                      />
                    </div>

                    {specError && <div className={styles.errorInline}>Error: {specError}</div>}
                    {loadingSpecs ? (
                      <div className={styles.muted}>Cargando especialidades…</div>
                    ) : (
                      <div className={styles.tableWrap}>
                        <table className={styles.simpleTable}>
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Especialidad</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {specs
                              .filter((s) => {
                                const q = searchSpec.trim().toLowerCase();
                                if (!q) return true;
                                return s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
                              })
                              .map((s) => (
                                <tr key={s.id}>
                                  <td>{s.id}</td>
                                  <td className={styles.ellipsis}>{s.name}</td>
                                  <td>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => setConfirmGen({ kind: "esp", id: s.id, name: s.name })}
                                    >
                                      Generar
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            {specs.length === 0 && (
                              <tr><td colSpan={3} className={styles.mutedCenter}>Sin especialidades</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ===== MODAL: PREVISUALIZAR ===== */}
          <Dialog open={openPreview} onClose={() => setOpenPreview(false)} maxWidth="lg" fullWidth>
            <DialogTitle>Pre-visualización del período {periodTitle}</DialogTitle>
            <DialogContent dividers>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "#f7f7f9", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, color: "#666" }}>Cerradas (Neto)</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    ${currency.format(totals.cerradasNeto)}
                  </div>
                </div>
                <div style={{ background: "#f7f7f9", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, color: "#666" }}>Abiertas (Neto)</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    ${currency.format(totals.abiertasNeto)}
                  </div>
                </div>
                <div style={{ background: "#f7f7f9", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, color: "#666" }}>Deducciones (Resumen)</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    ${currency.format(totals.resumenDeduccion)}
                  </div>
                </div>
                <div style={{ background: "#eefaf0", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, color: "#2a7", fontWeight: 600 }}>TOTAL GENERAL</div>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>
                    ${currency.format(totals.totalGeneral)}
                  </div>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f0f2f5" }}>
                      <th style={th}>Nro OS</th>
                      <th style={th}>Obra Social</th>
                      <th style={th}>Período</th>
                      <th style={th}>Estado</th>
                      <th style={th}>Bruto</th>
                      <th style={th}>Débitos</th>
                      <th style={th}>Total a pagar</th>
                      <th style={th}>Nro Factura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, idx) => (
                      <tr key={`${r.osId}-${r.periodo}-${idx}`} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={td}>{r.osId}</td>
                        <td style={td}>{r.osName}</td>
                        <td style={td}>{r.periodo}</td>
                        <td style={{ ...td, fontWeight: 600, color: r.estado === "C" ? "#0a7" : "#c80" }}>
                          {r.estado === "C" ? "CERRADA" : "ABIERTA"}
                        </td>
                        <td style={{ ...td, textAlign: "right" }}>${currency.format(r.bruto)}</td>
                        <td style={{ ...td, textAlign: "right" }}>-${currency.format(r.debitos)}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                          ${currency.format(r.neto)}
                        </td>
                        <td style={td}>{r.nro || "—"}</td>
                      </tr>
                    ))}
                    {previewRows.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ padding: 16, textAlign: "center", color: "#777" }}>
                          No hay liquidaciones para mostrar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DialogContent>
            <DialogActions>
              <Button variant="secondary" onClick={() => setOpenPreview(false)}>
                Cerrar
              </Button>
            </DialogActions>
          </Dialog>

          {/* Mini-modal de Confirmación / Progreso de Generación */}
          <Dialog open={!!confirmGen} onClose={closeGenModal} maxWidth="xs" fullWidth>
            <DialogTitle>
              {genStatus === "idle" && `Confirmar generación`}
              {genStatus === "loading" && `Generando…`}
              {genStatus === "done" && `¡Listo!`}
              {genStatus === "error" && `Error`}
            </DialogTitle>
            <DialogContent dividers>
              {genStatus === "idle" && (
                <div>
                  ¿Seguro que querés generar {confirmGen?.kind === "desc" ? "el descuento" : "la especialidad"}{" "}
                  <strong>{confirmGen?.name}</strong> para el período <strong>{periodTitle}</strong>?
                </div>
              )}
              {genStatus === "loading" && <div>Procesando en el servidor…</div>}
              {genStatus === "done" && <div>Se generó correctamente.</div>}
              {genStatus === "error" && <div style={{ color: "#a00" }}>No se pudo generar: {genError}</div>}
            </DialogContent>
            <DialogActions>
              {genStatus === "idle" && (
                <>
                  <Button variant="secondary" onClick={closeGenModal}>Cancelar</Button>
                  <Button variant="primary" onClick={doGenerate}>Sí, generar</Button>
                </>
              )}
              {genStatus === "loading" && (
                <Button variant="secondary" onClick={closeGenModal} disabled>Cancelar</Button>
              )}
              {(genStatus === "done" || genStatus === "error") && (
                <Button variant="primary" onClick={closeGenModal}>Aceptar</Button>
              )}
            </DialogActions>
          </Dialog>

          {/* Modal: seleccionar nuevo período */}
          <Dialog open={openAddPeriod} onClose={() => setOpenAddPeriod(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Seleccionar nuevo período</DialogTitle>
            <DialogContent className={styles.dialogContent}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  views={["year", "month"]}
                  value={pickerMonth}
                  onChange={(v) => setPickerMonth(v)}
                  format="yyyy-MM"
                  slotProps={{ textField: { fullWidth: true, placeholder: "Elegir mes y año" } }}
                />
              </LocalizationProvider>
            </DialogContent>
            <DialogActions className={styles.dialogActions}>
              <Button variant="secondary" onClick={() => setOpenAddPeriod(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handlePickerConfirm} disabled={!pickerMonth}>Confirmar</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={editOpen} onClose={closeEdit} maxWidth="xs" fullWidth>
            <DialogTitle>Editar descuento</DialogTitle>
            <DialogContent dividers>
              <div className={styles.formRow}>
                <label className={styles.label}>Precio</label>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.label}>Porcentaje</label>
                <div className={styles.inputWithSuffix}>
                  <input
                    className={styles.input}
                    inputMode="decimal"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editPct}
                    onChange={(e) => setEditPct(e.target.value)}
                    placeholder="0"
                  />
                  <span className={styles.suffix}>%</span>
                </div>
              </div>
              {editErr && <div className={styles.errorInline}>{editErr}</div>}
            </DialogContent>
            <DialogActions>
              <Button variant="secondary" onClick={closeEdit}>Cancelar</Button>
              <Button variant="primary" onClick={saveEdit}>Guardar</Button>
            </DialogActions>
          </Dialog>
        </motion.div>
      </div>
    </div>
  );
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  color: "#555",
  borderBottom: "1px solid #e5e7eb",
};
const td: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  color: "#333",
};

export default LiquidationCycle;

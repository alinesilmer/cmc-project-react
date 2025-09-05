"use client";

import type React from "react";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
// import { useQuery } from "@tanstack/react-query";
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

type InsuranceItem = { id: string; name: string };
type ServerEstado = "a" | "c" | "e" | string | null | undefined;

interface LiquidacionItem {
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

// const API_BASE =
//   (import.meta as ImportMeta).env.VITE_API_URL ?? "http://localhost:8000";
// const RESUMEN_URL = `${API_BASE}/api/liquidacion/resumen`;

/* ========== Utils ========== */
function toNumber(x: unknown): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Number.parseFloat(x);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function estadoToLabel(
  e: ServerEstado
): "EN CURSO" | "FINALIZADO" | "DESCONOCIDO" {
  if (e === "a") return "EN CURSO";
  if (e === "c" || e === "e") return "FINALIZADO";
  return "DESCONOCIDO";
}

function getLiquidacionesArray(x: unknown): LiquidacionItem[] {
  if (!Array.isArray(x)) return [];
  return x.filter((i) => i && typeof i === "object") as LiquidacionItem[];
}

function deriveInsurances(detail: ResumenDetail | undefined): InsuranceItem[] {
  const liqs = getLiquidacionesArray(detail?.liquidaciones);
  const map = new Map<string, string>();
  for (const liq of liqs) {
    const rawId =
      liq.obra_social_id ??
      liq.obraSocialId ??
      liq.obra_social_codigo ??
      liq.obra_social_code ??
      liq.os_id ??
      "desconocida";
    const idStr = String(rawId);
    const name =
      liq.obra_social_nombre ??
      liq.obraSocialNombre ??
      liq.obra_social ??
      liq.obraSocial ??
      liq.os ??
      `Obra Social ${idStr}`;
    if (!map.has(idStr)) map.set(idStr, String(name));
  }
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
}

/* ================================
   FAKE DETAILS aligned with list:
   IDs 1..5 → 2025-01,02,03,07,08
   ================================ */
const FAKE_DETAILS: ResumenDetail[] = [
  {
    id: 1,
    anio: 2025,
    mes: 1,
    estado: "c",
    total_bruto: 1_200_000,
    total_debitos: 100_000,
    total_deduccion: 50_000,
    liquidaciones: [
      { obra_social_id: 1, obra_social_nombre: "IOSCOR" },
      { obra_social_id: 2, obra_social_nombre: "PAMI" },
      { obra_social_id: 3, obra_social_nombre: "OSDE" },
    ],
  },
  {
    id: 2,
    anio: 2025,
    mes: 2,
    estado: "c",
    total_bruto: 1_300_000,
    total_debitos: 80_000,
    total_deduccion: 60_000,
    liquidaciones: [
      { obra_social_id: 1, obra_social_nombre: "IOSCOR" },
      { obra_social_id: 4, obra_social_nombre: "Swiss Medical" },
      { obra_social_id: 5, obra_social_nombre: "UNNE" },
    ],
  },
  {
    id: 3,
    anio: 2025,
    mes: 3,
    estado: "c",
    total_bruto: 1_100_000,
    total_debitos: 90_000,
    total_deduccion: 40_000,
    liquidaciones: [
      { obra_social_id: 2, obra_social_nombre: "PAMI" },
      { obra_social_id: 6, obra_social_nombre: "UTN" },
    ],
  },
  {
    id: 4,
    anio: 2025,
    mes: 7,
    estado: "a",
    total_bruto: 1_500_000,
    total_debitos: 120_000,
    total_deduccion: 70_000,
    liquidaciones: [
      { obra_social_id: 3, obra_social_nombre: "OSDE" },
      { obra_social_id: 7, obra_social_nombre: "Galeno" },
      { obra_social_id: 8, obra_social_nombre: "Sancor Salud" },
    ],
  },
  {
    id: 5,
    anio: 2025,
    mes: 8,
    estado: "a",
    total_bruto: 1_550_000,
    total_debitos: 110_000,
    total_deduccion: 65_000,
    liquidaciones: [
      { obra_social_id: 1, obra_social_nombre: "IOSCOR" },
      { obra_social_id: 4, obra_social_nombre: "Swiss Medical" },
      { obra_social_id: 9, obra_social_nombre: "IOSFA" },
    ],
  },
];

const LiquidationCycle: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [openAddPeriod, setOpenAddPeriod] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<Date | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  // ===== Simulated fetch by :id =====
  const [data, setData] = useState<ResumenDetail | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    const t = setTimeout(() => {
      const nid = Number(id);
      const found = Number.isFinite(nid)
        ? FAKE_DETAILS.find((d) => d.id === nid)
        : undefined;
      if (found) {
        setData(found);
        setIsLoading(false);
      } else {
        setIsError(true);
        setError(new Error("No se encontró el período solicitado."));
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [id]);

  /* ========= API REAL (comentada) =========
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["resumen-detail", id],
    queryFn: async (): Promise<ResumenDetail> => {
      const res = await fetch(`${RESUMEN_URL}/${id}`);
      if (!res.ok)
        throw new Error(
          `Error ${res.status}: ${await res.text().catch(() => res.statusText)}`
        );
      const json: unknown = await res.json();
      return json as ResumenDetail;
    },
    enabled: !!id,
  });
  ========================================= */

  const { periodTitle, estadoLabel } = useMemo(() => {
    const mm = String(data?.mes ?? 1).padStart(2, "0");
    const period = `${data?.anio ?? "----"}-${mm}`;
    return { periodTitle: period, estadoLabel: estadoToLabel(data?.estado) };
  }, [data]);

  const allInsurances = useMemo<InsuranceItem[]>(
    () => deriveInsurances(data),
    [data]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allInsurances
      .filter((i) => !hidden.has(i.id))
      .filter((i) => i.name.toLowerCase().includes(q));
  }, [allInsurances, hidden, query]);

  const removeInsurance = (osId: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(osId);
      return next;
    });
  };

  const onCloseLiquidation = () => {
    alert("Acción 'Cerrar Liquidación' pendiente de endpoint en backend.");
  };

  const totalBruto = toNumber(data?.total_bruto);
  const totalDebitos = toNumber(data?.total_debitos);
  const totalDeduccion = toNumber(data?.total_deduccion);
  const totalNeto = totalBruto - (totalDebitos + totalDeduccion);

  /* ======= REAL (comentado) =======
  const findResumenIdByYearMonth = useCallback(
    async (anio: number, mes: number): Promise<number | null> => {
      const url = new URL(RESUMEN_URL);
      url.searchParams.set("anio", String(anio));
      url.searchParams.set("mes", String(mes));
      url.searchParams.set("skip", "0");
      url.searchParams.set("limit", "1");
      const res = await fetch(url.toString());
      if (!res.ok) return null;
      const arr: unknown = await res.json();
      if (!Array.isArray(arr) || arr.length === 0) return null;
      const first = arr[0] as { id?: number };
      return typeof first?.id === "number" ? first.id : null;
    },
    []
  );
  ================================ */

  // Fake lookup consistent with FAKE_DETAILS above
  const findResumenIdByYearMonth = useCallback(
    async (anio: number, mes: number): Promise<number | null> => {
      const match = FAKE_DETAILS.find((d) => d.anio === anio && d.mes === mes);
      return match ? match.id : null;
    },
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

  const onTab = (tab: "obras" | "debitos") => {
    if (!id) return;
    navigate(
      tab === "obras" ? `/liquidation/${id}` : `/liquidation/${id}/debitos`
    );
  };
  const isDebitos = location.pathname.endsWith("/debitos");

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
                <span>
                  <b>Bruto:</b> ${totalBruto.toLocaleString("es-AR")}
                </span>
                <span className={styles.dot}>·</span>
                <span>
                  <b>Débitos:</b> ${totalDebitos.toLocaleString("es-AR")}
                </span>
                <span className={styles.dot}>·</span>
                <span>
                  <b>Deducción:</b> ${totalDeduccion.toLocaleString("es-AR")}
                </span>
                <span className={styles.dot}>·</span>
                <span>
                  <b>Neto:</b> ${totalNeto.toLocaleString("es-AR")}
                </span>
              </div>
            </div>

            <div className={styles.headerButtons}>
              <button
                className={styles.closeLiquidation}
                onClick={onCloseLiquidation}
                disabled={estadoLabel !== "EN CURSO"}
                title={
                  estadoLabel !== "EN CURSO"
                    ? "Solo se puede cerrar si está EN CURSO"
                    : ""
                }
              >
                Cerrar Liquidación
              </button>
              <Button
                variant="secondary"
                onClick={() => console.log("Pre-Visualizar", data)}
              >
                Pre-Visualizar
              </Button>
              <Button
                variant="success"
                onClick={() => console.log("Exportar Todo", data)}
              >
                Exportar Todo
              </Button>
            </div>
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${!isDebitos ? styles.active : ""}`}
              onClick={() => onTab("obras")}
            >
              Obras Sociales
            </button>
            <button
              className={`${styles.tab} ${isDebitos ? styles.active : ""}`}
              onClick={() => onTab("debitos")}
            >
              Débitos de Colegio
            </button>
          </div>

          <div className={styles.searchSection}>
            <SearchBar
              placeholder="Buscar obra social..."
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
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
              message="Obteniendo detalle del período (modo demo)…"
              onClose={() => {}}
            />
          )}

          {isError && (
            <Alert
              type="error"
              title="Error"
              message={
                (error as Error | undefined)?.message ||
                "No se pudo cargar el detalle"
              }
              onClose={() => navigate(-1)}
            />
          )}

          {!isLoading && !isError && (
            <div className={styles.socialWorksList}>
              {filtered.length === 0 && (
                <div className={styles.emptyState}>
                  No hay obras sociales para mostrar.
                </div>
              )}
              {filtered.map((ins) => (
                <InsuranceCard
                  key={ins.id}
                  name={ins.name}
                  onSummary={(periods) =>
                    console.log("Resumen", ins.name, periods)
                  }
                  onExport={(periods) =>
                    console.log("Exportar", ins.name, periods)
                  }
                  onDelete={() => removeInsurance(ins.id)}
                />
              ))}
            </div>
          )}

          <Dialog
            open={openAddPeriod}
            onClose={() => setOpenAddPeriod(false)}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>Seleccionar nuevo período</DialogTitle>
            <DialogContent className={styles.dialogContent}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  views={["year", "month"]}
                  value={pickerMonth}
                  onChange={(v) => setPickerMonth(v)}
                  format="yyyy-MM"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      placeholder: "Elegir mes y año",
                    },
                  }}
                />
              </LocalizationProvider>
            </DialogContent>
            <DialogActions className={styles.dialogActions}>
              <Button
                variant="secondary"
                onClick={() => setOpenAddPeriod(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handlePickerConfirm}
                disabled={!pickerMonth}
              >
                Confirmar
              </Button>
            </DialogActions>
          </Dialog>
        </motion.div>
      </div>
    </div>
  );
};

export default LiquidationCycle;

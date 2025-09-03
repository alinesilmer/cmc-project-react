"use client";

import type React from "react";
import { useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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

const API_BASE =
  (import.meta as ImportMeta).env.VITE_API_URL ?? "http://localhost:8000";
const RESUMEN_URL = `${API_BASE}/api/liquidacion/resumen`;

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

const LiquidationCycle: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const [openAddPeriod, setOpenAddPeriod] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<Date | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

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

  const { periodTitle, estadoLabel } = useMemo(() => {
    const mm = String(data?.mes ?? 1).padStart(2, "0");
    const period = `${data?.anio ?? "----"}-${mm}`;
    const d =
      data?.anio && data?.mes
        ? new Date(data.anio, (data.mes ?? 1) - 1, 1)
        : null;
    return {
      periodTitle: period,
      estadoLabel: estadoToLabel(data?.estado),
      selectedDate: d,
    };
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
              message="Obteniendo detalle del período..."
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

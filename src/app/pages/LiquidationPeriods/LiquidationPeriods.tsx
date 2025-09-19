// app/pages/LiquidationPeriods/LiquidationPeriods.tsx
"use client";

import type React from "react";
import { useMemo, useState, useEffect, useCallback } from "react";
// ⬇ Mantengo estos imports comentados por si luego reactivás el calendario/filtros
// import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
// import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
// import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import SearchBar from "../../../components/molecules/SearchBar/SearchBar";
import Card from "../../../components/atoms/Card/Card";
import Button from "../../../components/atoms/Button/Button";
import styles from "./LiquidationPeriods.module.scss";
import PeriodsTable, { type Period } from "../../../components/molecules/PeriodsTable/PeriodsTable";
import Alert from "../../../components/atoms/Alert/Alert";

import { getJSON } from "../../../lib/http";
import { API_URL } from "../../../config/env";

type ServerEstado = "a" | "c" | "e" | string | null | undefined;

interface ResumenDto {
  id: number;
  anio: number;
  mes: number;
  total_bruto: number | string | null | undefined;
  total_debitos: number | string | null | undefined;
  total_deduccion: number | string | null | undefined;
  estado: ServerEstado;
}

type QueryParams = {
  anio?: number;
  mes?: number;
  estado?: "a" | "c" | undefined;
};

function parseYYYYMM(input: string): { anio: number; mes: number } | null {
  const s = input.trim();
  const m = s.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!m) return null;
  return { anio: Number(m[1]), mes: Number(m[2]) };
}

function toNumber(x: unknown): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Number.parseFloat(x);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function estadoToLabel(e: ServerEstado): "EN CURSO" | "FINALIZADO" {
  return e === "a" ? "EN CURSO" : "FINALIZADO";
}

function mapDtoToPeriod(dto: ResumenDto): Period {
  const bruto = toNumber(dto.total_bruto);
  const debitos = toNumber(dto.total_debitos);
  const deduccion = toNumber(dto.total_deduccion);
  const discounts = debitos + deduccion;
  const neto = bruto - discounts;
  const mm = String(dto.mes ?? 1).padStart(2, "0");
  const periodStr = `${dto.anio ?? 1970}-${mm}`;
  return {
    id: Number(dto.id ?? 0),
    period: periodStr,
    grossTotal: bruto,
    discounts: discounts,
    netTotal: neto,
    // Podés dejar status aunque la tabla ya no lo muestre
    status: estadoToLabel(dto.estado),
  };
}

const BASE = API_URL.replace(/\/$/, "");
const RESUMEN_URL = `${BASE}/api/liquidacion/resumen`;
const RESUMEN_NEXT_URL = `${BASE}/api/liquidacion/resumen/next`;

const LiquidationPeriods: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  // Si ya quitaste la columna Estado de la tabla, también podés quitar por completo este filtro.
  const [statusFilter] = useState<"" | "EN CURSO" | "FINALIZADO">("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<Period | null>(null);
  // const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

  // Flags locales para estados de red
  const [isLoading, setIsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Datos cargados desde la API
  const [rows, setRows] = useState<Period[]>([]);

  const parsed = parseYYYYMM(searchTerm);
  const estadoBackend: QueryParams["estado"] =
    statusFilter === "EN CURSO" ? "a" : statusFilter === "FINALIZADO" ? "c" : undefined;

  const buildUrlWithParams = (params: QueryParams) => {
    const url = new URL(RESUMEN_URL);
    if (typeof params.anio === "number") url.searchParams.set("anio", String(params.anio));
    if (typeof params.mes === "number") url.searchParams.set("mes", String(params.mes));
    if (params.estado) url.searchParams.set("estado", params.estado);
    url.searchParams.set("skip", "0");
    url.searchParams.set("limit", "100");
    return url.toString();
  };

  const fetchResumen = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorMsg(null);
    try {
      const url = buildUrlWithParams({
        anio: parsed?.anio,
        mes: parsed?.mes,
        estado: estadoBackend,
      });
      const json = await getJSON(url);
      if (!Array.isArray(json)) throw new Error("Formato de respuesta inesperado del servidor");
      const serverPeriods = (json as ResumenDto[]).map(mapDtoToPeriod);
      setRows(serverPeriods);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al obtener períodos";
      setError(new Error(msg));
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, [parsed?.anio, parsed?.mes, estadoBackend]);

  useEffect(() => {
    fetchResumen();
  }, [fetchResumen]);

  const filtered: Period[] = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    return rows.filter((p) => {
      const matchesSearch =
        !s || p.period.toLowerCase().includes(s) || (p.status?.toLowerCase() ?? "").includes(s);
      // statusFilter ya no se usa si quitaste la columna/selector
      const matchesStatus = !statusFilter || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchTerm, statusFilter]);

  // === Crear el siguiente período vía backend (con rollover de año) ===
  const handleAddPeriod = async () => {
    setCreating(true);
    setErrorMsg(null);
    try {
      const r = await fetch(RESUMEN_NEXT_URL, { method: "POST" });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(txt || `Error ${r.status} al crear el siguiente período`);
      }
      const created = (await r.json()) as ResumenDto;

      // Mapear y agregar ordenado desc por período
      const newRow = mapDtoToPeriod(created);
      setRows((prev) => [newRow, ...prev].sort((a, b) => b.period.localeCompare(a.period)));
    } catch (e: any) {
      setErrorMsg(e?.message || "No se pudo crear el período");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (row: Period) => setConfirmRow(row);

  const confirmDelete = () => {
    if (!confirmRow) return;
    setDeleting(true);
    // Si tenés endpoint DELETE, llamalo aquí. Por ahora simulo localmente:
    setTimeout(() => {
      try {
        setRows((prev) => prev.filter((r) => r.id !== confirmRow.id));
        setConfirmRow(null);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "No se pudo eliminar el período");
      } finally {
        setDeleting(false);
      }
    }, 400);
  };

  // const handleCalendarChange = (value: Date | null) => {
  //   setSelectedMonth(value);
  //   if (value) {
  //     const y = value.getFullYear();
  //     const m = String(value.getMonth() + 1).padStart(2, "0");
  //     setSearchTerm(`${y}-${m}`);
  //   }
  // };

  return (
    <div className={styles.liquidationPage}>
      <div className={styles.content}>
        <div className="fade-in" style={{ opacity: 1, transform: "translateY(0)" }}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <SearchBar
                placeholder="Buscar período (ej: 2025-07)..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
              {/* Si querés reactivar filtros, descomentá esto
              <div className={styles.filters}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    views={["year", "month"]}
                    value={selectedMonth}
                    onChange={handleCalendarChange}
                    format="yyyy-MM"
                    slotProps={{
                      textField: { size: "small", placeholder: "Elegir mes", variant: "outlined" },
                    }}
                  />
                </LocalizationProvider>
                <select
                  className={styles.statusFilter}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "" | "EN CURSO" | "FINALIZADO")}
                >
                  <option value="">TODOS</option>
                  <option value="EN CURSO">EN CURSO</option>
                  <option value="FINALIZADO">FINALIZADO</option>
                </select>
              </div>
              */}
            </div>
            <div className={styles.actions}>
              {/* <Button variant="secondary" onClick={fetchResumen}>Refrescar</Button> */}
              <Button variant="primary" onClick={handleAddPeriod} disabled={creating}>
                {creating ? "Creando..." : "Agregar Período"}
              </Button>
            </div>
          </div>

          <Card className={`${styles.tableCard} scale-in`}>
            {isLoading && (
              <Alert
                type="info"
                title="Cargando"
                message="Obteniendo períodos…"
                onClose={() => {}}
              />
            )}
            {(error || errorMsg) && (
              <Alert
                type="error"
                title="Error"
                message={error?.message || errorMsg || "Error al cargar períodos"}
                onClose={() => setErrorMsg(null)}
              />
            )}

            <PeriodsTable
              title="Períodos de Liquidación"
              data={filtered}
              getSeeLink={(row) => `/liquidation/${row.id}`}
              getSeeState={(row) => ({ period: row.period })}
              onRequestDelete={handleDelete}
              // Asegurate de haber quitado la columna “Estado” dentro de PeriodsTable
            />

          </Card>
          {confirmRow && (
            <Alert
              type="warning"
              title="Eliminar período"
              message={`¿Seguro que querés eliminar el período ${confirmRow.period}? Esta acción no se puede deshacer.`}
              onClose={() => setConfirmRow(null)}
              onCancel={() => setConfirmRow(null)}
              onConfirm={confirmDelete}
              confirmLabel={deleting ? "Eliminando..." : "Sí, eliminar"}
              cancelLabel="Cancelar"
              showActions
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default LiquidationPeriods;

"use client";

import type React from "react";
import { useMemo, useState } from "react";
// ⬇ Keep the import here commented so ESLint doesn’t complain if you re-enable later
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import SearchBar from "../../../components/molecules/SearchBar/SearchBar";
import Card from "../../../components/atoms/Card/Card";
import Button from "../../../components/atoms/Button/Button";
import styles from "./LiquidationPeriods.module.scss";
import PeriodsTable, {
  type Period,
} from "../../../components/molecules/PeriodsTable/PeriodsTable";
import Alert from "../../../components/atoms/Alert/Alert";

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

// const API_BASE =
//   (import.meta as ImportMeta).env.VITE_API_URL ?? "http://localhost:8000";
// const RESUMEN_URL = `${API_BASE}/api/liquidacion/resumen`;

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

// function isResumenDtoArray(data: unknown): data is ResumenDto[] {
//   return Array.isArray(data);
// }

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
    status: estadoToLabel(dto.estado),
  };
}

/* ================================
   FAKE DATA (para testear)
   ================================ */
const FAKE_RESUMEN: ResumenDto[] = [
  {
    id: 1,
    anio: 2025,
    mes: 1,
    total_bruto: 1200000,
    total_debitos: 100000,
    total_deduccion: 50000,
    estado: "c",
  },
  {
    id: 2,
    anio: 2025,
    mes: 2,
    total_bruto: 1300000,
    total_debitos: 80000,
    total_deduccion: 60000,
    estado: "c",
  },
  {
    id: 3,
    anio: 2025,
    mes: 3,
    total_bruto: 1100000,
    total_debitos: 90000,
    total_deduccion: 40000,
    estado: "c",
  },
  {
    id: 4,
    anio: 2025,
    mes: 7,
    total_bruto: 1500000,
    total_debitos: 120000,
    total_deduccion: 70000,
    estado: "a",
  },
  {
    id: 5,
    anio: 2025,
    mes: 8,
    total_bruto: 1550000,
    total_debitos: 110000,
    total_deduccion: 65000,
    estado: "a",
  },
];

/* ===========================================
   COMPONENTE con datos fake y API comentada
   =========================================== */
const LiquidationPeriods: React.FC = () => {
  // const queryClient = useQueryClient(); // ⬅ API (comentado)

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "" | "EN CURSO" | "FINALIZADO"
  >("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<Period | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

  // Flags locales para simular estados de red
  const [isLoading, setIsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Estado local con datos fake
  const [rows, setRows] = useState<Period[]>(() =>
    FAKE_RESUMEN.map(mapDtoToPeriod)
  );

  const parsed = parseYYYYMM(searchTerm);
  const estadoBackend: QueryParams["estado"] =
    statusFilter === "EN CURSO"
      ? "a"
      : statusFilter === "FINALIZADO"
      ? "c"
      : undefined;

  /* ==========================================================
     API ORIGINAL (React Query) — Comentada para mantenerla
     ==========================================================
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "resumen",
      { anio: parsed?.anio, mes: parsed?.mes, estado: estadoBackend },
    ],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, QueryParams];
      const url = new URL(RESUMEN_URL);
      if (typeof params?.anio === "number")
        url.searchParams.set("anio", String(params.anio));
      if (typeof params?.mes === "number")
        url.searchParams.set("mes", String(params.mes));
      if (params?.estado) url.searchParams.set("estado", params.estado);
      url.searchParams.set("skip", "0");
      url.searchParams.set("limit", "100");
      const res = await fetch(url.toString(), { method: "GET" });
      if (!res.ok)
        throw new Error(
          \`Error \${res.status}: \${await res.text().catch(() => res.statusText)}\`
        );
      const json: unknown = await res.json();
      return json;
    },
  });

  const serverPeriods: Period[] = useMemo(() => {
    if (!isResumenDtoArray(data)) return [];
    return data.map(mapDtoToPeriod);
  }, [data]);

  const { mutate: createResumen, isPending: creating } = useMutation({
    mutationFn: async ({ anio, mes }: { anio: number; mes: number }) => {
      const res = await fetch(RESUMEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anio, mes }),
      });
      if (!res.ok)
        throw new Error(
          \`Error \${res.status}: \${await res.text().catch(() => res.statusText)}\`
        );
      const json: unknown = await res.json();
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumen"] });
      setErrorMsg(null);
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error ? e.message : "No se pudo crear el período";
      setErrorMsg(msg);
    },
  });

  const { mutate: deleteResumen, isPending: deleting } = useMutation({
    mutationFn: async (resumenId: number) => {
      const res = await fetch(\`\${RESUMEN_URL}/\${resumenId}\`, {
        method: "DELETE",
      });
      if (!res.ok)
        throw new Error(
          \`Error \${res.status}: \${await res.text().catch(() => res.statusText)}\`
        );
      return resumenId;
    },
    onSuccess: () => {
      setConfirmRow(null);
      queryClient.invalidateQueries({ queryKey: ["resumen"] });
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error ? e.message : "No se pudo eliminar el período";
      setErrorMsg(msg);
    },
  });
  ========================================================== */

  // ====== Simulaciones locales (reemplazan temporalmente a la API) ======
  const serverPeriods: Period[] = useMemo(() => {
    // Si quisieras “filtrar” por query (anio/mes/estado) como haría el backend:
    const byQuery = rows.filter((p) => {
      const matchesYM =
        !parsed ||
        p.period === `${parsed.anio}-${String(parsed.mes).padStart(2, "0")}`;
      const matchesEstado =
        !estadoBackend ||
        (estadoBackend === "a"
          ? p.status === "EN CURSO"
          : p.status === "FINALIZADO");
      return matchesYM && matchesEstado;
    });
    return byQuery;
  }, [rows, parsed, estadoBackend]);

  const filtered: Period[] = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    return serverPeriods.filter((p) => {
      const matchesSearch =
        !s ||
        p.period.toLowerCase().includes(s) ||
        p.status?.toLowerCase().includes(s);
      const matchesStatus = !statusFilter || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [serverPeriods, searchTerm, statusFilter]);

  const refetch = () => {
    // Simula un “reload”
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setError(null);
    }, 400);
  };

  const handleAddPeriod = () => {
    setCreating(true);
    setErrorMsg(null);

    setTimeout(() => {
      try {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const periodStr = `${y}-${String(m).padStart(2, "0")}`;

        // Si ya existe el período actual, no lo dupliques
        const already = rows.some((r) => r.period === periodStr);
        if (already) {
          setErrorMsg(`El período ${periodStr} ya existe.`);
          setCreating(false);
          return;
        }

        const nextId = rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;

        const bruto = 1_500_000;
        const debitos = 120_000;
        const deduccion = 70_000;

        const newRow: Period = {
          id: nextId,
          period: periodStr,
          grossTotal: bruto,
          discounts: debitos + deduccion,
          netTotal: bruto - (debitos + deduccion),
          status: "EN CURSO",
        };

        setRows((prev) => [newRow, ...prev]);
      } catch (e) {
        setErrorMsg(
          e instanceof Error ? e.message : "No se pudo crear el período"
        );
      } finally {
        setCreating(false);
      }
    }, 450);
  };

  const handleDelete = (row: Period) => setConfirmRow(row);

  const confirmDelete = () => {
    if (!confirmRow) return;
    setDeleting(true);
    setTimeout(() => {
      try {
        setRows((prev) => prev.filter((r) => r.id !== confirmRow.id));
        setConfirmRow(null);
      } catch (e) {
        setErrorMsg(
          e instanceof Error ? e.message : "No se pudo eliminar el período"
        );
      } finally {
        setDeleting(false);
      }
    }, 450);
  };

  const handleCalendarChange = (value: Date | null) => {
    setSelectedMonth(value);
    if (value) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, "0");
      setSearchTerm(`${y}-${m}`);
    }
  };

  return (
    <div className={styles.liquidationPage}>
      <Sidebar />
      <div className={styles.content}>
        <div
          className="fade-in"
          style={{ opacity: 1, transform: "translateY(0)" }}
        >
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <SearchBar
                placeholder="Buscar período (ej: 2025-07)..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(e.target.value)
                }
              />
              <div className={styles.filters}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    views={["year", "month"]}
                    value={selectedMonth}
                    onChange={handleCalendarChange}
                    format="yyyy-MM"
                    slotProps={{
                      textField: {
                        size: "small",
                        placeholder: "Elegir mes",
                        variant: "outlined",
                      },
                    }}
                  />
                </LocalizationProvider>
                <select
                  className={styles.statusFilter}
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as "" | "EN CURSO" | "FINALIZADO"
                    )
                  }
                >
                  <option value="">TODOS</option>
                  <option value="EN CURSO">EN CURSO</option>
                  <option value="FINALIZADO">FINALIZADO</option>
                </select>
              </div>
            </div>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={refetch}>
                Refrescar
              </Button>
              <Button
                variant="primary"
                onClick={handleAddPeriod}
                disabled={creating}
              >
                {creating ? "Creando..." : "Agregar Período"}
              </Button>
            </div>
          </div>

          <Card className={`${styles.tableCard} scale-in`}>
            {isLoading && (
              <Alert
                type="info"
                title="Cargando"
                message="Obteniendo períodos (modo demo)…"
                onClose={() => {}}
              />
            )}
            {(error || errorMsg) && (
              <Alert
                type="error"
                title="Error"
                message={
                  error?.message || errorMsg || "Error al cargar períodos"
                }
                onClose={() => setErrorMsg(null)}
              />
            )}
            <PeriodsTable
              title="Períodos de Liquidación"
              data={filtered}
              getSeeLink={(row) => `/liquidation/${row.id}`}
              getSeeState={(row) => ({ period: row.period })}
              onRequestDelete={handleDelete}
            />
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
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiquidationPeriods;

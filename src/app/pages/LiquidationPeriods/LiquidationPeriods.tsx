"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import SearchBar from "../../../components/molecules/SearchBar/SearchBar";
import Card from "../../../components/atoms/Card/Card";
import Button from "../../../components/atoms/Button/Button";
import styles from "./LiquidationPeriods.module.scss";
import PeriodsTable, { type Period } from "../../../components/molecules/PeriodsTable/PeriodsTable";
import Alert from "../../../components/atoms/Alert/Alert";

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";
const RESUMEN_URL = `${API_BASE}/api/liquidacion/resumen`;

// ===== Helpers =====
function parseYYYYMM(input: string): { anio: number; mes: number } | null {
  const s = input.trim();
  const m = s.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!m) return null;
  return { anio: Number(m[1]), mes: Number(m[2]) };
}
function toNumber(x: unknown): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") return Number.parseFloat(x);
  return 0;
}
function estadoToLabel(e: unknown): "EN CURSO" | "FINALIZADO" {
  return e === "a" ? "EN CURSO" : "FINALIZADO"; // a|c|e
}
function mapDtoToPeriod(dto: any): Period {
  const bruto = toNumber(dto?.total_bruto);
  const debitos = toNumber(dto?.total_debitos);
  const deduccion = toNumber(dto?.total_deduccion);
  const discounts = debitos + deduccion;
  const neto = bruto - discounts;
  const mm = String(dto?.mes ?? 1).padStart(2, "0");
  const periodStr = `${dto?.anio ?? 1970}-${mm}`;
  return {
    id: Number(dto?.id ?? 0),
    period: periodStr,
    grossTotal: bruto,
    discounts: discounts,
    netTotal: neto,
    status: estadoToLabel(dto?.estado),
  };
}

const LiquidationPeriods: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "EN CURSO" | "FINALIZADO">("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<Period | null>(null);

  // Filtros → query params backend
  const parsed = parseYYYYMM(searchTerm);
  const estadoBackend = statusFilter === "EN CURSO" ? "a" : statusFilter === "FINALIZADO" ? "c" : undefined;

  // GET lista (devuelve DTO crudo)
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["resumen", { anio: parsed?.anio, mes: parsed?.mes, estado: estadoBackend }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { anio?: number; mes?: number; estado?: string }];
      const url = new URL(RESUMEN_URL);
      if (params?.anio) url.searchParams.set("anio", String(params.anio));
      if (params?.mes) url.searchParams.set("mes", String(params.mes));
      if (params?.estado) url.searchParams.set("estado", params.estado);
      url.searchParams.set("skip", "0");
      url.searchParams.set("limit", "100");

      const res = await fetch(url.toString(), { method: "GET" });
      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text().catch(() => res.statusText)}`);
      return (await res.json()) as any[];
    },
  });

  const serverPeriods: Period[] = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.map(mapDtoToPeriod);
  }, [data]);

  // Filtro adicional en UI (texto/estado — para búsquedas no YYYY-MM)
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

  // POST crear resumen
  const { mutate: createResumen, isPending: creating } = useMutation({
    mutationFn: async ({ anio, mes }: { anio: number; mes: number }) => {
      const res = await fetch(RESUMEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anio, mes }), // estado default en backend
      });
      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text().catch(() => res.statusText)}`);
      return (await res.json()) as any;
    },
    onSuccess: () => {
      // Más simple y consistente: refetch de la lista
      queryClient.invalidateQueries({ queryKey: ["resumen"] });
      setErrorMsg(null);
    },
    onError: (e: any) => {
      setErrorMsg(e?.message || "No se pudo crear el período");
    },
  });

  // DELETE resumen
  const { mutate: deleteResumen, isPending: deleting } = useMutation({
    mutationFn: async (resumenId: number) => {
      const res = await fetch(`${RESUMEN_URL}/${resumenId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text().catch(() => res.statusText)}`);
      return resumenId;
    },
    onSuccess: () => {
      setConfirmRow(null);
      queryClient.invalidateQueries({ queryKey: ["resumen"] });
    },
    onError: (e: any) => {
      setErrorMsg(e?.message || "No se pudo eliminar el período");
    },
  });

  // Acciones UI
  const handleAddPeriod = () => {
    const now = new Date();
    createResumen({ anio: now.getFullYear(), mes: now.getMonth() + 1 });
  };

  const handleDelete = (row: Period) => setConfirmRow(row);

  const confirmDelete = () => {
    if (!confirmRow) return;
    deleteResumen(confirmRow.id);
  };

  return (
    <div className={styles.liquidationPage}>
      <Sidebar />

      <div className={styles.content}>
        <motion.div
          className="fade-in"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <SearchBar
                placeholder="Buscar período (ej: 2025-07)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className={styles.filters}>
                <select
                  className={styles.statusFilter}
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as "" | "EN CURSO" | "FINALIZADO")
                  }
                >
                  <option value="">TODOS</option>
                  <option value="EN CURSO">EN CURSO</option>
                  <option value="FINALIZADO">FINALIZADO</option>
                </select>
              </div>
            </div>

            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => refetch()}>
                Refrescar
              </Button>
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
                message="Obteniendo períodos desde el servidor…"
                onClose={() => { }}
              />
            )}

            {(isError || errorMsg) && (
              <Alert
                type="error"
                title="Error"
                message={(error as Error)?.message || errorMsg || "Error al cargar períodos"}
                onClose={() => setErrorMsg(null)}
              />
            )}

            <PeriodsTable
              title="Períodos de Liquidación"
              data={filtered}
              getSeeLink={(row) => `/liquidation/${row.id}`}
              getSeeState={(row) => ({ period: row.period })}
              // ✅ ahora sí: el botón ❌ llama a esto
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
        </motion.div>
      </div>
    </div>
  );
};

export default LiquidationPeriods;

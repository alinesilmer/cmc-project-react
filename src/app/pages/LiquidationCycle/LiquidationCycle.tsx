"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import SearchBar from "../../../components/molecules/SearchBar/SearchBar";
import Button from "../../../components/atoms/Button/Button";
import InsuranceCard from "../../../components/molecules/InsuranceCard/InsuranceCard";
import Alert from "../../../components/atoms/Alert/Alert"; // si no lo usás, podés quitarlo
import styles from "./LiquidationCycle.module.scss";

type InsuranceItem = { id: string; name: string };

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";
const RESUMEN_URL = `${API_BASE}/api/liquidacion/resumen`;

function toNumber(x: unknown): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") return Number.parseFloat(x);
  return 0;
}

function estadoToLabel(e: unknown): "EN CURSO" | "FINALIZADO" | "DESCONOCIDO" {
  // Backend: a|c|e
  if (e === "a") return "EN CURSO";
  if (e === "c" || e === "e") return "FINALIZADO";
  return "DESCONOCIDO";
}

/** Extrae obras sociales únicas desde data.liquidaciones con mapeo defensivo */
function deriveInsurances(detail: any): InsuranceItem[] {
  const liqs: any[] = Array.isArray(detail?.liquidaciones) ? detail.liquidaciones : [];
  const map = new Map<string, string>();
  for (const liq of liqs) {
    const id =
      liq?.obra_social_id ??
      liq?.obraSocialId ??
      liq?.obra_social_codigo ??
      liq?.obra_social_code ??
      liq?.obra_social ??
      liq?.os_id ??
      liq?.os ??
      liq?.obraSocial ??
      "desconocida";
    const idStr = String(id);

    const name =
      liq?.obra_social_nombre ??
      liq?.obraSocialNombre ??
      liq?.obra_social ??
      liq?.obraSocial ??
      `Obra Social ${idStr}`;

    if (!map.has(idStr)) map.set(idStr, String(name));
  }
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
}

const LiquidationCycle: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set()); // para "eliminar" localmente

  // Trae el resumen con items
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["resumen-detail", id],
    queryFn: async () => {
      const res = await fetch(`${RESUMEN_URL}/${id}`);
      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text().catch(() => res.statusText)}`);
      return (await res.json()) as any;
    },
    enabled: !!id,
  });

  // Header
  const { periodTitle, estadoLabel } = useMemo(() => {
    const mm = String(data?.mes ?? 1).padStart(2, "0");
    const period = `${data?.anio ?? "----"}-${mm}`;
    return { periodTitle: period, estadoLabel: estadoToLabel(data?.estado) };
  }, [data]);

  // Lista de OS
  const allInsurances = useMemo<InsuranceItem[]>(() => deriveInsurances(data), [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allInsurances
      .filter((i) => !hidden.has(i.id))
      .filter((i) => i.name.toLowerCase().includes(q));
  }, [allInsurances, hidden, query]);

  const removeInsurance = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Acciones (placeholder) — Conectá a tus endpoints cuando estén listos
  const onCloseLiquidation = () => {
    // Aquí iría un PATCH/POST para cerrar la liquidación
    // Por ahora solo mostramos un aviso
    alert("Acción 'Cerrar Liquidación' pendiente de endpoint en backend.");
  };

  const totalBruto = toNumber(data?.total_bruto);
  const totalDebitos = toNumber(data?.total_debitos);
  const totalDeduccion = toNumber(data?.total_deduccion);
  const totalNeto = totalBruto - (totalDebitos + totalDeduccion);

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
            <div>
              <div className={styles.breadcrumb}>CICLO DE LIQUIDACIÓN</div>
              <h1 className={styles.title}>
                Período {periodTitle}{" "}
                {/* <span className={styles.badge}>{estadoLabel}</span> */}
              </h1>
              <div className={styles.subtotals}>
                <span><b>Bruto:</b> ${totalBruto.toLocaleString("es-AR")}</span>{" · "}
                <span><b>Débitos:</b> ${totalDebitos.toLocaleString("es-AR")}</span>{" · "}
                <span><b>Deducción:</b> ${totalDeduccion.toLocaleString("es-AR")}</span>{" · "}
                <span><b>Neto:</b> ${totalNeto.toLocaleString("es-AR")}</span>
              </div>
            </div>

            <button
              className={styles.closeLiquidation}
              onClick={onCloseLiquidation}
              disabled={estadoLabel !== "EN CURSO"} // cerrá solo si está abierto
              title={estadoLabel !== "EN CURSO" ? "Solo se puede cerrar si está EN CURSO" : ""}
            >
              Cerrar Liquidación
            </button>

            <div className={styles.rightActions}>
              <Button variant="primary" onClick={() => console.log("Pre-Visualizar", data)}>
                Pre-Visualizar
              </Button>
              <Button variant="success" onClick={() => console.log("Exportar Todo", data)}>
                Exportar Todo
              </Button>
            </div>
          </div>

          <div className={styles.tabs}>
            <button className={`${styles.tab} ${styles.active}`}>Obras Sociales</button>
            <button className={styles.tab} onClick={() => alert("Cambiar a 'Débitos de Colegio' (Wire pendiente)")}>
              Débitos de Colegio
            </button>
          </div>

          <div className={styles.searchSection}>
            <SearchBar
              placeholder="Buscar obra social..."
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            />
          </div>

          {isLoading && (
            <Alert type="info" title="Cargando" message="Obteniendo detalle del período..." onClose={() => { }} />
          )}

          {isError && (
            <Alert
              type="error"
              title="Error"
              message={(error as Error)?.message || "No se pudo cargar el detalle"}
              onClose={() => navigate(-1)}
            />
          )}

          {!isLoading && !isError && (
            <div className={styles.socialWorksList}>
              {filtered.length === 0 && (
                <div className={styles.emptyState}>No hay obras sociales para mostrar.</div>
              )}

              {filtered.map((ins) => (
                <InsuranceCard
                  key={ins.id}
                  name={ins.name}
                  onSummary={(periods) => console.log("Resumen", ins.name, periods)}
                  onExport={(periods) => console.log("Exportar", ins.name, periods)}
                  onDelete={() => removeInsurance(ins.id)}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default LiquidationCycle;

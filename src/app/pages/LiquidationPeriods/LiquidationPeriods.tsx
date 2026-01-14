// app/pages/LiquidationPeriods/LiquidationPeriods.tsx
"use client";

import type React from "react";
import { useMemo, useState, useEffect, useCallback } from "react";
import SearchBar from "../../components/molecules/SearchBar/SearchBar";
import Card from "../../components/atoms/Card/Card";
import Button from "../../components/atoms/Button/Button";
import styles from "./LiquidationPeriods.module.scss";
import PeriodsTable, {
  type Period,
} from "../../components/molecules/PeriodsTable/PeriodsTable";
import Alert from "../../components/atoms/Alert/Alert";

import { getJSON, postJSON } from "../../lib/http";

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

// type QueryParams = {
//   anio?: number;
//   mes?: number;
//   estado?: "a" | "c" | undefined;
// };

function parseYYYYMM(input: string): { anio: number; mes: number } | null {
  const s = (input || "").trim();
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
    status: estadoToLabel(dto.estado),
  };
}

const RESUMEN_URL = "/api/liquidacion/resumen";

const LiquidationPeriods: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<Period | null>(null);

  // Estados de red
  const [isLoading, setIsLoading] = useState(false);
  // const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Datos
  const [rows, setRows] = useState<Period[]>([]);

  // Modal: crear período (selección año/mes)
  const [openAdd, setOpenAdd] = useState(false);
  const [addYear, setAddYear] = useState<number | "">("");
  const [addMonth, setAddMonth] = useState<number | "">("");
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);

  // bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = openAdd ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openAdd]);

  // Años para el selector (desde año actual-5 a actual+2)
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    const out: number[] = [];
    for (let i = y + 2; i >= y - 5; i--) out.push(i);
    return out;
  }, []);
  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i + 1),
    []
  );

  // filtros de búsqueda
  const parsed = parseYYYYMM(searchTerm);

  const fetchResumen = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorMsg(null);
    try {
      const params: Record<string, any> = { skip: 0, limit: 100 };
      if (parsed) {
        params.anio = parsed.anio;
        params.mes = parsed.mes;
      }
      const json = await getJSON<ResumenDto[]>(RESUMEN_URL, params);
      if (!Array.isArray(json))
        throw new Error("Formato de respuesta inesperado del servidor");
      const serverPeriods = json.map(mapDtoToPeriod);
      setRows(serverPeriods);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al obtener períodos";
      setError(new Error(msg));
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, [parsed?.anio, parsed?.mes]);

  useEffect(() => {
    fetchResumen();
  }, [fetchResumen]);

  const filtered: Period[] = useMemo(() => {
    const s = (searchTerm || "").trim().toLowerCase();
    return rows.filter((p) => !s || p.period.toLowerCase().includes(s));
  }, [rows, searchTerm]);

  // Abrir modal
  const openAddModal = () => {
    setAddErr(null);
    // default a mes/año actual
    const now = new Date();
    setAddYear(now.getFullYear());
    setAddMonth(now.getMonth() + 1);
    setOpenAdd(true);
  };

  // POST /resumen con año/mes elegidos
  const handleCreateWithYearMonth = async () => {
    setAddErr(null);
    if (addYear === "" || addMonth === "") {
      setAddErr("Seleccioná año y mes.");
      return;
    }
    setAddBusy(true);
    const anio = Number(addYear);
    const mes = Number(addMonth);

    try {
      // ✅ ÚNICA llamada de creación
      const created = await postJSON<ResumenDto>(RESUMEN_URL, { anio, mes });
      const newRow = mapDtoToPeriod(created);
      setRows((prev) =>
        [newRow, ...prev].sort((a, b) => b.period.localeCompare(a.period))
      );
      setOpenAdd(false);
    } catch (err: any) {
      // Si el back responde 409, buscamos el existente y lo mostramos en la lista
      const status = err?.response?.status ?? err?.status;
      if (status === 409) {
        try {
          const arr = await getJSON<ResumenDto[]>(RESUMEN_URL, {
            anio,
            mes,
            limit: 1,
          });
          if (Array.isArray(arr) && arr.length) {
            const existing = mapDtoToPeriod(arr[0]);
            setRows((prev) => {
              const already = prev.some((p) => p.id === existing.id);
              const list = already ? prev : [existing, ...prev];
              return list.sort((a, b) => b.period.localeCompare(a.period));
            });
            // Podés cerrar directo si querés:
            setOpenAdd(false);
            return;
          }
        } catch {
          // ignoramos: mostramos mensaje genérico abajo
        }
        setAddErr(
          `Ya existe un resumen para ${anio}-${String(mes).padStart(2, "0")}.`
        );
      } else {
        const msg =
          err?.response?.data?.detail ||
          err?.message ||
          "Error al crear el período";
        setAddErr(typeof msg === "string" ? msg : "Error al crear el período");
      }
    } finally {
      setAddBusy(false);
    }
  };

  // Eliminar (simulado; reemplazá por DELETE si lo tenés)
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
    }, 400);
  };

  return (
    <div
      className={`${styles.liquidationPage} ${openAdd ? styles.modalOpen : ""}`}
    >
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
            </div>
            <div className={styles.actions}>
              <Button variant="primary" onClick={openAddModal}>
                Agregar Período
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
                message={
                  error?.message || errorMsg || "Error al cargar períodos"
                }
                onClose={() => setErrorMsg(null)}
              />
            )}

            <PeriodsTable
              title="Períodos de Liquidación"
              data={filtered}
              getSeeLink={(row) => `/panel/liquidation/${row.id}`}
              getSeeState={(row) => ({ period: row.period })}
              onRequestDelete={handleDelete}
              hideStatus={true} // la columna de estado no se muestra
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

      {/* Modal de alta (ocupa 100vw/100vh) */}
      {openAdd && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          onClick={() => !addBusy && setOpenAdd(false)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Nuevo período</h3>
              <button
                className={styles.modalClose}
                onClick={() => setOpenAdd(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {addErr && <div className={styles.errorInline}>{addErr}</div>}

              <div className={styles.formRow}>
                <label className={styles.label}>Año</label>
                <select
                  className={styles.input}
                  value={addYear}
                  onChange={(e) =>
                    setAddYear(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                >
                  <option value="">Seleccionar año…</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formRow}>
                <label className={styles.label}>Mes</label>
                <select
                  className={styles.input}
                  value={addMonth}
                  onChange={(e) =>
                    setAddMonth(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                >
                  <option value="">Seleccionar mes…</option>
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <div className={styles.muted}>
                  Se creará el período en estado <b>abierto</b> con totales en
                  0.
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => setOpenAdd(false)}
                disabled={addBusy}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateWithYearMonth}
                disabled={addBusy || addYear === "" || addMonth === ""}
              >
                {addBusy ? "Creando…" : "Crear"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidationPeriods;

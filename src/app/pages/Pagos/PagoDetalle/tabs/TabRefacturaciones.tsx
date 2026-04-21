import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJSON, postJSON } from "../../../../lib/http";
import Button from "../../../../components/atoms/Button/Button";
import SelectableTable from "../../../../components/molecules/SelectableTable/SelectableTable";
import type { ColumnDef } from "../../../../components/molecules/SelectableTable/types";
import styles from "./tabs.module.scss";
import { type Pago, type Liquidacion, type LoteAjuste, fmt, mesLabel } from "../../types";

const LIQUIDACIONES_URL = (pagoId: number) => `/api/liquidacion/liquidaciones_por_os/?pago_id=${pagoId}`;
const LOTES_POR_OS_URL = (osId: number, mes: number, anio: number) =>
  `/api/lotes/snaps/por_os_periodo?obra_social_id=${osId}&mes_periodo=${mes}&anio_periodo=${anio}`;
const CREAR_REFAC_URL = "/api/lotes/snaps/crear_refacturacion";

type Props = { pago: Pago; pagoId: number };

const loteEstadoClass = (e: string) => {
  if (e === "A") return styles.loteA;
  if (e === "C") return styles.loteC;
  if (e === "L") return styles.loteL;
  return "";
};
const loteEstadoLabel = (e: string) => {
  if (e === "A") return "Abierto";
  if (e === "C") return "Cerrado";
  if (e === "L") return "En liquidaciones";
  return e;
};

const TabRefacturaciones: React.FC<Props> = ({ pago, pagoId }) => {
  const navigate = useNavigate();

  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [refacturaciones, setRefacturaciones] = useState<LoteAjuste[]>([]);
  const [loteNormalMap, setLoteNormalMap] = useState<Record<string, LoteAjuste | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal crear refacturación
  const [createOpen, setCreateOpen] = useState(false);
  const [createOsId, setCreateOsId] = useState<number | "">("");
  const [createMes, setCreateMes] = useState<number | "">("");
  const [createAnio, setCreateAnio] = useState<number | "">("");
  const [createSnapId, setCreateSnapId] = useState<number | "">("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const makeKey = (osId: number, mes: number, anio: number) => `${osId}-${mes}-${anio}`;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const liqs = await getJSON<Liquidacion[]>(LIQUIDACIONES_URL(pagoId));
      if (!Array.isArray(liqs) || liqs.length === 0) {
        setLiquidaciones([]); setRefacturaciones([]); setLoading(false); return;
      }
      setLiquidaciones(liqs);

      const seen = new Set<string>();
      const pairs: { osId: number; mes: number; anio: number; key: string }[] = [];
      for (const l of liqs) {
        const k = makeKey(l.obra_social_id, l.mes_periodo, l.anio_periodo);
        if (!seen.has(k)) { seen.add(k); pairs.push({ osId: l.obra_social_id, mes: l.mes_periodo, anio: l.anio_periodo, key: k }); }
      }

      const results = await Promise.allSettled(
        pairs.map((p) => getJSON<LoteAjuste[]>(LOTES_POR_OS_URL(p.osId, p.mes, p.anio)))
      );

      const normalMap: Record<string, LoteAjuste | null> = {};
      const allRefacs: LoteAjuste[] = [];
      pairs.forEach((p, i) => {
        const r = results[i];
        if (r.status === "fulfilled") {
          normalMap[p.key] = r.value.find((l) => l.tipo === "normal") ?? null;
          allRefacs.push(...r.value.filter((l) => l.tipo === "refacturacion"));
        } else {
          normalMap[p.key] = null;
        }
      });
      setLoteNormalMap(normalMap);
      setRefacturaciones(allRefacs);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las refacturaciones.");
    } finally {
      setLoading(false);
    }
  }, [pagoId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreateModal = (liq?: Liquidacion) => {
    setCreateError(null);
    setCreating(false);
    setCreateSnapId("");
    if (liq) {
      setCreateOsId(liq.obra_social_id);
      setCreateMes(liq.mes_periodo);
      setCreateAnio(liq.anio_periodo);
      const key = makeKey(liq.obra_social_id, liq.mes_periodo, liq.anio_periodo);
      const loteNormal = loteNormalMap[key];
      if (loteNormal) setCreateSnapId(loteNormal.id);
    } else {
      setCreateOsId(""); setCreateMes(""); setCreateAnio("");
    }
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!createOsId || !createMes || !createAnio) return;
    setCreating(true);
    setCreateError(null);
    try {
      const body: Record<string, any> = {
        obra_social_id: createOsId,
        mes_periodo: createMes,
        anio_periodo: createAnio,
      };
      if (createSnapId !== "") body.snap_origen_id = createSnapId;
      const created = await postJSON<LoteAjuste>(CREAR_REFAC_URL, body);
      setRefacturaciones((prev) => [...prev, created]);
      setCreateOpen(false);
      navigate(`/panel/liquidation/${pagoId}/lotes/${created.id}`);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setCreateError(typeof detail === "string" ? detail : e?.message ?? "Error al crear refacturación.");
    } finally {
      setCreating(false);
    }
  };

  // Unique liquidaciones for the OS selector in modal
  const seen2 = new Set<string>();
  const uniqueLiqs = liquidaciones.filter((l) => {
    const k = makeKey(l.obra_social_id, l.mes_periodo, l.anio_periodo);
    if (seen2.has(k)) return false;
    seen2.add(k);
    return true;
  });

  const columns: ColumnDef<LoteAjuste>[] = [
    { key: "id", header: "ID Lote" },
    { key: "obra_social_id", header: "Obra Social" },
    {
      key: "periodo",
      header: "Período",
      render: (r) => `${mesLabel(r.mes_periodo)} ${r.anio_periodo}`,
    },
    {
      key: "snap_origen_id",
      header: "Corrige lote #",
      render: (r) => r.snap_origen_id ? (
        <span
          style={{ color: "#1d4ed8", cursor: "pointer", textDecoration: "underline" }}
          onClick={(e) => { e.stopPropagation(); navigate(`/panel/liquidation/${pagoId}/lotes/${r.snap_origen_id}`); }}
        >
          #{r.snap_origen_id}
        </span>
      ) : "—",
    },
    {
      key: "estado",
      header: "Estado",
      render: (r) => (
        <>
          <span className={`${styles.badge} ${loteEstadoClass(r.estado)}`}>{loteEstadoLabel(r.estado)}</span>
          <span className={`${styles.badge} ${styles.tipoRefacturacion}`} style={{ marginLeft: 4 }}>Refacturación</span>
        </>
      ),
    },
    {
      key: "total_debitos",
      header: "Débitos",
      alignRight: true,
      render: (r) => <span className={styles.negative}>-${fmt(r.total_debitos)}</span>,
    },
    {
      key: "total_creditos",
      header: "Créditos",
      alignRight: true,
      render: (r) => <span className={styles.positive}>+${fmt(r.total_creditos)}</span>,
    },
    {
      key: "ajustes",
      header: "Ajustes",
      render: (r) => r.ajustes.length,
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (r) => (
        <Button
          size="sm"
          variant="primary"
          onClick={(e) => { e.stopPropagation(); navigate(`/panel/liquidation/${pagoId}/lotes/${r.id}`); }}
        >
          Ver
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.tabWrap}>
      <div className={styles.toolbar}>
        <span style={{ fontSize: 13, color: "#64748b" }}>
          {refacturaciones.length} refacturación{refacturaciones.length !== 1 ? "es" : ""}
        </span>
        <Button variant="primary" onClick={() => openCreateModal()} disabled={liquidaciones.length === 0}>
          + Nueva refacturación
        </Button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <SelectableTable
        rows={refacturaciones}
        columns={columns}
        actions={[]}
        emptyMessage="No hay refacturaciones. Creá una para corregir ajustes de un período anterior."
        loading={loading}
      />

      {/* Modal crear refacturación */}
      {createOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" onClick={() => !creating && setCreateOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Nueva Refacturación</h3>
              <button className={styles.modalClose} onClick={() => setCreateOpen(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className={styles.modalBody}>
              {createError && <div className={styles.errorInline}>{createError}</div>}
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Factura (OS + Período)</label>
                <select
                  className={styles.formSelect}
                  value={createOsId && createMes && createAnio ? `${createOsId}-${createMes}-${createAnio}` : ""}
                  onChange={(e) => {
                    if (!e.target.value) { setCreateOsId(""); setCreateMes(""); setCreateAnio(""); setCreateSnapId(""); return; }
                    const [osId, mes, anio] = e.target.value.split("-").map(Number);
                    setCreateOsId(osId); setCreateMes(mes); setCreateAnio(anio);
                    const key = makeKey(osId, mes, anio);
                    const loteNormal = loteNormalMap[key];
                    setCreateSnapId(loteNormal ? loteNormal.id : "");
                  }}
                  disabled={creating}
                >
                  <option value="">Seleccioná una factura…</option>
                  {uniqueLiqs.map((l) => (
                    <option key={`${l.obra_social_id}-${l.mes_periodo}-${l.anio_periodo}`} value={`${l.obra_social_id}-${l.mes_periodo}-${l.anio_periodo}`}>
                      OS {l.obra_social_id} — {mesLabel(l.mes_periodo)} {l.anio_periodo}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Corrige lote # (opcional)</label>
                <input
                  className={styles.formInput}
                  type="number"
                  min={1}
                  placeholder="ID del lote que corrige (dejar vacío si es la primera)"
                  value={createSnapId}
                  onChange={(e) => setCreateSnapId(e.target.value ? Number(e.target.value) : "")}
                  disabled={creating}
                />
                <span style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  Si se auto-completó, es el lote normal de esa OS+período.
                </span>
              </div>
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</Button>
              <Button variant="primary" onClick={handleCreate} disabled={creating || !createOsId || !createMes || !createAnio}>
                {creating ? "Creando…" : "Crear refacturación"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabRefacturaciones;

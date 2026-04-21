import React, { useCallback, useEffect, useState } from "react";
import { getJSON, postJSON, delJSON, patchJSON } from "../../../../lib/http";
import { useAppSnackbar } from "../../../../hooks/useAppSnackbar";
import Button from "../../../../components/atoms/Button/Button";
import Card from "../../../../components/atoms/Card/Card";
import styles from "./tabs.module.scss";
import { type Pago, type Descuento, fmt } from "../../types";

const DESCUENTOS_URL = "/api/descuentos";
const DESCUENTO_URL = (id: number) => `/api/descuentos/${id}`;
const GENERAR_URL = (pagoId: number, descId: number) =>
  `/api/deducciones/${pagoId}/colegio/bulk_generar_descuento/${descId}`;
const POR_PAGO_URL = (pagoId: number) => `/api/deducciones/por_pago/${pagoId}`;
const DESHACER_URL = (pagoId: number, descId: number) =>
  `/api/deducciones/${pagoId}/colegio/deshacer/${descId}`;

type GenResult = {
  generados: number;
  actualizados: number;
  cargado_total: number;
};
type DeshacerResult = {
  pago_id: number;
  eliminadas: number;
  monto_revertido: string;
};
type PorPagoResult = {
  existe: boolean;
  pago_id: number;
  total: number;
  monto_total: string;
  items: any[];
};

type Props = { pago: Pago; pagoId: number; onRefresh?: () => void };

const TabDeducciones: React.FC<Props> = ({ pago, pagoId, onRefresh }) => {
  const notify = useAppSnackbar();
  const [descuentos, setDescuentos] = useState<Descuento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deducciones ya generadas para este pago
  const [generadoInfo, setGeneradoInfo] = useState<PorPagoResult | null>(null);

  // Modal generar
  const [genTarget, setGenTarget] = useState<Descuento | null>(null);
  const [generating, setGenerating] = useState(false);

  // Modal deshacer
  const [deshacerTarget, setDeshacerTarget] = useState<Descuento | null>(null);
  const [deshaciendo, setDeshaciendo] = useState(false);

  // Editar descuento
  const [editTarget, setEditTarget] = useState<Descuento | null>(null);
  const [editPrecio, setEditPrecio] = useState("");
  const [editPorcentaje, setEditPorcentaje] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const loadGeneradoInfo = useCallback(async () => {
    try {
      const info = await getJSON<PorPagoResult>(POR_PAGO_URL(pagoId));
      setGeneradoInfo(info);
    } catch {
      // silencioso — no es crítico
    }
  }, [pagoId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getJSON<any[]>(DESCUENTOS_URL);
        setDescuentos(
          (data ?? []).map((d: any) => ({
            id: d.id,
            nombre: d.nombre ?? d.concepto ?? "",
            nro_colegio: d.nro_colegio ?? 0,
            precio: Number(d.precio ?? 0),
            porcentaje: Number(d.porcentaje ?? 0),
          })),
        );
      } catch (e: any) {
        setError(e?.message || "No se pudieron cargar los descuentos.");
      } finally {
        setLoading(false);
      }
    })();
    loadGeneradoInfo();
  }, [loadGeneradoInfo]);

  // Verifica si debe mostrarse el botón deshacer para este descuento
  const puedeDeshacerItem = (descId: number) =>
    generadoInfo?.items.some(
      (item) =>
        item.descuento_id === descId && item.generado_en_pago_id !== null,
    ) ?? false;

  const handleGenerar = async () => {
    if (!genTarget) return;
    setGenerating(true);
    try {
      const result = await postJSON<GenResult>(
        GENERAR_URL(pagoId, genTarget.id),
      );
      notify(
        `${result.generados} médicos procesados, ${result.actualizados} actualizados. Total: $${fmt(result.cargado_total)}`,
      );
      setGenTarget(null);
      await loadGeneradoInfo();
      onRefresh?.();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (e?.message ?? "Error al generar descuentos."),
        "error",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleDeshacer = async () => {
    if (!deshacerTarget) return;
    setDeshaciendo(true);
    try {
      const result = await delJSON<DeshacerResult>(
        DESHACER_URL(pagoId, deshacerTarget.id),
      );
      notify(
        `Se deshicieron ${result.eliminadas} deducción${result.eliminadas !== 1 ? "es" : ""}. Monto revertido: $${fmt(result.monto_revertido)}`,
      );
      setDeshacerTarget(null);
      await loadGeneradoInfo();
      onRefresh?.();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (e?.message ?? "Error al deshacer deducciones."),
        "error",
      );
    } finally {
      setDeshaciendo(false);
    }
  };

  const openEdit = (d: Descuento) => {
    setEditTarget(d);
    setEditPrecio(String(d.precio));
    setEditPorcentaje(String(d.porcentaje));
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const updated = await patchJSON<any>(DESCUENTO_URL(editTarget.id), {
        precio: Number(editPrecio),
        porcentaje: Number(editPorcentaje),
      });
      setDescuentos((prev) =>
        prev.map((d) =>
          d.id === editTarget.id
            ? {
                ...d,
                precio: Number(updated.precio ?? editPrecio),
                porcentaje: Number(updated.porcentaje ?? editPorcentaje),
              }
            : d,
        ),
      );
      setEditTarget(null);
      notify("Descuento guardado correctamente.");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (e?.message ?? "Error al guardar."),
        "error",
      );
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className={styles.tabWrap}>
      <div className={styles.toolbar}>
        <span style={{ fontSize: 13, color: "#64748b" }}>
          {descuentos.length} descuento{descuentos.length !== 1 ? "s" : ""}{" "}
          disponibles
        </span>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <Card className={styles.tableCard}>
        {loading ? (
          <div className={styles.loadingState}>Cargando descuentos…</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Nro. Colegio</th>
                  <th className={styles.numCell}>Precio fijo</th>
                  <th className={styles.numCell}>Porcentaje</th>
                  {pago.estado !== "C" && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {descuentos.length === 0 && (
                  <tr>
                    <td
                      colSpan={pago.estado !== "C" ? 6 : 5}
                      className={styles.emptyCell}
                    >
                      Sin descuentos disponibles.
                    </td>
                  </tr>
                )}
                {descuentos.map((d) => (
                  <tr key={d.id}>
                    <td>{d.id}</td>
                    <td>{d.nombre}</td>
                    <td>{d.nro_colegio}</td>
                    <td className={styles.numCell}>${fmt(d.precio)}</td>
                    <td className={styles.numCell}>{d.porcentaje}%</td>
                    {pago.estado !== "C" && (
                      <td>
                        <div className={styles.rowActions}>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setGenTarget(d)}
                          >
                            Generar
                          </Button>
                          {puedeDeshacerItem(d.id) && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setDeshacerTarget(d)}
                            >
                              Deshacer
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openEdit(d)}
                          >
                            Editar
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal generar */}
      {genTarget && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Generar Descuento</h3>
              <button
                className={styles.modalClose}
                onClick={() => setGenTarget(null)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {!generating && (
                <p>
                  ¿Generar el descuento <strong>"{genTarget.nombre}"</strong>{" "}
                  para el pago actual?
                  <br />
                  Se calculará el monto por cada médico.
                </p>
              )}
              {generating && <p style={{ color: "#64748b" }}>Generando…</p>}
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => setGenTarget(null)}
                disabled={generating}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleGenerar}
                disabled={generating}
              >
                {generating ? "Generando…" : "Sí, generar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal deshacer */}
      {deshacerTarget && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          onClick={() => !deshaciendo && setDeshacerTarget(null)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Deshacer descuentos generados</h3>
              <button
                className={styles.modalClose}
                onClick={() => !deshaciendo && setDeshacerTarget(null)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {!deshaciendo && (
                <>
                  <p>
                    ¿Deshacer las deducciones generadas para{" "}
                    <strong>"{deshacerTarget.nombre}"</strong>?
                  </p>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 12,
                      color: "#64748b",
                    }}
                  >
                    Solo se eliminan deducciones con origen automático y estado
                    "en pago". Las deducciones manuales no se modifican.
                  </p>
                </>
              )}
              {deshaciendo && <p style={{ color: "#64748b" }}>Deshaciendo…</p>}
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => setDeshacerTarget(null)}
                disabled={deshaciendo}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleDeshacer}
                disabled={deshaciendo}
              >
                {deshaciendo ? "Deshaciendo…" : "Sí, deshacer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar descuento */}
      {editTarget && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Editar Descuento</h3>
              <button
                className={styles.modalClose}
                onClick={() => setEditTarget(null)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ margin: 0, fontWeight: 600 }}>{editTarget.nombre}</p>
              <p
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  margin: "4px 0 12px",
                }}
              >
                Si porcentaje {">"} 0, tiene precedencia sobre el precio fijo.
              </p>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Precio fijo ($)</label>
                <input
                  className={styles.formSelect}
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPrecio}
                  onChange={(e) => setEditPrecio(e.target.value)}
                  disabled={editSaving}
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Porcentaje (%)</label>
                <input
                  className={styles.formSelect}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editPorcentaje}
                  onChange={(e) => setEditPorcentaje(e.target.value)}
                  disabled={editSaving}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => setEditTarget(null)}
                disabled={editSaving}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleEditSave}
                disabled={editSaving}
              >
                {editSaving ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabDeducciones;

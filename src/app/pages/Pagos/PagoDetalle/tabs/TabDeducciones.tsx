import React, { useCallback, useEffect, useState } from "react";
import { deshacerDescuento, editarConcepto, generarDescuento, getDeduccionesPorPago, listarConceptos, refrescarDeducciones } from "@/app/pages/Pagos/pagos.api";
import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import Button from "@/app/components/ui/Button/Button";
import Card from "@/app/components/ui/Card/Card";
import styles from "./tabs.module.scss";
import { type Pago, type Concepto, fmt } from "../../types";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import Dialogo from "@/app/components/ui/Dialogo/Dialogo";
import paleta from "@/app/styles/paleta.module.scss";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";

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
type ConceptoApi = {
  id: number;
  nombre?: string;
  concepto?: string;
  nro_colegio?: number | null;
  precio?: number | string;
  porcentaje?: number | string;
};
type RefrescarResult = {
  pago_id: number;
  manuales_enroladas: number;
};
type PorPagoResult = {
  existe: boolean;
  pago_id: number;
  total: number;
  monto_total: string;
  items: { descuento_id: number; generado_en_pago_id: number | null }[];
};

type Props = { pago: Pago; pagoId: number; onRefresh?: () => void };

const TabDeducciones: React.FC<Props> = ({ pago, pagoId, onRefresh }) => {
  const notify = useAppSnackbar();
  const [descuentos, setDescuentos] = useState<Concepto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deducciones ya generadas para este pago
  const [generadoInfo, setGeneradoInfo] = useState<PorPagoResult | null>(null);

  const [refrescando, setRefrescando] = useState(false);

  // Modal generar
  const [genTarget, setGenTarget] = useState<Concepto | null>(null);
  const [generating, setGenerating] = useState(false);

  // Modal deshacer
  const [deshacerTarget, setDeshacerTarget] = useState<Concepto | null>(null);
  const [deshaciendo, setDeshaciendo] = useState(false);

  // Editar descuento
  const [editTarget, setEditTarget] = useState<Concepto | null>(null);
  const [editPrecio, setEditPrecio] = useState("");
  const [editPorcentaje, setEditPorcentaje] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const loadGeneradoInfo = useCallback(async () => {
    try {
      const info = await getDeduccionesPorPago<PorPagoResult>(pagoId);
      setGeneradoInfo(info);
    } catch {
      // silencioso — no es crítico
    }
  }, [pagoId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listarConceptos<ConceptoApi>();
        setDescuentos(
          (data ?? [])
            // 9900 = «Saldo deudor de débitos»: lo crea el cierre del pago, no se genera a mano.
            .filter((d) => Number(d.nro_colegio) !== 9900)
            .map((d) => ({
              id: d.id,
              nombre: d.nombre ?? d.concepto ?? "",
              nro_colegio: d.nro_colegio ?? 0,
              precio: Number(d.precio ?? 0),
              porcentaje: Number(d.porcentaje ?? 0),
            })),
        );
      } catch (e) {
        const err = comoErrorApi(e);
        setError(err?.message || "No se pudieron cargar los descuentos.");
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

  const handleRefrescar = async () => {
    setRefrescando(true);
    try {
      const r = await refrescarDeducciones<RefrescarResult>(pagoId);
      notify(
        r.manuales_enroladas
          ? `Entraron al pago ${r.manuales_enroladas} cuota${r.manuales_enroladas !== 1 ? "s" : ""} pendiente${r.manuales_enroladas !== 1 ? "s" : ""}.`
          : "Deducciones al día. No había cuotas nuevas para este pago.",
      );
      await loadGeneradoInfo();
      onRefresh?.();
    } catch (e) {
      const err = comoErrorApi(e);
      const detail = err?.response?.data?.detail;
      notify(
        typeof detail === "string" ? detail : (err?.message ?? "No se pudo refrescar."),
        "error",
      );
    } finally {
      setRefrescando(false);
    }
  };

  const handleGenerar = async () => {
    if (!genTarget) return;
    setGenerating(true);
    try {
      const result = await generarDescuento<GenResult>(pagoId, genTarget.id);
      notify(
        `${result.generados} médicos procesados, ${result.actualizados} actualizados. Total: $${fmt(result.cargado_total)}`,
      );
      setGenTarget(null);
      await loadGeneradoInfo();
      onRefresh?.();
    } catch (e) {
      const err = comoErrorApi(e);
      const detail = err?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (err?.message ?? "Error al generar descuentos."),
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
      const result = await deshacerDescuento<DeshacerResult>(pagoId, deshacerTarget.id);
      notify(
        `Se deshicieron ${result.eliminadas} deducción${result.eliminadas !== 1 ? "es" : ""}. Monto revertido: $${fmt(result.monto_revertido)}`,
      );
      setDeshacerTarget(null);
      await loadGeneradoInfo();
      onRefresh?.();
    } catch (e) {
      const err = comoErrorApi(e);
      const detail = err?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (err?.message ?? "Error al deshacer deducciones."),
        "error",
      );
    } finally {
      setDeshaciendo(false);
    }
  };

  const openEdit = (d: Concepto) => {
    setEditTarget(d);
    setEditPrecio(String(d.precio));
    setEditPorcentaje(String(d.porcentaje));
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const updated = await editarConcepto<Pick<ConceptoApi, "precio" | "porcentaje">>(editTarget.id, {
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
      notify("Concepto guardado correctamente.");
    } catch (e) {
      const err = comoErrorApi(e);
      const detail = err?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (err?.message ?? "Error al guardar."),
        "error",
      );
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className={styles.tabWrap}>
      <div className={styles.toolbar}>
        <span style={{ fontSize: 13, color: paleta.gray500 }}>
          {descuentos.length} descuento{descuentos.length !== 1 ? "s" : ""}{" "}
          disponibles
        </span>
        {pago.estado === "A" && (
          <div className={styles.toolbarLeft}>
            <Button variant="secondary" onClick={handleRefrescar} disabled={refrescando}>
              {refrescando ? "Refrescando…" : "Refrescar deducciones"}
            </Button>
          </div>
        )}
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {pago.estado === "A" && !!pago.deducciones_dirty && (
        <div className={styles.errorBanner} role="status">
          Las deducciones cambiaron y la vista previa quedó vieja. Tocá «Refrescar deducciones» para actualizarla.
        </div>
      )}

      <Card className={styles.tableCard}>
        {loading ? (
          <div className={styles.loadingState}>Cargando descuentos…</div>
        ) : (
          <div className={styles.tableWrap}>
            <Tabla className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Nro. Colegio</th>
                  <th className={styles.numCell}>Precio fijo</th>
                  <th className={styles.numCell}>Porcentaje</th>
                  {pago.estado === "A" && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {descuentos.length === 0 && (
                  <tr>
                    <td
                      colSpan={pago.estado === "A" ? 6 : 5}
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
                    {pago.estado === "A" && (
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
            </Tabla>
          </div>
        )}
      </Card>

      {/* Modal generar */}
      {genTarget && (
        <Dialogo
          titulo="Generar concepto"
          onClose={() => setGenTarget(null)}
          acciones={
            <>
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
            </>
          }
        >
              {!generating && (
                <p>
                  ¿Generar el descuento <strong>"{genTarget.nombre}"</strong>{" "}
                  para el pago actual?
                  <br />
                  Se calculará el monto por cada médico.
                </p>
              )}
              {generating && <p style={{ color: paleta.gray500 }}>Generando…</p>}
            </Dialogo>
      )}

      {/* Modal deshacer */}
      {deshacerTarget && (
        <Dialogo
          titulo="Deshacer descuentos generados"
          peligro
          onClose={() => !deshaciendo && setDeshacerTarget(null)}
          acciones={
            <>
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
            </>
          }
        >
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
                      color: paleta.gray500,
                    }}
                  >
                    Solo se eliminan deducciones con origen automático y estado
                    "en pago". Las deducciones manuales no se modifican.
                  </p>
                </>
              )}
              {deshaciendo && <p style={{ color: paleta.gray500 }}>Deshaciendo…</p>}
            </Dialogo>
      )}

      {/* Modal editar descuento */}
      {editTarget && (
        <Dialogo
          titulo="Editar concepto"
          onClose={() => setEditTarget(null)}
          acciones={
            <>
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
            </>
          }
        >
              <p style={{ margin: 0, fontWeight: 600 }}>{editTarget.nombre}</p>
              <p
                style={{
                  fontSize: 12,
                  color: paleta.gray500,
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
            </Dialogo>
      )}
    </div>
  );
};

export default TabDeducciones;

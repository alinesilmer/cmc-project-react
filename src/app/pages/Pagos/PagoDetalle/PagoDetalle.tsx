import React, { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { cerrarPago, editarPago, getPago, marcarPagado, reabrirPago } from "@/app/pages/Pagos/pagos.api";
import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import BackButton from "@/app/components/ui/BackButton/BackButton";
import Button from "@/app/components/ui/Button/Button";
import lq from "../Liquidacion.module.scss";
import Franja, { Solapa } from "@/app/components/layout/Franja/Franja";
import Dialogo, { DialogoCampo } from "@/app/components/ui/Dialogo/Dialogo";
import { type Pago, fmt, mesLabel } from "../types";

import TabFacturas from "./tabs/TabFacturas";
import TabDeducciones from "./tabs/TabDeducciones";
import TabResumen from "./tabs/TabResumen";
import TabRecibos from "./tabs/TabRecibos";
import TabExportables from "./tabs/TabExportables";
import { BadgeCheck, DollarSign, Lock, LockOpen, Pencil } from "lucide-react";
import { comoErrorApi, detalleDeError, detalleObjeto } from "@/app/shared/lib/httpErrors";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

type Tab =
  | "preview"
  | "facturas"
  | "deducciones"
  | "recibos"
  | "exportables";
const TABS: {
  key: Tab;
  label: string;
  disabledWhen?: (p: import("../types").Pago | null) => boolean;
}[] = [
  { key: "preview", label: "Vista previa" },
  { key: "facturas", label: "Facturas" },
  { key: "deducciones", label: "Deducciones" },
  { key: "recibos", label: "Recibos" },
  {
    key: "exportables",
    label: "Exportables",
    disabledWhen: (p) => p?.estado === "A",
  },
];

/** Un renglón de la cuenta del encabezado: el signo (+ o −) queda en la misma línea que el importe y lo colorea. */
const CuentaItem: React.FC<{ rotulo: string; valor: string; signo?: "+" | "−" }> = ({ rotulo, valor, signo }) => (
  <div className={lq.cabPagoItem}>
    {signo && <i className={lq.cabPagoOp} aria-hidden="true">{signo}</i>}
    <span>{rotulo}</span>
    <b className={signo === "−" ? lq.menos : signo === "+" ? lq.mas : undefined}>{valor}</b>
  </div>
);

const PagoDetalle: React.FC = () => {
  const { pagoId } = useParams<{ pagoId: string }>();
  const navigate = useNavigate();
  const notify = useAppSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();

  // Los enlaces viejos a «Por médico» caen en «Recibos»: ahora es una sola solapa.
  const tabParam = searchParams.get("tab");
  const activeTab = ((tabParam === "medico" ? "recibos" : tabParam) as Tab | null) ?? "preview";
  const setTab = (tab: Tab) => setSearchParams({ tab });

  const [pago, setPago] = useState<Pago | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cerrar / Reabrir
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "cerrar" | "reabrir" | "pagar" | null
  >(null);

  // Editar descripción
  const [editDescOpen, setEditDescOpen] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);

  const fetchPago = useCallback(async () => {
    if (!pagoId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPago(pagoId);
      setPago(data);
    } catch (e) {
      const err = comoErrorApi(e);
      if (err?.response?.status === 404) {
        navigate("/panel/liquidation", { replace: true });
      } else {
        setError(err?.message || "No se pudo cargar el pago.");
      }
    } finally {
      setLoading(false);
    }
  }, [pagoId, navigate]);

  useEffect(() => {
    fetchPago();
  }, [fetchPago]);

  const handleAction = async () => {
    if (!pagoId || !confirmAction) return;
    setActionBusy(true);
    try {
      const accion = { cerrar: cerrarPago, pagar: marcarPagado, reabrir: reabrirPago }[confirmAction];
      const updated = await accion(pagoId);
      setPago(updated);
      notify(
        confirmAction === "cerrar"
          ? "Pago cerrado correctamente."
          : confirmAction === "pagar"
            ? "Pago marcado como pagado. Los recibos quedaron emitidos."
            : "Pago reabierto correctamente.",
      );
      setConfirmAction(null);
    } catch (e) {
      const conflicto = detalleObjeto(e);
      if (conflicto?.pago_id) {
        notify(
          `${conflicto.message ?? "Conflicto"} Ver pago #${conflicto.pago_id}.`,
          "error",
        );
      } else {
        notify(
          detalleDeError(e, "Error al cambiar estado."),
          "error",
        );
      }
    } finally {
      setActionBusy(false);
    }
  };

  const openEditDesc = () => {
    setEditDesc(pago?.descripcion ?? "");
    setEditDescOpen(true);
  };

  const handleSaveDesc = async () => {
    if (!pagoId) return;
    setSavingDesc(true);
    try {
      const updated = await editarPago(pagoId, {
        descripcion: editDesc.trim() || null,
      });
      setPago(updated);
      setEditDescOpen(false);
      notify("Descripción guardada.");
    } catch (e) {
      notify(
        detalleDeError(e, "Error al guardar."),
        "error",
      );
    } finally {
      setSavingDesc(false);
    }
  };

  const periodTitle = pago ? `${mesLabel(pago.mes)} ${pago.anio}` : "—";
  // Con signo: a favor de los socios (+) o en contra (−).
  const compensaciones = Number(pago?.total_compensaciones ?? 0);

  const renderActionButton = () => {
    if (!pago) return null;
    if (pago.estado === "A") {
      return (
        <Button
          variant="primary"
          size="md"
          leftIcon={<Lock size={18} aria-hidden="true" />}
          onClick={() => setConfirmAction("cerrar")}
          disabled={actionBusy}
        >
          Cerrar pago
        </Button>
      );
    }
    // Pagado: terminal, sin acciones.
    if (pago.estado === "P") return null;
    // Cerrado: se puede reabrir mientras no haya recibos emitidos, o marcar como pagado.
    return (
      <>
        <Button
          variant="ghost"
          size="md"
          leftIcon={<LockOpen size={18} aria-hidden="true" />}
          onClick={() => setConfirmAction("reabrir")}
          disabled={actionBusy}
        >
          Reabrir pago
        </Button>
        <Button
          variant="primary"
          size="md"
          leftIcon={<BadgeCheck size={18} aria-hidden="true" />}
          onClick={() => setConfirmAction("pagar")}
          disabled={actionBusy}
        >
          Marcar como pagado
        </Button>
      </>
    );
  };

  if (loading) {
    return (
      <div className={lq.pagina}>
        <div className={lq.cargando}>Cargando pago…</div>
      </div>
    );
  }

  // «Exportables» sólo existe con el pago cerrado: no se ofrece antes.
  const tabs = TABS.filter((t) => !(t.disabledWhen?.(pago) ?? false));

  return (
    <div className={lq.pagina}>
      <Franja titulo={`Pago ${periodTitle}`} icono={DollarSign}>
        {tabs.map((t) => (
          <Solapa key={t.key} activa={activeTab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </Solapa>
        ))}
      </Franja>

      <BackButton label="Volver al listado" to="/panel/liquidation" />

      {pago && (
        <div className={lq.cabPago}>
          {/* Arriba, lo que se hace: estado, descripción y botones. */}
          <div className={lq.cabPagoArriba}>
            <span className={`${lq.estado} ${pago.estado === "A" ? lq.abierto : pago.estado === "P" ? lq.aplicado : lq.cerrado}`}>
              {pago.estado === "A" ? "Abierto" : pago.estado === "P" ? "Pagado" : "Cerrado"}
            </span>
            {(pago.descripcion || pago.estado === "A") && (
              <span className={lq.tiraTexto}>
                {pago.descripcion ?? <span className={lq.tenue}>Sin descripción</span>}
                {pago.estado === "A" && (
                  <BotonPlano
                    type="button"
                    className={lq.botonIcono}
                    onClick={openEditDesc}
                    title="Editar descripción"
                    aria-label="Editar descripción"
                  >
                    <Pencil size={15} aria-hidden="true" />
                  </BotonPlano>
                )}
              </span>
            )}
            <div className={lq.cabPagoAcciones}>
              {pago.estado === "P" ? <span className={lq.tiraTexto}>Recibos emitidos</span> : renderActionButton()}
            </div>
          </div>

          {/* Abajo, lo que se ve: la cuenta de izquierda a derecha, con el total al final. */}
          <div className={lq.cabPagoCuenta}>
            <CuentaItem rotulo="Bruto" valor={`$${fmt(pago.total_bruto)}`} />
            <CuentaItem rotulo="Débitos de obras sociales" valor={`$${fmt(pago.total_debitos_os ?? pago.total_debitos)}`} signo="−" />
            <CuentaItem rotulo="Créditos" valor={`$${fmt(pago.total_creditos)}`} signo="+" />
            <CuentaItem
              rotulo="Compensaciones"
              valor={`$${fmt(Math.abs(compensaciones))}`}
              signo={compensaciones < 0 ? "−" : "+"}
            />
            <CuentaItem rotulo="Deducciones" valor={`$${fmt(pago.total_deduccion)}`} signo="−" />
            <div className={lq.cabPagoTotal}>
              <span>= Total a pagar</span>
              <b>${fmt(pago.total_a_pagar ?? pago.total_neto)}</b>
            </div>
          </div>
        </div>
      )}

      {error && <div className={lq.error} role="alert">{error}</div>}

      {pago && pagoId && (
        <>
          {activeTab === "facturas" && (
            <TabFacturas
              pago={pago}
              pagoId={Number(pagoId)}
              onPagoChange={setPago}
              onRefresh={fetchPago}
            />
          )}
          {activeTab === "deducciones" && (
            <TabDeducciones
              pago={pago}
              pagoId={Number(pagoId)}
              onRefresh={fetchPago}
            />
          )}
          {activeTab === "preview" && (
            <TabResumen pagoId={Number(pagoId)} />
          )}
          {activeTab === "recibos" && (
            <TabRecibos pago={pago} pagoId={Number(pagoId)} />
          )}
          {activeTab === "exportables" && (
            <TabExportables pago={pago} pagoId={Number(pagoId)} />
          )}
        </>
      )}

      {confirmAction && (
        <Dialogo
          titulo={
            confirmAction === "cerrar"
              ? "Cerrar pago"
              : confirmAction === "pagar"
                ? "Marcar como pagado"
                : "Reabrir pago"
          }
          icono={confirmAction === "cerrar" ? Lock : confirmAction === "pagar" ? BadgeCheck : LockOpen}
          onClose={actionBusy ? undefined : () => setConfirmAction(null)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setConfirmAction(null)} disabled={actionBusy}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleAction} disabled={actionBusy}>
                {actionBusy
                  ? "Procesando…"
                  : confirmAction === "cerrar"
                    ? "Sí, cerrar"
                    : confirmAction === "pagar"
                      ? "Sí, marcar como pagado"
                      : "Sí, reabrir"}
              </Button>
            </>
          }
        >
          <p>
            {confirmAction === "cerrar"
              ? `¿Cerrar el pago de ${periodTitle}?`
              : confirmAction === "pagar"
                ? `¿Marcar como pagado el pago de ${periodTitle}? Se emiten los recibos de todos los médicos y el pago ya no se puede reabrir.`
                : `¿Reabrir el pago de ${periodTitle}?`}
          </p>
        </Dialogo>
      )}

      {editDescOpen && (
        <Dialogo
          titulo="Editar descripción"
          icono={Pencil}
          onClose={savingDesc ? undefined : () => setEditDescOpen(false)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setEditDescOpen(false)} disabled={savingDesc}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSaveDesc} disabled={savingDesc}>
                {savingDesc ? "Guardando…" : "Guardar"}
              </Button>
            </>
          }
        >
          <DialogoCampo rotulo="Descripción" htmlFor="pago-descripcion">
            <input
              id="pago-descripcion"
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              disabled={savingDesc}
              placeholder="Descripción del pago"
            />
          </DialogoCampo>
        </Dialogo>
      )}
    </div>
  );
};

export default PagoDetalle;

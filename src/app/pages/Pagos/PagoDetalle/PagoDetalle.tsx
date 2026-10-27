import React, { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { cerrarPago, editarPago, getPago, reabrirPago } from "@/app/pages/Pagos/pagos.api";
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
import TabVistaPreviaPago from "./tabs/TabVistaPreviaPago";
import TabRecibos from "./tabs/TabRecibos";
import TabExportables from "./tabs/TabExportables";
import { DollarSign, Lock, LockOpen, Pencil } from "lucide-react";
import { comoErrorApi, detalleDeError, detalleObjeto } from "@/app/shared/lib/httpErrors";

type Tab =
  | "facturas"
  | "deducciones"
  | "preview"
  | "medico"
  | "recibos"
  | "exportables";
const TABS: {
  key: Tab;
  label: string;
  disabledWhen?: (p: import("../types").Pago | null) => boolean;
}[] = [
  { key: "facturas", label: "Facturas" },
  { key: "deducciones", label: "Deducciones" },
  { key: "preview", label: "Vista previa" },
  { key: "medico", label: "Por médico" },
  { key: "recibos", label: "Recibos" },
  {
    key: "exportables",
    label: "Exportables",
    disabledWhen: (p) => p?.estado !== "C",
  },
];

const PagoDetalle: React.FC = () => {
  const { pagoId } = useParams<{ pagoId: string }>();
  const navigate = useNavigate();
  const notify = useAppSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get("tab") as Tab) ?? "facturas";
  const setTab = (tab: Tab) => setSearchParams({ tab });

  const [pago, setPago] = useState<Pago | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cerrar / Reabrir
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "cerrar" | "reabrir" | null
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
      const updated = await (confirmAction === "cerrar" ? cerrarPago(pagoId) : reabrirPago(pagoId));
      setPago(updated);
      notify(
        confirmAction === "cerrar"
          ? "Pago cerrado correctamente."
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
    // Estado C: botón reabrir (si hay recibos, el backend devolverá 409)
    return (
      <Button
        variant="ghost"
        size="md"
        leftIcon={<LockOpen size={18} aria-hidden="true" />}
        onClick={() => setConfirmAction("reabrir")}
        disabled={actionBusy}
      >
        Reabrir pago
      </Button>
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

      <BackButton label="Volver" to="/panel/liquidation" />

      {pago && (
        <div className={lq.tira}>
          <span className={`${lq.estado} ${pago.estado === "A" ? lq.abierto : lq.cerrado}`}>
            {pago.estado === "A" ? "Abierto" : "Cerrado"}
          </span>
          {(pago.descripcion || pago.estado === "A") && (
            <span className={lq.tiraTexto}>
              {pago.descripcion ?? <span className={lq.tenue}>Sin descripción</span>}
              {pago.estado === "A" && (
                <button
                  type="button"
                  className={lq.botonIcono}
                  onClick={openEditDesc}
                  title="Editar descripción"
                  aria-label="Editar descripción"
                >
                  <Pencil size={15} aria-hidden="true" />
                </button>
              )}
            </span>
          )}
          <div className={lq.tiraDato}>
            <span>Bruto</span>
            <b>${fmt(pago.total_bruto)}</b>
          </div>
          <div className={lq.tiraDato}>
            <span>Débitos</span>
            <b className={lq.menos}>-${fmt(pago.total_debitos)}</b>
          </div>
          <div className={lq.tiraDato}>
            <span>Créditos</span>
            <b className={lq.mas}>+${fmt(pago.total_creditos)}</b>
          </div>
          <div className={lq.tiraDato}>
            <span>Deducciones</span>
            <b className={lq.menos}>-${fmt(pago.total_deduccion)}</b>
          </div>
          <div className={`${lq.tiraDato} ${lq.tiraNeto}`}>
            <span>Neto</span>
            <b>${fmt(pago.total_neto)}</b>
          </div>
          <div className={lq.tiraAccion}>{renderActionButton()}</div>
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
          {activeTab === "medico" && (
            <TabVistaPreviaPago pago={pago} pagoId={Number(pagoId)} />
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
          titulo={confirmAction === "cerrar" ? "Cerrar pago" : "Reabrir pago"}
          icono={confirmAction === "cerrar" ? Lock : LockOpen}
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
                    : "Sí, reabrir"}
              </Button>
            </>
          }
        >
          <p>
            {confirmAction === "cerrar"
              ? `¿Cerrar el pago de ${periodTitle}?`
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

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import { AlertTriangle, Check, RotateCcw, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import Button from "@/app/components/ui/Button/Button";
import { useNotify } from "../../hooks/useNotify";
import {
  enviarFormularioCambios,
  getCamposEditables,
} from "../SolicitudesCambio/solicitudesCambio.api";
import styles from "./ReportarCambioModal.module.scss";

const MAX_MENSAJE = 2000;

type Props = {
  open: boolean;
  onClose: () => void;
  onEnviado?: () => void;
};

/** Formulario completo de corrección de datos. */
const FormularioCambiosModal: React.FC<Props> = ({ open, onClose, onEnviado }) => {
  const notify = useNotify();

  const [valores, setValores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const campos = useQuery({
    queryKey: ["campos-editables"],
    queryFn: getCamposEditables,
    enabled: open,
    staleTime: 10 * 60 * 1000,
  });

  // Al abrir (y cuando llegan los campos) el formulario arranca con lo que hay hoy en el legajo: el médico corrige sobre lo real.
  useEffect(() => {
    if (!open || !campos.data) return;
    const inicial: Record<string, string> = {};
    for (const c of campos.data) inicial[c.campo] = c.valor_actual ?? "";
    setValores(inicial);
    setMensaje("");
    setError(null);
  }, [open, campos.data]);

  /** Qué cambió respecto del legajo. Es lo que se le muestra antes de enviar. */
  const cambiados = useMemo(() => {
    if (!campos.data) return [];
    return campos.data.filter(
      (c) => (valores[c.campo] ?? "").trim() !== (c.valor_actual ?? "").trim()
    );
  }, [campos.data, valores]);

  const restaurar = (campo: string) => {
    const original = campos.data?.find((c) => c.campo === campo)?.valor_actual ?? "";
    setValores((v) => ({ ...v, [campo]: original }));
  };

  async function enviar() {
    if (!cambiados.length) {
      setError("No modificaste ningún dato.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      // Se mandan sólo los campos tocados: el backend igual descarta lo que no cambió, pero así el request dice exactamente lo que el socio pidió.
      const soloCambios: Record<string, string> = {};
      for (const c of cambiados) soloCambios[c.campo] = (valores[c.campo] ?? "").trim();

      await enviarFormularioCambios({ valores: soloCambios, mensaje: mensaje.trim() });
      notify.success(
        "Pedido enviado",
        "El Colegio va a revisar los cambios y te va a responder."
      );
      onEnviado?.();
      onClose();
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response
        ?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "No se pudo enviar el pedido. Intentá de nuevo en un momento."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={enviando ? undefined : onClose}
      maxWidth={false}
      slotProps={{ paper: { className: styles.modal, style: { width: 800, maxWidth: "calc(100% - 1.5rem)" } } }}
    >
      <div className={styles.cabeza}>
        <h2 className={styles.titulo}>Corregir mis datos</h2>
        <button type="button" className={styles.cerrar} onClick={onClose} disabled={enviando} aria-label="Cerrar">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

        <div className={styles.form}>
          <p className={styles.note}>
            Editá lo que esté mal y enviá el formulario. Esto no cambia tu legajo
            al instante: queda un pedido que revisa el Colegio y, si lo aprueba,
            los cambios se aplican solos.
          </p>

          {campos.isLoading ? (
            <p className={styles.hint}>Cargando tus datos…</p>
          ) : campos.isError ? (
            <div className={styles.error}>
              <AlertTriangle size={14} /> No se pudieron cargar tus datos.
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {(campos.data ?? []).map((c) => {
                  const cambiado = cambiados.some((x) => x.campo === c.campo);
                  return (
                    <div key={c.campo} className={styles.field}>
                      <label className={styles.label} htmlFor={`f-${c.campo}`}>
                        {c.etiqueta}
                        {cambiado && (
                          <button
                            type="button"
                            className={styles.restaurar}
                            onClick={() => restaurar(c.campo)}
                            title="Volver al valor actual"
                          >
                            <RotateCcw size={12} /> deshacer
                          </button>
                        )}
                      </label>
                      <input
                        id={`f-${c.campo}`}
                        className={`${styles.input} ${cambiado ? styles.inputCambiado : ""}`}
                        value={valores[c.campo] ?? ""}
                        maxLength={255}
                        onChange={(e) =>
                          setValores((v) => ({ ...v, [c.campo]: e.target.value }))
                        }
                        disabled={enviando}
                        placeholder="Sin cargar"
                      />
                      {cambiado && (
                        <span className={styles.antes}>
                          Antes: {c.valor_actual?.trim() || "sin cargar"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="f-mensaje">
                  Comentario para el Colegio (opcional)
                </label>
                <textarea
                  id="f-mensaje"
                  className={styles.textarea}
                  value={mensaje}
                  maxLength={MAX_MENSAJE}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Si querés aclarar algo, escribilo acá."
                  disabled={enviando}
                />
              </div>

              <p className={styles.resumen}>
                {cambiados.length === 0 ? (
                  "Todavía no modificaste nada."
                ) : (
                  <>
                    <Check size={14} /> {cambiados.length}{" "}
                    {cambiados.length === 1 ? "dato modificado" : "datos modificados"}:{" "}
                    {cambiados.map((c) => c.etiqueta).join(", ")}
                  </>
                )}
              </p>
            </>
          )}

          {error && (
            <div className={styles.error}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div className={styles.actions}>
            <Button variant="ghost" onClick={onClose} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              onClick={enviar}
              disabled={enviando || cambiados.length === 0 || campos.isLoading}
            >
              {enviando ? "Enviando…" : "Enviar pedido"}
            </Button>
          </div>
        </div>
    </Dialog>
  );
};

export default FormularioCambiosModal;

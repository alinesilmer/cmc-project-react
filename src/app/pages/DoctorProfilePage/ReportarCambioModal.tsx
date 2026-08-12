"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "rsuite";
import "rsuite/Modal/styles/index.css";
import { AlertTriangle } from "lucide-react";

import Button from "../../components/atoms/Button/Button";
import { useNotify } from "../../hooks/useNotify";
import { crearSolicitudCambioPropia } from "../SolicitudesCambio/solicitudesCambio.api";
import styles from "./ReportarCambioModal.module.scss";

// Topes del backend (SolicitudCambioCrearIn). Se validan también acá para que el
// socio vea el error mientras escribe y no después de un 422.
const MAX_VALOR = 255;
const MAX_MENSAJE = 2000;

export type ReportTarget = {
  /** Valor que se guarda en la columna `campo` — uno de CAMPOS_CONOCIDOS. */
  campo: string;
  /** Etiqueta visible ("Tel. particular"), sólo para la UI. */
  label: string;
  /** Lo que hoy figura en el legajo. Se manda para que el admin compare. */
  valorActual?: string | null;
};

type Props = {
  target: ReportTarget | null;
  onClose: () => void;
  /** Se dispara tras un alta exitosa (para refrescar el historial). */
  onCreated?: () => void;
};

/**
 * Reclamo de corrección de un dato del legajo. No edita nada: crea una
 * solicitud 'pendiente' que un admin aprueba o rechaza desde su bandeja, y
 * recién ahí aplica el cambio a mano. Por eso el texto habla de "pedido".
 */
const ReportarCambioModal: React.FC<Props> = ({ target, onClose, onCreated }) => {
  const notify = useNotify();

  const [valorPropuesto, setValorPropuesto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada apertura arranca limpia: si no, el texto del reclamo anterior queda
  // pegado al siguiente campo que el socio reporte.
  useEffect(() => {
    if (target) {
      setValorPropuesto("");
      setMensaje("");
      setError(null);
    }
  }, [target]);

  const open = target != null;

  async function handleSubmit() {
    if (!target) return;

    const msg = mensaje.trim();
    if (!msg) {
      setError("Contanos qué está mal para que podamos corregirlo.");
      return;
    }
    if (msg.length > MAX_MENSAJE) {
      setError(`El mensaje no puede superar los ${MAX_MENSAJE} caracteres.`);
      return;
    }
    if (valorPropuesto.trim().length > MAX_VALOR) {
      setError(`El valor correcto no puede superar los ${MAX_VALOR} caracteres.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await crearSolicitudCambioPropia({
        campo: target.campo,
        valor_actual: target.valorActual?.trim() || null,
        valor_propuesto: valorPropuesto.trim() || null,
        mensaje: msg,
      });
      notify.success(
        "Pedido enviado",
        "El Colegio lo va a revisar y te va a responder."
      );
      onCreated?.();
      onClose();
    } catch (e: unknown) {
      // 429 = tope de pendientes por socio; el backend manda el texto listo.
      const detail = (e as { response?: { data?: { detail?: unknown } } })
        ?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "No se pudo enviar el pedido. Intentá de nuevo en un momento."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      size="sm"
      className={styles.modal}
    >
      <Modal.Header>
        <Modal.Title>Reportar un dato incorrecto</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className={styles.form}>
          <p className={styles.note}>
            Esto no modifica tu legajo: envía un pedido al Colegio. Un
            administrador lo revisa y aplica el cambio si corresponde.
          </p>

          <div className={styles.field}>
            <span className={styles.label}>Dato</span>
            <div className={styles.current}>{target?.label ?? "—"}</div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Figura actualmente</span>
            <div className={styles.current}>
              {target?.valorActual?.trim() || "Sin cargar"}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="valor-propuesto">
              ¿Cuál es el valor correcto?
            </label>
            <input
              id="valor-propuesto"
              className={styles.input}
              value={valorPropuesto}
              maxLength={MAX_VALOR}
              onChange={(e) => setValorPropuesto(e.target.value)}
              placeholder="Opcional — si lo sabés, escribilo acá"
              disabled={saving}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="mensaje-reclamo">
              Detalle
            </label>
            <textarea
              id="mensaje-reclamo"
              className={styles.textarea}
              value={mensaje}
              maxLength={MAX_MENSAJE}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Contanos qué está mal."
              disabled={saving}
            />
            <span className={styles.counter}>
              {mensaje.length}/{MAX_MENSAJE}
            </span>
          </div>

          {error && (
            <div className={styles.error}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div className={styles.actions}>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Enviando…" : "Enviar pedido"}
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default ReportarCambioModal;

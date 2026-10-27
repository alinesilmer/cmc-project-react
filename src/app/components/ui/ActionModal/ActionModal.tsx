"use client";

import React from "react";
import Dialog from "@mui/material/Dialog";
import Zoom from "@mui/material/Zoom";
import { X } from "lucide-react";
import Button from "@/app/components/ui/Button/Button";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import s from "./ActionModal.module.scss";

type ActionModalProps = {
  open: boolean;
  title: React.ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "full";
  onClose: () => void;
  onConfirm?: () => Promise<void> | void;
  confirmText?: string;
  cancelText?: string;
  confirmDisabled?: boolean;
  children: React.ReactNode;
};

const ANIM_MS = 120;

// Anchos en px de cada tamaño.
const ANCHOS = { xs: 400, sm: 600, md: 800, lg: 968 } as const;

const ActionModal: React.FC<ActionModalProps> = ({
  open,
  title,
  onClose,
  onConfirm,
  size = "sm",
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  confirmDisabled = false,
  children,
}) => {
  // `visible` baja primero para animar la salida; `onClose` recién se llama al terminar.
  const [visible, setVisible] = React.useState(open);
  const [busy, setBusy] = React.useState(false);
  const idTitulo = React.useId();

  React.useEffect(() => {
    setVisible(open);
  }, [open]);

  const handleClose = () => {
    if (busy) return; // no cerrar si está confirmando
    setVisible(false);
  };

  const handleConfirm = async () => {
    if (!onConfirm) return handleClose();
    try {
      setBusy(true);
      await onConfirm(); // si falla, queda abierto
      setVisible(false); // éxito => cerrar con anim
    } catch {
      // el padre puede mostrar el error; dejamos abierto
    } finally {
      setBusy(false);
    }
  };

  const sinMovimiento =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <Dialog
      open={visible}
      onClose={handleClose}
      maxWidth={false}
      fullScreen={size === "full"}
      slots={{ transition: Zoom }}
      transitionDuration={sinMovimiento ? 0 : ANIM_MS}
      slotProps={{
        transition: { onExited: () => onClose() },
        paper: {
          className: s.panel,
          // Sin la capa de elevación con que MUI aclara el panel en oscuro: el fondo es el del tema.
          style: {
            backgroundImage: "none",
            ...(size === "full" ? {} : { width: ANCHOS[size], maxWidth: "calc(100% - 1.5rem)" }),
          },
          "aria-labelledby": idTitulo,
        },
      }}
    >
      <div className={s.cabecera}>
        <h2 id={idTitulo} className={s.titulo}>
          {title}
        </h2>
        <button type="button" className={s.cerrar} onClick={handleClose} disabled={busy} aria-label="Cerrar">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className={s.cuerpo}>{children}</div>

      <div className={s.pie}>
        <Button variant="ghost" onClick={handleClose} disabled={busy}>
          {cancelText}
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={confirmDisabled || busy}
          style={{ marginLeft: 8, position: "relative" }}
        >
          {busy && <Cargando size={14} className={s.procesando} />}
          <span style={{ paddingLeft: busy ? 16 : 0 }}>{busy ? "Procesando…" : confirmText}</span>
        </Button>
      </div>
    </Dialog>
  );
};

export default ActionModal;

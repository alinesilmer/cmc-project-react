// app/components/molecules/ActionModal/ActionModal.tsx
"use client";

import React from "react";
import { Modal, Animation, Loader } from "rsuite";
import Button from "../../atoms/Button/Button";

// IMPORTANTE: importá el CSS del modal para que los @keyframes se apliquen.
import "./ActionModal.module.scss";

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

const ANIM_MS = 120; // misma duración que en el CSS

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
  // Mantengo montado hasta terminar animación de salida
  const [mounted, setMounted] = React.useState(open);
  const [inStage, setInStage] = React.useState(open);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setInStage(true));
    } else {
      setInStage(false);
    }
  }, [open]);

  const handleClose = () => {
    if (busy) return; // no cerrar si está confirmando
    setInStage(false);
  };

  const handleExited = () => {
    setMounted(false);
    onClose();
  };

  const handleConfirm = async () => {
    if (!onConfirm) return handleClose();
    try {
      setBusy(true);
      await onConfirm(); // si falla, queda abierto
      setInStage(false); // éxito => cerrar con anim
    } catch {
      // el padre puede mostrar el error; dejamos abierto
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) return null;

  // Clase dinámica para sincronizar backdrop + dialog
  const phaseClass = `amodal-zoom ${inStage ? "am-in" : "am-out"}`;

  return (
    <Modal
      open={mounted}
      onClose={handleClose}
      size={size}
      className={phaseClass}
      backdropClassName={phaseClass}
    >
      <Modal.Header>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>

      <Animation.Transition
        in={inStage}
        timeout={ANIM_MS}
        enteringClassName="am-entering"
        enteredClassName="am-entered"
        exitingClassName="am-exiting"
        exitedClassName="am-exited"
        onExited={handleExited}
      >
        <div className="am-sheet">
          <Modal.Body>{children}</Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onClick={handleClose} disabled={busy}>
              {cancelText}
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={confirmDisabled || busy}
              style={{ marginLeft: 8, position: "relative" }}
            >
              {busy && (
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <Loader speed="fast" size="xs" />
                </span>
              )}
              <span style={{ paddingLeft: busy ? 16 : 0 }}>
                {busy ? "Procesando…" : confirmText}
              </span>
            </Button>
          </Modal.Footer>
        </div>
      </Animation.Transition>
    </Modal>
  );
};

export default ActionModal;

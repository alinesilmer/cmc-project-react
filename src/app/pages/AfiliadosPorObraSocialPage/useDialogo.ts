import { useEffect, useRef } from "react";

/** Lo que comparten los paneles modales de Padrones: cierran con Escape, frenan el scroll del fondo y toman el foco al abrirse. */
export function useDialogo(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // El fondo no debe scrollear detrás del panel en celular.
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [open, onClose]);

  return panelRef;
}

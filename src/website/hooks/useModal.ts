import { useEffect, useRef } from "react";

/**
 * Lo que necesita cualquier ventana modal mientras está abierta: la página de
 * atrás no scrollea, Escape la cierra y, al cerrarse, el foco vuelve a donde
 * estaba. Lo implementaban por separado el chatbot y el directorio de médicos.
 */
export function useModal(abierto: boolean, onCerrar: () => void): void {
  // Ref para no reinstalar los listeners cada vez que el padre crea otro `onCerrar`.
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    if (!abierto) return;

    const previoFoco = document.activeElement as HTMLElement | null;
    const previoOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar.current();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previoOverflow;
      window.removeEventListener("keydown", onKey);
      previoFoco?.focus?.();
    };
  }, [abierto]);
}

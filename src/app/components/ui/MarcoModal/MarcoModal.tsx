import { forwardRef, useEffect, type ComponentPropsWithoutRef, type MouseEvent, type Ref } from "react";

import s from "./MarcoModal.module.scss";

type Props = Omit<ComponentPropsWithoutRef<"div">, "onSubmit"> & {
  /** Cierra con Escape o al tocar afuera. Sin esto, sólo cierra el contenido. */
  onClose?: () => void;
  /** El panel es un formulario: se dibuja como <form>. */
  como?: "div" | "form";
  onSubmit?: ComponentPropsWithoutRef<"form">["onSubmit"];
};

/**
 * EL marco de los modales del panel: el fondo oscuro y el panel centrado. Cada
 * pantalla pone el contenido y, con `className`, el tamaño de su panel.
 */
const MarcoModal = forwardRef<HTMLDivElement, Props>(function MarcoModal(
  { onClose, como = "div", className, children, onSubmit, ...resto },
  ref,
) {
  useEffect(() => {
    if (!onClose) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onClose]);

  const comunes = {
    ...resto,
    className: `${s.panel} ${className ?? ""}`,
    role: "dialog",
    "aria-modal": true,
    onMouseDown: (e: MouseEvent) => e.stopPropagation(),
  } as const;

  return (
    <div className={s.fondo} onMouseDown={onClose} role="presentation">
      {como === "form" ? (
        <form
          {...(comunes as ComponentPropsWithoutRef<"form">)}
          ref={ref as Ref<HTMLFormElement>}
          onSubmit={onSubmit}
        >
          {children}
        </form>
      ) : (
        <div {...comunes} ref={ref}>
          {children}
        </div>
      )}
    </div>
  );
});

export default MarcoModal;

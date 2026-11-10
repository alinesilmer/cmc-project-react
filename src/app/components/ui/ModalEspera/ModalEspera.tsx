import { useEffect, useRef } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import MarcoModal from "@/app/components/ui/MarcoModal/MarcoModal";

import s from "./ModalEspera.module.scss";

/** Tras el éxito se cierra solo; el botón «Cerrar» permite adelantarlo. */
const AUTOCIERRE_MS = 2600;

export type FaseEspera = "corriendo" | "listo" | "error";

interface Props {
  fase: FaseEspera;
  titulo: string;
  detalle: string;
  onCerrar: () => void;
}

/** EL modal que bloquea el panel mientras algo tarda: espera, éxito o error. Lo dibujan `ModalDescarga` y `ModalProceso`. */
export default function ModalEspera({ fase, titulo, detalle, onCerrar }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const cerrar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (fase !== "listo") return;
    const t = window.setTimeout(onCerrar, AUTOCIERRE_MS);
    return () => window.clearTimeout(t);
  }, [fase, onCerrar]);

  // El foco queda dentro del modal y el teclado no llega a la pantalla de atrás.
  useEffect(() => {
    (fase === "corriendo" ? panel.current : cerrar.current)?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (fase === "corriendo") {
        e.preventDefault();
        e.stopPropagation();
        panel.current?.focus();
        return;
      }
      if (e.key === "Escape") onCerrar();
      else if (!panel.current?.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
        cerrar.current?.focus();
      }
    };
    document.addEventListener("keydown", alTeclear, true);
    return () => document.removeEventListener("keydown", alTeclear, true);
  }, [fase, onCerrar]);

  return (
    <MarcoModal alto ref={panel} className={s.panel} tabIndex={-1} aria-live="assertive" aria-label={titulo}>
      <div className={s.icono} data-fase={fase}>
        {fase === "corriendo" && <Cargando size={46} tono="marca" aria-hidden="true" />}
        {fase === "listo" && <CircleCheck size={46} aria-hidden="true" />}
        {fase === "error" && <CircleAlert size={46} aria-hidden="true" />}
      </div>
      <h2 className={s.titulo}>{titulo}</h2>
      {detalle && <p className={s.detalle}>{detalle}</p>}
      {fase !== "corriendo" && (
        <Button ref={cerrar} variant="secondary" size="md" onClick={onCerrar}>
          Cerrar
        </Button>
      )}
    </MarcoModal>
  );
}

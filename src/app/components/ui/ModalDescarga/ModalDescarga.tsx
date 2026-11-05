import { useEffect, useRef, useSyncExternalStore } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import MarcoModal from "@/app/components/ui/MarcoModal/MarcoModal";
import { cerrarDescarga, leerDescarga, suscribirDescarga } from "@/app/hooks/descargas";

import s from "./ModalDescarga.module.scss";

/** Tras el éxito se cierra solo; el botón «Cerrar» permite adelantarlo. */
const AUTOCIERRE_MS = 2600;

const TEXTOS = {
  generando: { titulo: "Generando tu archivo", detalle: "No toques nada hasta que termine." },
  listo: { titulo: "Archivo listo", detalle: "Ya podés usarlo." },
  error: { titulo: "No se pudo generar", detalle: "Probá de nuevo." },
} as const;

/** El modal que bloquea el panel mientras se arma un archivo: espera, éxito o error. Va montado una sola vez. */
export default function ModalDescarga() {
  const fase = useSyncExternalStore(suscribirDescarga, leerDescarga);
  const panel = useRef<HTMLDivElement>(null);
  const cerrar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (fase !== "listo") return;
    const t = window.setTimeout(cerrarDescarga, AUTOCIERRE_MS);
    return () => window.clearTimeout(t);
  }, [fase]);

  // El foco queda dentro del modal y el teclado no llega a la pantalla de atrás.
  useEffect(() => {
    if (fase === "libre") return;
    (fase === "generando" ? panel.current : cerrar.current)?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (fase === "generando") {
        e.preventDefault();
        e.stopPropagation();
        panel.current?.focus();
        return;
      }
      if (e.key === "Escape") cerrarDescarga();
      else if (!panel.current?.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
        cerrar.current?.focus();
      }
    };
    document.addEventListener("keydown", alTeclear, true);
    return () => document.removeEventListener("keydown", alTeclear, true);
  }, [fase]);

  if (fase === "libre") return null;
  const { titulo, detalle } = TEXTOS[fase];

  return (
    <MarcoModal alto ref={panel} className={s.panel} tabIndex={-1} aria-live="assertive" aria-label={titulo}>
      <div className={s.icono} data-fase={fase}>
        {fase === "generando" && <Cargando size={46} tono="marca" aria-hidden="true" />}
        {fase === "listo" && <CircleCheck size={46} aria-hidden="true" />}
        {fase === "error" && <CircleAlert size={46} aria-hidden="true" />}
      </div>
      <h2 className={s.titulo}>{titulo}</h2>
      <p className={s.detalle}>{detalle}</p>
      {fase !== "generando" && (
        <Button ref={cerrar} variant="secondary" size="md" onClick={cerrarDescarga}>
          Cerrar
        </Button>
      )}
    </MarcoModal>
  );
}

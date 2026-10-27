import { History } from "lucide-react";

import Franja from "@/app/components/layout/Franja/Franja";
import s from "./Actividad.module.scss";

/** Registro de acciones del personal: todavía no hay datos reales, así que la pantalla lo dice en vez de mostrar ejemplos. */
export default function ActividadPage() {
  return (
    <div className={s.container}>
      <Franja titulo="Actividad" icono={History} />

      <section className={s.aviso} role="status">
        <History size={40} aria-hidden="true" />
        <h2>Todavía no está disponible</h2>
        <p>El registro de actividad se activa cuando el servidor empiece a guardar las acciones del personal.</p>
      </section>
    </div>
  );
}

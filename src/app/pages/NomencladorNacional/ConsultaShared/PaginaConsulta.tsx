import type { ReactNode } from "react";
import { DollarSign } from "lucide-react";

import s from "./PaginaConsulta.module.scss";
import Franja from "@/app/components/layout/Franja/Franja";

/** La franja y el relleno de las pantallas de consulta de precios; el ticket va adentro. */
export default function PaginaConsulta({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className={s.container}>
      <Franja titulo={titulo} icono={DollarSign} />
      {children}
    </div>
  );
}

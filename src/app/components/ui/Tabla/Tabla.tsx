import { forwardRef } from "react";
import type { TableHTMLAttributes } from "react";

import s from "./Tabla.module.scss";

type Props = TableHTMLAttributes<HTMLTableElement>;

/** LA tabla del panel: todas las tablas pasan por acá. */
const Tabla = forwardRef<HTMLTableElement, Props>(function Tabla({ className, children, ...resto }, ref) {
  return (
    <table ref={ref} className={`${s.tabla} ${className ?? ""}`} {...resto}>
      {children}
    </table>
  );
});

export default Tabla;

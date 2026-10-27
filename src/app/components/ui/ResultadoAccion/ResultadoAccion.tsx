import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import s from "./ResultadoAccion.module.scss";

const MAX_ERRORES = 8;

/** El aviso de que se guardó (o se revirtió) y, si hubo, los errores. */
export function ResultadoOk({ errores = [], children }: { errores?: { motivo: string; [clave: string]: unknown }[]; children: ReactNode }) {
  return (
    <div className={s.resultado} role="status">
      <p className={s.ok}>
        <CheckCircle2 size={18} aria-hidden="true" />
        <span>{children}</span>
      </p>
      {errores.length > 0 && (
        <div className={s.error} role="alert">
          <p className={s.errorTitulo}>
            <AlertTriangle size={16} aria-hidden="true" /> {errores.length} con error
          </p>
          <ul className={s.lista}>
            {errores.slice(0, MAX_ERRORES).map((e, i) => (
              <li key={i}>
                {String(e.codigo ?? "")} {String(e.motivo ?? "")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Error de una acción, en rojo. */
export function ErrorAccion({ children }: { children: ReactNode }) {
  return (
    <p className={s.errorAccion} role="alert">
      <AlertTriangle size={16} aria-hidden="true" /> {children}
    </p>
  );
}

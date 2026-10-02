import type React from "react";
import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { EASE } from "../../../lib/motion";

/**
 * Las clases las pone cada pantalla: el acordeón de Socios y el de Preguntas
 * frecuentes se ven distintos a propósito. Lo que comparten es el
 * comportamiento —abrir, cerrar, animar— y la accesibilidad, que es lo que
 * antes estaba escrito dos veces.
 */
type ClasesAcordeon = {
  raiz?: string;
  raizAbierta?: string;
  cabecera?: string;
  chevron?: string;
  chevronAbierto?: string;
  cuerpo?: string;
};

type Props = {
  cabecera: React.ReactNode;
  children: React.ReactNode;
  clases?: ClasesAcordeon;
  /** Modo controlado: el padre decide (sólo uno abierto a la vez, por ejemplo). */
  abierto?: boolean;
  onAlternar?: () => void;
  /** Modo libre: estado inicial. */
  abiertoInicial?: boolean;
};

export default function Acordeon({
  cabecera,
  children,
  clases = {},
  abierto: abiertoControlado,
  onAlternar,
  abiertoInicial = false,
}: Props) {
  const [abiertoLibre, setAbiertoLibre] = useState(abiertoInicial);
  const controlado = abiertoControlado !== undefined;
  const abierto = controlado ? abiertoControlado : abiertoLibre;
  const alternar = controlado ? onAlternar : () => setAbiertoLibre((v) => !v);

  const id = useId();
  const idCuerpo = `${id}-cuerpo`;

  return (
    <div className={`${clases.raiz ?? ""} ${abierto ? clases.raizAbierta ?? "" : ""}`}>
      <button
        type="button"
        id={id}
        className={clases.cabecera}
        onClick={alternar}
        aria-expanded={abierto}
        aria-controls={idCuerpo}
      >
        {cabecera}
        <ChevronDown
          className={`${clases.chevron ?? ""} ${abierto ? clases.chevronAbierto ?? "" : ""}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            id={idCuerpo}
            role="region"
            aria-labelledby={id}
            style={{ overflow: "hidden" }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: EASE }}
          >
            <div className={clases.cuerpo}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

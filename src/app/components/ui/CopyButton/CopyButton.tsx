import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import s from "./CopyButton.module.scss";

type Props = {
  /** Lo que va al portapapeles. */
  value: string;
  /** Para el tooltip: "Copiar {label}". */
  label: string;
  className?: string;
};

export default function CopyButton({ value, label, className }: Props) {
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiado(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      /* Sin permiso de portapapeles: el valor igual está a la vista. */
    }
  };

  const texto = copiado ? "Copiado" : `Copiar ${label.toLowerCase()}`;

  return (
    <button
      type="button"
      className={`${s.btn} ${copiado ? s.done : ""} ${className ?? ""}`}
      onClick={copiar}
      title={texto}
      aria-label={texto}
    >
      {copiado ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

import { useState } from "react";

/** Motivos fijos; lo que se guarda es el texto, así el padrón y los exportes lo leen tal cual. */
const MOTIVOS_BAJA = ["Renunció", "Falleció", "Moroso"] as const;

const OTROS = "otros";

type Props = {
  value: string;
  onChange: (motivo: string) => void;
  id?: string;
  claseSelect?: string;
  claseInput?: string;
  autoFocus?: boolean;
};

/** Motivo de baja: tres opciones y «Otros», que abre un campo para escribirlo. */
export default function MotivoBaja({ value, onChange, id, claseSelect, claseInput, autoFocus }: Props) {
  const esFijo = (MOTIVOS_BAJA as readonly string[]).includes(value);
  // Un texto que no es de la lista es un «Otros» ya escrito.
  const [otros, setOtros] = useState(Boolean(value) && !esFijo);
  const seleccion = otros ? OTROS : esFijo ? value : "";

  const elegir = (v: string) => {
    if (v === OTROS) {
      setOtros(true);
      onChange("");
      return;
    }
    setOtros(false);
    onChange(v);
  };

  return (
    <>
      <select id={id} className={claseSelect} value={seleccion} autoFocus={autoFocus} onChange={(e) => elegir(e.target.value)}>
        <option value="">—</option>
        {MOTIVOS_BAJA.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
        <option value={OTROS}>Otros</option>
      </select>
      {otros && (
        <input
          className={claseInput}
          value={value}
          maxLength={500}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribí el motivo"
          aria-label="Otro motivo de baja"
        />
      )}
    </>
  );
}

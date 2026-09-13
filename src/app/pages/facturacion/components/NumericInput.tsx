import React from "react";

interface Props
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "min" | "max"
  > {
  value: string;
  onChange: (value: string) => void;
  /** true = admite decimales (hasta 2), false = solo enteros. Default: false. */
  decimals?: boolean;
  min?: number;
  max?: number;
}

/**
 * Input numérico visualmente idéntico a los `type="number"` que reemplaza, pero
 * `type="text"` por debajo: bloquea cualquier tecleo que no sea un dígito (o un único
 * separador decimal en modo `decimals`), así se evita `e`/`+`/`-` y el cambio de valor
 * con la rueda del mouse que trae `type="number"`. El clamp de `min`/`max` se aplica
 * recién en `onBlur` — aplicarlo en cada tecla impediría vaciar el campo para retipear.
 */
const NumericInput: React.FC<Props> = ({
  value, onChange, decimals = false, min, max, onBlur, ...rest
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(",", ".");
    const pattern = decimals ? /^\d*\.?\d{0,2}$/ : /^\d*$/;
    if (pattern.test(raw)) onChange(raw);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const num = parseFloat(value);
    if (value === "" || Number.isNaN(num)) {
      onChange(String(min ?? 0));
    } else {
      let clamped = num;
      if (min != null && clamped < min) clamped = min;
      if (max != null && clamped > max) clamped = max;
      if (clamped !== num) onChange(decimals ? String(clamped) : String(Math.trunc(clamped)));
    }
    onBlur?.(e);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={decimals ? "decimal" : "numeric"}
      autoComplete="off"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

export default NumericInput;

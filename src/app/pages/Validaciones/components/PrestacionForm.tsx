import { useState } from "react";
import { Loader2, ShieldCheck, Trash2 } from "lucide-react";

import CodigoSelect from "./CodigoSelect";
import type {
  CampoConfig,
  ObraSocialConfig,
  PrestacionFormErrors,
  PrestacionFormValues,
} from "../validaciones.types";
import s from "./PrestacionForm.module.scss";

interface Props {
  os: ObraSocialConfig;
  enviando: boolean;
  onSubmit: (valores: PrestacionFormValues) => void;
}

const soloDigitos = (v: string) => v.replace(/\D/g, "");

/** Deja escribir importes con coma o punto y un máximo de dos decimales. */
const normalizarMoneda = (v: string) =>
  v.replace(/[^\d.,]/g, "").replace(/([.,]\d{0,2}).*$/, "$1");

function valoresIniciales(os: ObraSocialConfig): PrestacionFormValues {
  const base: PrestacionFormValues = {};
  for (const campo of os.campos ?? []) {
    base[campo.name] = campo.tipo === "entero" ? String(campo.min ?? 1) : "";
    if (campo.sufijo) base[campo.sufijo.name] = "";
  }
  return base;
}

/** Valida contra el esquema del campo; devuelve un mapa campo → mensaje. */
function validar(os: ObraSocialConfig, valores: PrestacionFormValues) {
  const errores: PrestacionFormErrors = {};

  for (const campo of os.campos ?? []) {
    const valor = (valores[campo.name] ?? "").trim();
    const requerido = campo.required !== false;

    if (requerido && !valor) {
      errores[campo.name] = "Este dato es obligatorio.";
      continue;
    }
    if (!valor) continue;

    if (campo.minLength && valor.length < campo.minLength)
      errores[campo.name] = `Tiene que tener ${campo.minLength} dígitos.`;

    if (campo.tipo === "entero") {
      const n = Number(valor);
      if (Number.isNaN(n)) errores[campo.name] = "Ingresá un número válido.";
      else if (campo.min != null && n < campo.min)
        errores[campo.name] = `El mínimo es ${campo.min}.`;
      else if (campo.max != null && n > campo.max)
        errores[campo.name] = `El máximo es ${campo.max}.`;
    }

    if (campo.sufijo && requerido && !(valores[campo.sufijo.name] ?? "").trim())
      errores[campo.sufijo.name] = "Completá el dígito verificador.";
  }

  return errores;
}

export default function PrestacionForm({ os, enviando, onSubmit }: Props) {
  const [valores, setValores] = useState<PrestacionFormValues>(() => valoresIniciales(os));
  const [errores, setErrores] = useState<PrestacionFormErrors>({});

  const setCampo = (name: string, valor: string) => {
    setValores((prev) => ({ ...prev, [name]: valor }));
    setErrores((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const limpiar = () => {
    setValores(valoresIniciales(os));
    setErrores({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validar(os, valores);
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      return;
    }
    onSubmit(valores);
  };

  const renderCampo = (campo: CampoConfig) => {
    const error = errores[campo.name];
    const valor = valores[campo.name] ?? "";
    const invalido = Boolean(error);
    const inputId = `campo-${campo.name}`;

    let control: React.ReactNode;

    if (campo.tipo === "codigo") {
      control = (
        <CodigoSelect
          obraSocial={os.codigo ?? 0}
          value={valor}
          onChange={(codigo) => setCampo(campo.name, codigo)}
          placeholder={campo.placeholder}
          invalid={invalido}
          bloqueados={os.codigosBloqueados}
          disabled={enviando}
        />
      );
    } else if (campo.sufijo) {
      const errorSufijo = errores[campo.sufijo.name];
      control = (
        <div className={s.splitRow}>
          <input
            id={inputId}
            className={`${s.input} ${invalido ? s.inputInvalid : ""}`}
            inputMode="numeric"
            autoComplete="off"
            disabled={enviando}
            maxLength={campo.maxLength}
            placeholder={campo.placeholder}
            value={valor}
            onChange={(e) => setCampo(campo.name, soloDigitos(e.target.value))}
          />
          <span className={s.splitSep} aria-hidden>
            /
          </span>
          <input
            className={`${s.input} ${s.inputShort} ${errorSufijo ? s.inputInvalid : ""}`}
            inputMode="numeric"
            autoComplete="off"
            disabled={enviando}
            aria-label={campo.sufijo.label ?? "Dígito verificador"}
            maxLength={campo.sufijo.maxLength}
            placeholder={campo.sufijo.placeholder}
            value={valores[campo.sufijo.name] ?? ""}
            onChange={(e) => setCampo(campo.sufijo!.name, soloDigitos(e.target.value))}
          />
        </div>
      );
    } else if (campo.tipo === "moneda") {
      control = (
        <div className={`${s.moneyWrap} ${invalido ? s.inputInvalid : ""}`}>
          <span className={s.moneyPrefix}>$</span>
          <input
            id={inputId}
            className={s.moneyInput}
            inputMode="decimal"
            autoComplete="off"
            disabled={enviando}
            placeholder={campo.placeholder}
            value={valor}
            onChange={(e) => setCampo(campo.name, normalizarMoneda(e.target.value))}
          />
        </div>
      );
    } else {
      const esNumero = campo.tipo === "numerico" || campo.tipo === "entero";
      control = (
        <input
          id={inputId}
          className={`${s.input} ${invalido ? s.inputInvalid : ""} ${
            campo.uppercase ? s.uppercase : ""
          }`}
          type={campo.tipo === "entero" ? "number" : "text"}
          inputMode={esNumero ? "numeric" : undefined}
          autoComplete="off"
          disabled={enviando}
          maxLength={campo.maxLength}
          min={campo.min}
          max={campo.max}
          placeholder={campo.placeholder}
          value={valor}
          onChange={(e) =>
            setCampo(
              campo.name,
              campo.tipo === "numerico" ? soloDigitos(e.target.value) : e.target.value
            )
          }
        />
      );
    }

    const anchoCorto = campo.tipo === "entero" || (campo.maxLength ?? 99) <= 4;

    return (
      <div
        key={campo.name}
        className={`${s.field} ${anchoCorto ? s.fieldHalf : s.fieldFull}`}
      >
        <label className={s.label} htmlFor={inputId}>
          {campo.label}
          {campo.required === false && <span className={s.opcional}>opcional</span>}
        </label>
        {control}
        {error ? (
          <span className={s.error} role="alert">
            {error}
          </span>
        ) : (
          campo.hint && <span className={s.hint}>{campo.hint}</span>
        )}
      </div>
    );
  };

  return (
    <form className={s.form} onSubmit={handleSubmit} noValidate>
      <div className={s.grid}>{(os.campos ?? []).map(renderCampo)}</div>

      <div className={s.actions}>
        <button
          type="button"
          className={s.btnGhost}
          onClick={limpiar}
          disabled={enviando}
        >
          <Trash2 size={16} /> Limpiar
        </button>

        <button type="submit" className={s.btnPrimary} disabled={enviando}>
          {enviando ? (
            <>
              <Loader2 size={17} className={s.spin} />
              {os.validacion === "online" ? "Validando…" : "Guardando…"}
            </>
          ) : (
            <>
              <ShieldCheck size={17} />
              {os.validacion === "online" ? "Validar y cargar" : "Cargar prestación"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import CodigoSelect from "./CodigoSelect";
import type { PrestacionFormEstado } from "./usePrestacionForm";
import type { CampoConfig, ObraSocialConfig } from "../validaciones.types";
import s from "./CampoPrestacion.module.scss";

interface Props {
  campo: CampoConfig;
  os: ObraSocialConfig;
  form: PrestacionFormEstado;
  enviando: boolean;
  /** Médico sobre el que se valida (sólo lo manda el personal del Colegio). */
  nroSocio?: number;
  /** El paso ya lleva de título el nombre del campo: no se repite arriba. */
  sinRotulo?: boolean;
}

const soloDigitos = (v: string) => v.replace(/\D/g, "");

/** Deja escribir importes con coma o punto y un máximo de dos decimales. */
const normalizarMoneda = (v: string) =>
  v.replace(/[^\d.,]/g, "").replace(/([.,]\d{0,2}).*$/, "$1");

/** Un campo del formulario de carga, según el tipo que declara la obra social. */
export default function CampoPrestacion({ campo, os, form, enviando, nroSocio, sinRotulo = false }: Props) {
  const { valores, errores, liveChecks, setCampo, dispararConsultaEnVivo } = form;
  const error = errores[campo.name];
  const valor = valores[campo.name] ?? "";
  const invalido = Boolean(error);
  const inputId = `campo-${campo.name}`;
  const rotulo = sinRotulo ? campo.label : undefined;

  let control: React.ReactNode;

  if (campo.tipo === "codigo") {
    control = (
      <CodigoSelect
        obraSocial={os.codigo ?? 0}
        value={valor}
        onChange={(codigo, opcion) => {
          setCampo(campo.name, codigo);
          // Prellena el coseguro sugerido del código — solo si esta obra social pide ese campo (hoy Boreal).
          if (opcion && opcion.coseguro > 0 && os.campos?.some((c) => c.name === "coseguro")) {
            setCampo("coseguro", String(opcion.coseguro));
          }
        }}
        placeholder={campo.placeholder}
        invalid={invalido}
        bloqueados={os.codigosBloqueados}
        disabled={enviando}
        nroSocio={nroSocio}
      />
    );
  } else if (campo.sufijo) {
    const sufijo = campo.sufijo;
    const errorSufijo = errores[sufijo.name];
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
          aria-label={rotulo}
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
          aria-label={sufijo.label ?? "Dígito verificador"}
          maxLength={sufijo.maxLength}
          placeholder={sufijo.placeholder}
          value={valores[sufijo.name] ?? ""}
          onChange={(e) => setCampo(sufijo.name, soloDigitos(e.target.value))}
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
          aria-label={rotulo}
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
        className={`${s.input} ${invalido ? s.inputInvalid : ""} ${campo.uppercase ? s.uppercase : ""}`}
        type={campo.tipo === "entero" ? "number" : "text"}
        inputMode={esNumero ? "numeric" : undefined}
        autoComplete="off"
        disabled={enviando}
        maxLength={campo.maxLength}
        min={campo.min}
        max={campo.max}
        placeholder={campo.placeholder}
        aria-label={rotulo}
        value={valor}
        onChange={(e) =>
          setCampo(campo.name, campo.tipo === "numerico" ? soloDigitos(e.target.value) : e.target.value)
        }
        // Salvavidas para "pegar y salir del campo" antes de que corra el debounce — mismo criterio que el `blur` del legacy.
        onBlur={
          campo.consultaEnVivo
            ? () => dispararConsultaEnVivo(campo, valores[campo.name] ?? "", true)
            : undefined
        }
      />
    );
  }

  const anchoCorto = campo.tipo === "entero" || (campo.maxLength ?? 99) <= 4;
  const liveCheck = campo.consultaEnVivo ? liveChecks[campo.name] : undefined;
  const errorVisible = error ?? (campo.sufijo ? errores[campo.sufijo.name] : undefined);

  return (
    <div className={`${s.field} ${anchoCorto ? s.fieldCorto : ""}`}>
      {!sinRotulo && (
        <label className={s.label} htmlFor={inputId}>
          {campo.label}
          {campo.required === false && <span className={s.opcional}>opcional</span>}
        </label>
      )}
      {control}
      {errorVisible && (
        <span className={s.error} role="alert">
          {errorVisible}
        </span>
      )}
      {liveCheck && (
        <span
          className={`${s.liveCheck} ${
            liveCheck.loading
              ? s.liveCheckCargando
              : liveCheck.resultado?.ok
                ? s.liveCheckOk
                : s.liveCheckError
          }`}
          role="status"
        >
          {liveCheck.loading ? (
            <>
              <Loader2 size={16} className={s.spin} /> Consultando afiliado…
            </>
          ) : liveCheck.resultado?.ok ? (
            <>
              <CheckCircle2 size={16} /> {liveCheck.resultado.texto}
            </>
          ) : (
            <>
              <XCircle size={16} /> {liveCheck.resultado?.texto}
            </>
          )}
        </span>
      )}
    </div>
  );
}

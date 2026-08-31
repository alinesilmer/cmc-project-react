import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Trash2, XCircle } from "lucide-react";

import CodigoSelect from "./CodigoSelect";
import type {
  CampoConfig,
  ConsultaEnVivoResultado,
  ObraSocialConfig,
  PrestacionFormErrors,
  PrestacionFormValues,
} from "../validaciones.types";
import s from "./PrestacionForm.module.scss";

// Debounce mientras se tipea — igual que el legacy de Nobis (`nobis.php`,
// `shouldQueryAfiliado` + 500ms de debounce).
const DEBOUNCE_CONSULTA_MS = 500;

interface EstadoLiveCheck {
  loading: boolean;
  resultado?: ConsultaEnVivoResultado;
}

interface Props {
  os: ObraSocialConfig;
  enviando: boolean;
  onSubmit: (valores: PrestacionFormValues) => void;
  /** Médico sobre el que se valida. Sólo lo manda el personal del Colegio;
   * cambiarlo limpia el código elegido (ver el efecto de abajo). */
  nroSocio?: number;
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

export default function PrestacionForm({ os, enviando, onSubmit, nroSocio }: Props) {
  const [valores, setValores] = useState<PrestacionFormValues>(() => valoresIniciales(os));
  const [errores, setErrores] = useState<PrestacionFormErrors>({});
  const [liveChecks, setLiveChecks] = useState<Record<string, EstadoLiveCheck>>({});

  // Refs porque no necesitan re-render por sí solos: sólo coordinan qué
  // request es la vigente. Mismo patrón que `requestSeq`/`lastQueriedAfiliado`
  // del legacy (`nobis.php`).
  const liveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const liveUltimoValor = useRef<Record<string, string>>({});
  const liveSeq = useRef<Record<string, number>>({});

  // Cambió el médico: el código elegido deja de valer. La habilitación y el
  // precio dependen de sus especialidades, así que lo que estaba seleccionado
  // puede no corresponderle —y de dejarlo, se cargaría a su nombre un código
  // que se eligió mirando el nomenclador de otro—. Los datos del afiliado se
  // conservan: son del paciente, no del prestador.
  useEffect(() => {
    setValores((prev) => (prev.codigo ? { ...prev, codigo: "" } : prev));
    setErrores((prev) => (prev.codigo ? { ...prev, codigo: undefined } : prev));
  }, [nroSocio]);

  // Al desmontar (o cambiar de obra social), no dejar timers colgados.
  useEffect(() => {
    const timers = liveTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, [os.slug]);

  const dispararConsultaEnVivo = (campo: CampoConfig, valorCrudo: string, inmediato = false) => {
    const config = campo.consultaEnVivo;
    if (!config) return;

    clearTimeout(liveTimers.current[campo.name]);
    const limpio = valorCrudo.replace(/\D/g, "");

    if (limpio.length < config.minLength) {
      liveUltimoValor.current[campo.name] = "";
      setLiveChecks((prev) => {
        if (!(campo.name in prev)) return prev;
        const resto = { ...prev };
        delete resto[campo.name];
        return resto;
      });
      return;
    }
    if (limpio === liveUltimoValor.current[campo.name]) return; // no repetir

    const ejecutar = () => {
      liveUltimoValor.current[campo.name] = limpio;
      const seq = (liveSeq.current[campo.name] ?? 0) + 1;
      liveSeq.current[campo.name] = seq;
      setLiveChecks((prev) => ({ ...prev, [campo.name]: { loading: true } }));

      config
        .consultar(limpio)
        .then((resultado) => {
          if (liveSeq.current[campo.name] !== seq) return; // llegó una respuesta vieja
          setLiveChecks((prev) => ({ ...prev, [campo.name]: { loading: false, resultado } }));
        })
        .catch(() => {
          if (liveSeq.current[campo.name] !== seq) return;
          setLiveChecks((prev) => ({
            ...prev,
            [campo.name]: {
              loading: false,
              resultado: { ok: false, texto: "No se pudo consultar." },
            },
          }));
        });
    };

    if (inmediato) ejecutar();
    else liveTimers.current[campo.name] = setTimeout(ejecutar, DEBOUNCE_CONSULTA_MS);
  };

  const setCampo = (name: string, valor: string) => {
    setValores((prev) => ({ ...prev, [name]: valor }));
    setErrores((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));

    const campo = os.campos?.find((c) => c.name === name);
    if (campo?.consultaEnVivo) dispararConsultaEnVivo(campo, valor);
  };

  const limpiar = () => {
    setValores(valoresIniciales(os));
    setErrores({});
    Object.values(liveTimers.current).forEach(clearTimeout);
    liveTimers.current = {};
    liveUltimoValor.current = {};
    setLiveChecks({});
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
          nroSocio={nroSocio}
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
          // Salvavidas para "pegar y salir del campo" antes de que corra el
          // debounce — mismo criterio que el `blur` del legacy.
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
                <Loader2 size={14} className={s.spin} /> Consultando afiliado…
              </>
            ) : liveCheck.resultado?.ok ? (
              <>
                <CheckCircle2 size={14} /> {liveCheck.resultado.texto}
              </>
            ) : (
              <>
                <XCircle size={14} /> {liveCheck.resultado?.texto}
              </>
            )}
          </span>
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

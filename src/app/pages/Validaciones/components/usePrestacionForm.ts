import { useEffect, useRef, useState } from "react";

import type {
  CampoConfig,
  ConsultaEnVivoResultado,
  ObraSocialConfig,
  PrestacionFormErrors,
  PrestacionFormValues,
} from "../validaciones.types";

// Debounce mientras se tipea — igual que el legacy de Nobis (`nobis.php`, `shouldQueryAfiliado` + 500ms de debounce).
const DEBOUNCE_CONSULTA_MS = 500;

export interface EstadoLiveCheck {
  loading: boolean;
  resultado?: ConsultaEnVivoResultado;
}

function valoresIniciales(os: ObraSocialConfig): PrestacionFormValues {
  const base: PrestacionFormValues = {};
  for (const campo of os.campos ?? []) {
    base[campo.name] = campo.tipo === "entero" ? String(campo.min ?? 1) : "";
    if (campo.sufijo) base[campo.sufijo.name] = "";
  }
  return base;
}

/** Valida contra el esquema del campo; devuelve un mapa campo → mensaje. */
function validar(campos: CampoConfig[], valores: PrestacionFormValues) {
  const errores: PrestacionFormErrors = {};

  for (const campo of campos) {
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

/** Estado del formulario de carga: valores, errores y las consultas en vivo. */
export function usePrestacionForm(os: ObraSocialConfig, nroSocio?: number) {
  const [valores, setValores] = useState<PrestacionFormValues>(() => valoresIniciales(os));
  const [errores, setErrores] = useState<PrestacionFormErrors>({});
  const [liveChecks, setLiveChecks] = useState<Record<string, EstadoLiveCheck>>({});

  // Refs porque no necesitan re-render por sí solos: sólo coordinan qué request es la vigente.
  const liveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const liveUltimoValor = useRef<Record<string, string>>({});
  const liveSeq = useRef<Record<string, number>>({});

  // Cambió el médico: el código elegido deja de valer.
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

  /** Valida esos campos, deja los errores a la vista y los devuelve (vacío = pasaron). */
  const revisar = (campos: CampoConfig[]): PrestacionFormErrors => {
    const errs = validar(campos, valores);
    setErrores((prev) => ({ ...prev, ...errs }));
    return errs;
  };

  return { valores, errores, liveChecks, setCampo, limpiar, revisar, dispararConsultaEnVivo };
}

export type PrestacionFormEstado = ReturnType<typeof usePrestacionForm>;

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, ShieldCheck, Trash2 } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import CampoPrestacion from "./CampoPrestacion";
import { armarPasos, PASO_MEDICO } from "./pasosCarga";
import type { PasoCarga } from "./pasosCarga";
import { usePrestacionForm } from "./usePrestacionForm";
import type { ObraSocialConfig, PrestacionFormValues } from "../validaciones.types";
import s from "./PrestacionForm.module.scss";

interface Props {
  os: ObraSocialConfig;
  enviando: boolean;
  onSubmit: (valores: PrestacionFormValues) => void;
  nroSocio?: number;
  /** Primer bloque del personal del Colegio: elegir a nombre de quién se carga. */
  medico?: { control: ReactNode; elegido: boolean };
}

/** Lleva el cursor al primer campo del bloque `indice`. */
function enfocarBloque(contenedor: HTMLElement | null, indice: number) {
  contenedor
    ?.querySelectorAll<HTMLElement>("[data-bloque]")
    [indice]?.querySelector<HTMLElement>("input:not([disabled])")
    ?.focus();
}

// Alto y ancho del botón del pie: grande, fácil de acertar.
const BOTON_GRANDE = { minHeight: "3rem", minWidth: "13rem", px: 4, fontSize: "1.05rem", ml: "auto" };

/** Carga de una prestación: todos los datos a la vista, un bloque debajo del otro (afiliado, token, práctica). */
export default function PrestacionForm({ os, enviando, onSubmit, nroSocio, medico }: Props) {
  const form = usePrestacionForm(os, nroSocio);
  const conMedico = Boolean(medico);
  const pasos = useMemo(
    () => [...(conMedico ? [PASO_MEDICO] : []), ...armarPasos(os)],
    [os, conMedico],
  );

  const [enFoco, setEnFoco] = useState<PasoCarga["id"] | null>(null);
  const [faltaMedico, setFaltaMedico] = useState(false);
  const bloques = useRef<HTMLDivElement>(null);

  const completo = (paso: PasoCarga) =>
    paso.id === "medico"
      ? Boolean(medico?.elegido)
      : paso.campos.every(
          (c) =>
            c.required === false ||
            ((form.valores[c.name] ?? "").trim() !== "" &&
              (!c.sufijo || (form.valores[c.sufijo.name] ?? "").trim() !== "")),
        );

  // El primer bloque al que le falta algo: ahí arranca el cursor.
  const faltante = pasos.findIndex((p) => !completo(p));
  const avance = faltante < 0 ? pasos.length : faltante;

  const irA = (indice: number) => enfocarBloque(bloques.current, indice);

  // Se arranca con el cursor en lo primero que falta: se carga sin mouse.
  const arranque = useRef(pasos[avance]?.id === "medico" ? -1 : avance);
  useEffect(() => {
    if (arranque.current >= 0) enfocarBloque(bloques.current, arranque.current);
  }, []);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;

    if (conMedico && !medico?.elegido) {
      setFaltaMedico(true);
      return irA(0);
    }
    setFaltaMedico(false);

    const errores = form.revisar(os.campos ?? []);
    const conError = pasos.findIndex((p) =>
      p.campos.some((c) => errores[c.name] || (c.sufijo && errores[c.sufijo.name])),
    );
    if (conError >= 0) return irA(conError);

    onSubmit(form.valores);
  };

  const limpiar = () => {
    form.limpiar();
    irA(medico?.elegido ? 1 : 0);
  };

  const enLinea = os.validacion === "online";
  // El bloque que se está completando: el del cursor o el primero que falta.
  const pasoGuia = pasos.find((p) => p.id === enFoco) ?? pasos[Math.min(avance, pasos.length - 1)];

  return (
    <form className={s.tarjeta} onSubmit={enviar} noValidate>
      <div className={s.bloques} ref={bloques}>
        {pasos.map((paso) => {
          const hecho = completo(paso);
          const Icono = hecho ? Check : paso.icono;
          const unSoloCampo = paso.campos.length === 1;
          const estado = hecho ? s.hecho : paso.id === pasoGuia.id ? s.ahora : "";
          return (
            <section
              key={paso.id}
              data-bloque={paso.id}
              className={`${s.bloque} ${estado}`}
              onFocusCapture={() => setEnFoco(paso.id)}
            >
              <h2 className={s.titulo}>
                <span className={s.circulo}>
                  <Icono size={22} aria-hidden="true" />
                </span>
                {paso.titulo}
              </h2>

              {paso.id === "medico" ? (
                <div className={s.medico}>
                  {medico?.control}
                  {faltaMedico && !medico?.elegido && (
                    <span className={s.error} role="alert">
                      Elegí el médico.
                    </span>
                  )}
                </div>
              ) : (
                <div className={s.campos}>
                  {paso.campos.map((campo) => (
                    <CampoPrestacion
                      key={campo.name}
                      campo={campo}
                      os={os}
                      form={form}
                      enviando={enviando}
                      nroSocio={nroSocio}
                      sinRotulo={unSoloCampo}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className={s.pie}>
        <button type="button" className={s.limpiar} onClick={limpiar} disabled={enviando}>
          <Trash2 size={18} aria-hidden="true" /> Limpiar
        </button>
        <Button
          submit
          leftIcon={<ShieldCheck size={22} aria-hidden="true" />}
          sx={BOTON_GRANDE}
          isLoading={enviando}
        >
          {enviando ? (enLinea ? "Validando…" : "Guardando…") : enLinea ? "Validar" : "Cargar"}
        </Button>
      </div>
    </form>
  );
}

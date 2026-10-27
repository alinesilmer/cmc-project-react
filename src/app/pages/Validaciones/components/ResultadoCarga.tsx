import { BadgeCheck, CircleAlert, Info, X } from "lucide-react";

import { esPendienteDeObraSocial } from "../validaciones.types";
import type { ResultadoValidacion } from "../validaciones.types";
import s from "./ResultadoCarga.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

interface Props {
  resultado: ResultadoValidacion;
  onCerrar: () => void;
}

/** Lo que contestó la obra social a la última carga. */
export default function ResultadoCarga({ resultado, onCerrar }: Props) {
  const { estado, mensaje, prestacion, mostrarAyuda = true } = resultado;

  // Nobis grada el `P-Pendiente` como `rechazada` en la base (importe 0, fuera de factura), pero acá corresponde el mismo aviso que un `pendiente` real.
  const pendienteDeGestion = estado === "rechazada" && esPendienteDeObraSocial(mensaje);
  const estadoVisual = pendienteDeGestion ? "pendiente" : estado;

  const Icono =
    estadoVisual === "autorizada" || estadoVisual === "cargada"
      ? BadgeCheck
      : estadoVisual === "pendiente"
        ? Info
        : CircleAlert;

  const titulo =
    estadoVisual === "autorizada"
      ? "Autorizada"
      : estadoVisual === "cargada"
        ? "Cargada"
        : estadoVisual === "pendiente"
          ? "Falta gestión del afiliado"
          : "No se cargó";

  return (
    <div className={`${s.resultado} ${s[`resultado_${estadoVisual}`]}`} role="status">
      <span className={s.sello}>
        <Icono size={30} aria-hidden="true" />
      </span>

      <div className={s.texto}>
        <strong>{titulo}</strong>
        <p>{mensaje}</p>

        {prestacion && (
          <dl className={s.datos}>
            <div>
              <dt>N° de validación</dt>
              <dd>{prestacion.nroValidacion}</dd>
            </div>
            <div>
              <dt>Práctica</dt>
              <dd>
                {prestacion.codigo} · {prestacion.descripcion}
              </dd>
            </div>
          </dl>
        )}

        {!prestacion && estado === "rechazada" && mostrarAyuda && (
          <p className={s.ayuda}>
            Revisá los datos del afiliado y el código. Si el problema sigue, consultá en el Colegio.
          </p>
        )}
      </div>

      <BotonPlano type="button" className={s.cerrar} onClick={onCerrar} aria-label="Cerrar aviso">
        <X size={20} aria-hidden="true" />
      </BotonPlano>
    </div>
  );
}

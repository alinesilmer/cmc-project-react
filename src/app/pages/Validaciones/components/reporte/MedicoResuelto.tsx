import type { ResultadoMatricula } from "../../medicosPorMatricula";
import s from "./reporte.module.scss";

/** Cómo se muestra cada resultado de la búsqueda por matrícula. */
const SIN_MEDICO: Record<ResultadoMatricula["tipo"], string> = {
  "sin-matricula": "Sin matrícula en el reporte",
  "no-encontrado": "Matrícula fuera del padrón",
  encontrado: "",
  ambiguo: "",
};

interface Props {
  resultado: ResultadoMatricula;
  /** El nombre que escribió la obra social, para cuando no se resuelve. */
  nombreEnReporte: string;
  /** Advertencia propia del reporte (por ejemplo, matrícula de otra provincia). */
  advertencia?: string;
}

/**
 * El médico del padrón, o por qué no se pudo resolver.
 *
 * Cuando no se resuelve se muestra igual el nombre que escribió la obra social:
 * es lo único que le queda a quien tenga que buscarlo a mano.
 */
export default function MedicoResuelto({
  resultado,
  nombreEnReporte,
  advertencia,
}: Props) {
  if (resultado.tipo === "encontrado" || resultado.tipo === "ambiguo") {
    const { medico } = resultado;
    return (
      <div className={s.medico}>
        <span>{medico.nombre}</span>
        <span className={s.meta}>
          {medico.nroSocio ? `Socio ${medico.nroSocio}` : "Sin N° de socio"}
          {!medico.activo && " · inactivo"}
          {resultado.tipo === "ambiguo" &&
            ` · ${resultado.total} fichas con esta matrícula`}
        </span>
        {advertencia && <span className={s.badge}>{advertencia}</span>}
      </div>
    );
  }

  return (
    <div className={s.medico}>
      <span className={s.badge}>{advertencia || SIN_MEDICO[resultado.tipo]}</span>
      <span className={s.meta}>{nombreEnReporte || "—"}</span>
    </div>
  );
}

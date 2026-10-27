import { Fragment, memo } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import Switch from "@mui/material/Switch";

import s from "./TablaGalenos.module.scss";
import FilasNiveles from "./FilasNiveles";
import type { GalenoResumenOut } from "../../nomenclador.types";
import { grupoValorActual, montoValido, type Grupo, type ResultadoGuardado } from "../precios.helpers";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

type Props = {
  grupo: Grupo;
  /** Lo tipeado en «Nueva unidad». */
  valor: string;
  resultado?: ResultadoGuardado;
  abierto: boolean;
  info?: GalenoResumenOut;
  /** Se está cambiando su visibilidad en el servidor. */
  cambiando: boolean;
  onEditar: (codigo: string, valor: string) => void;
  onAbrir: (codigo: string) => void;
  onVisible: (grupo: Grupo) => void;
};

/** Una fila de la tabla: el galeno, su valor actual, el campo del valor nuevo y si se ve en el boletín; con sus niveles debajo. */
function FilaGaleno({ grupo, valor, resultado, abierto, info, cambiando, onEditar, onAbrir, onVisible }: Props) {
  const nuevo = montoValido(valor);
  const clasesValor = [
    s.valor,
    nuevo !== null ? s.valorSucio : "",
    resultado?.ok ? s.valorGuardado : "",
    resultado && !resultado.ok ? s.valorError : "",
  ].join(" ");

  return (
    <Fragment>
      <tr className={grupo.visible ? undefined : s.oculto}>
        <td>
          {grupo.nivelado ? (
            <BotonPlano type="button" className={s.nombreToggle} onClick={() => onAbrir(grupo.codigo)} aria-expanded={abierto} title="Ver niveles">
              {abierto ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
              {grupo.nombre}
            </BotonPlano>
          ) : (
            grupo.nombre
          )}
        </td>
        <td>
          {grupo.nivelado ? `${info?.modo === "por_nivel" ? "Precio por nivel" : "Calculado"} · ${grupo.niveles.length} niveles` : "Calculado"}
        </td>
        <td className={s.monto}>{grupoValorActual(grupo)}</td>
        <td>
          <div className={s.celdaValor}>
            <input
              type="number"
              min="0"
              step="0.01"
              className={clasesValor}
              value={valor}
              onChange={(e) => onEditar(grupo.codigo, e.target.value)}
              placeholder={grupo.nivelado ? "Para todos los niveles" : "Nuevo valor"}
              aria-label={`Nueva unidad de ${grupo.nombre}`}
              disabled={resultado?.ok}
            />
            {resultado?.ok && <CheckCircle2 size={16} className={s.iconoOk} aria-label="Guardado" />}
            {resultado && !resultado.ok && (
              <span title={resultado.msg}>
                <AlertCircle size={16} className={s.iconoError} aria-label={resultado.msg} />
              </span>
            )}
          </div>
        </td>
        <td>
          <Switch
            size="small"
            checked={grupo.visible}
            disabled={cambiando}
            onChange={() => onVisible(grupo)}
            slotProps={{ input: { "aria-label": `Mostrar ${grupo.nombre} en el boletín de los médicos` } }}
          />
        </td>
      </tr>
      {grupo.nivelado && abierto && <FilasNiveles grupo={grupo} info={info} nuevo={nuevo} />}
    </Fragment>
  );
}

export default memo(FilaGaleno);

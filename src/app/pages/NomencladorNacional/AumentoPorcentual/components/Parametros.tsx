import { memo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import Paso from "@/app/components/ui/Paso/Paso";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import s from "./Parametros.module.scss";
import { ORIGEN_LABELS } from "../../nomenclador.types";
import type { Origen } from "../../nomenclador.types";
import { ORIGENES, porcentajeValido } from "../aumento.helpers";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import FieldError from "@/app/components/ui/FieldError/FieldError";
import { formatFecha } from "@/app/shared/lib/fechas";
import { formatoNumero2 } from "@/app/shared/lib/formatos";

type Props = {
  numero: number;
  incluirFijos: boolean;
  origen: Origen;
  onOrigen: (o: Origen) => void;
  vigencia: string;
  onVigencia: (v: string) => void;
  pct: string;
  onPct: (v: string) => void;
  pctNum: number | null;
  pctError?: string;
};

/** Paso «Parámetros»: el porcentaje, la vigencia del nuevo precio y, para valores fijos, el origen. */
function Parametros({ numero, incluirFijos, origen, onOrigen, vigencia, onVigencia, pct, onPct, pctNum, pctError }: Props) {
  const sube = porcentajeValido(pctNum) && pctNum > 0;
  const baja = porcentajeValido(pctNum) && pctNum < 0;

  return (
    <Paso numero={numero} titulo="Parámetros">
      <div className={c.campo}>
        <label className={c.rotulo} htmlFor="aumento-pct">Porcentaje</label>
        <div className={s.cifra}>
          <input
            id="aumento-pct"
            className={`${s.cifraEntrada} ${sube ? s.sube : ""} ${baja || pctError ? s.baja : ""}`}
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0"
            value={pct}
            onChange={(e) => onPct(e.target.value)}
            aria-invalid={pctError ? true : undefined}
          />
          <span className={s.simbolo} aria-hidden="true">%</span>
        </div>
        <FieldError msg={pctError} />
      </div>

      <div className={c.campo}>
        <span className={c.rotulo} id="aumento-vigencia">Vigencia desde</span>
        <CampoFecha value={vigencia} onChange={onVigencia} />
        <p className={c.ayuda}>Tiene que ser posterior a la del precio actual: lo que ya la tenga se omite.</p>
      </div>

      {incluirFijos && (
        <div className={c.campo}>
          <label className={c.rotulo} htmlFor="aumento-origen">Origen de los valores fijos</label>
          <select
            id="aumento-origen"
            className={c.seleccion}
            value={origen}
            onChange={(e) => {
              const elegido = ORIGENES.find((o) => o === e.target.value);
              if (elegido) onOrigen(elegido);
            }}
          >
            {ORIGENES.map((o) => (
              <option key={o} value={o}>
                {o} — {ORIGEN_LABELS[o]}
              </option>
            ))}
          </select>
        </div>
      )}

      {porcentajeValido(pctNum) && (
        <p className={`${s.frase} ${sube ? s.sube : s.baja}`} role="status">
          {sube ? <TrendingUp size={18} aria-hidden="true" /> : <TrendingDown size={18} aria-hidden="true" />}
          <span>
            Los precios {sube ? "suben" : "bajan"} {formatoNumero2.format(Math.abs(pctNum))} %
            {vigencia && ` desde el ${formatFecha(vigencia)}`}.
          </span>
        </p>
      )}
    </Paso>
  );
}

export default memo(Parametros);

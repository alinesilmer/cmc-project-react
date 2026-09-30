import { useEffect, useState } from "react";

import { listVigenciasCargadas } from "../nomenclador.api";
import { vigenciaLegible, type VigenciaCargada } from "./vigencia";
import s from "./selectorVigencia.module.scss";

/**
 * Elige qué vigencia de una obra social se está mirando.
 *
 * Sin esto las pantallas traían **todas** las vigencias juntas y el mismo
 * código aparecía repetido una vez por carga: ilegible, y con el riesgo de
 * leer un precio viejo creyendo que es el actual.
 *
 * Arranca en la más reciente, que es lo que rige. Las vigencias vienen de
 * `GET /api/valores_nm/vigencias`, que las devuelve ordenadas de la más nueva
 * a la más vieja con la cantidad de valores de cada una.
 */

interface Props {
  obraSocialNro: number | null;
  /** `null` mientras no se resolvió, o si la O.S. no tiene ninguna. */
  valor: string | null;
  onCambio: (vigencia: string | null) => void;
  /** Etiqueta del control. */
  label?: string;
  /** Texto de la opción que muestra todas las vigencias juntas. */
  etiquetaTodas?: string;
  /** `false` para no ofrecer "todas": hay pantallas donde no tiene sentido. */
  permitirTodas?: boolean;
}

export default function SelectorVigencia({
  obraSocialNro,
  valor,
  onCambio,
  label = "Vigencia",
  etiquetaTodas = "Todas",
  permitirTodas = true,
}: Props) {
  const [vigencias, setVigencias] = useState<VigenciaCargada[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!obraSocialNro) {
      setVigencias([]);
      onCambio(null);
      return;
    }

    let vigente = true;
    setCargando(true);
    listVigenciasCargadas(obraSocialNro)
      .then((filas) => {
        if (!vigente) return;
        setVigencias(filas ?? []);
        // La más reciente por defecto: el endpoint ya las ordena descendente.
        onCambio(filas?.[0]?.vigencia_desde ?? null);
      })
      .catch(() => {
        if (!vigente) return;
        // Sin la lista, la pantalla sigue andando sin filtro.
        setVigencias([]);
        onCambio(null);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
    // `onCambio` es una función nueva por render en el llamador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraSocialNro]);

  if (!obraSocialNro || (!cargando && vigencias.length === 0)) return null;

  return (
    <label className={s.campo}>
      <span>{label}</span>
      <select
        value={valor ?? ""}
        onChange={(e) => onCambio(e.target.value || null)}
        disabled={cargando}
      >
        {cargando && <option value="">Cargando…</option>}
        {!cargando &&
          vigencias.map((v, i) => (
            <option key={v.vigencia_desde} value={v.vigencia_desde}>
              {vigenciaLegible(v.vigencia_desde)}
              {i === 0 ? " · vigente" : ""} ({v.cantidad})
            </option>
          ))}
        {!cargando && permitirTodas && (
          <option value="">{etiquetaTodas}</option>
        )}
      </select>
    </label>
  );
}

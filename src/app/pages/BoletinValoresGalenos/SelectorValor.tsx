import type { TipoValor } from "./valoresGalenos";
import s from "./BoletinValoresGalenos.module.scss";

type Props = {
  tipos: TipoValor[];
  elegido: string;
  onElegir: (codigo: string) => void;
};

/**
 * Qué valor comparar. En la computadora son botones, todos a la vista; en el
 * teléfono no entran y pasan a ser un desplegable, que es el control que el
 * sistema operativo ya muestra grande.
 */
export default function SelectorValor({ tipos, elegido, onElegir }: Props) {
  const grupos = [
    { rotulo: "Valores", tipos: tipos.filter((t) => !t.nivelado) },
    { rotulo: "Con niveles", tipos: tipos.filter((t) => t.nivelado) },
  ].filter((g) => g.tipos.length > 0);

  return (
    <>
      <div className={s.selectorBotones}>
        {grupos.map((grupo) => (
          <div key={grupo.rotulo} className={s.grupo} role="group" aria-label={grupo.rotulo}>
            <span className={s.grupoRotulo}>{grupo.rotulo}</span>
            <div className={s.botones}>
              {grupo.tipos.map((t) => (
                <button
                  key={t.codigo}
                  type="button"
                  className={t.codigo === elegido ? `${s.valorBoton} ${s.valorBotonActivo}` : s.valorBoton}
                  aria-pressed={t.codigo === elegido}
                  onClick={() => onElegir(t.codigo)}
                >
                  {t.nombre}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <label className={s.selectorLista}>
        <span className={s.grupoRotulo}>Valor</span>
        <select
          id="valor-galeno"
          className={s.select}
          value={elegido}
          onChange={(e) => onElegir(e.target.value)}
        >
          {grupos.map((grupo) => (
            <optgroup key={grupo.rotulo} label={grupo.rotulo}>
              {grupo.tipos.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.nombre}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    </>
  );
}

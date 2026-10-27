import type { FiltroActivo } from "../resumenFiltros";
import styles from "@/app/pages/UsersList/components/FilterModal/FilterModal.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

interface Props {
  columnas: number;
  activos: FiltroActivo[];
  onReset: () => void;
}

/** Lo elegido hasta ahora, siempre a la vista al costado de las solapas. */
export function FiltersResumen({ columnas, activos, onReset }: Props) {
  return (
    <aside className={styles.resumen}>
      <div className={styles.resumenCabeza}>
        <h3 className={styles.resumenTitulo}>Resumen</h3>
        <BotonPlano className={styles.limpiar} onClick={onReset} type="button">
          Limpiar
        </BotonPlano>
      </div>

      <dl className={styles.resumenLista}>
        <div>
          <dt>Columnas</dt>
          <dd>{columnas}</dd>
        </div>
        {activos.map((a) => (
          <div key={a.key}>
            <dt>{a.rotulo}</dt>
            <dd>{a.valor}</dd>
          </div>
        ))}
      </dl>

      {activos.length === 0 && <p className={styles.resumenVacio}>Sin filtros: salen todos los socios.</p>}
    </aside>
  );
}

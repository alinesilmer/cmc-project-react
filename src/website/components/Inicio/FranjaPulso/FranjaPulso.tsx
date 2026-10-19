import styles from "./FranjaPulso.module.scss";

const ANCHO = 1200;
const BASE = 110;
const LATIDO = 300;

/** Un latido (P, QRS, T) que empieza en `x`, sobre la línea de base. */
const latido = (x: number) =>
  `L${x + 60} ${BASE} Q${x + 75} ${BASE - 16} ${x + 90} ${BASE} L${x + 120} ${BASE} ` +
  `L${x + 128} ${BASE + 10} L${x + 140} ${BASE - 82} L${x + 152} ${BASE + 26} L${x + 160} ${BASE} ` +
  `L${x + 185} ${BASE} Q${x + 205} ${BASE - 26} ${x + 225} ${BASE} L${x + LATIDO} ${BASE}`;

const TRAZO = `M0 ${BASE} ` + Array.from({ length: ANCHO / LATIDO }, (_, i) => latido(i * LATIDO)).join(" ");

/** Monitor cardíaco entre secciones: el trazo queda tenue y un punto brillante lo recorre dejando estela, sin texto. */
export default function FranjaPulso() {
  return (
    <div className={styles.franja} aria-hidden="true">
      <svg className={styles.monitor} viewBox={`0 0 ${ANCHO} 160`} preserveAspectRatio="none" focusable="false">
        <path d={TRAZO} pathLength={1} className={styles.fondo} />
        {/* La estela: tres tramos que terminan en el mismo punto, del más largo y tenue al más corto y brillante. */}
        <path d={TRAZO} pathLength={1} className={`${styles.tramo} ${styles.cola}`} />
        <path d={TRAZO} pathLength={1} className={`${styles.tramo} ${styles.medio}`} />
        <path d={TRAZO} pathLength={1} className={`${styles.tramo} ${styles.punta}`} />
      </svg>
    </div>
  );
}

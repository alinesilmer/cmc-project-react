import escudo from "../../../assets/images/escudoCMC.webp";
import styles from "./HeroColegio.module.scss";

const ANILLO = "COLEGIO MÉDICO DE CORRIENTES · MÁS DE 70 AÑOS JUNTO A LOS MÉDICOS · ";

/** El sello: el escudo del Colegio al centro y un anillo de texto que gira despacio a su alrededor. */
export default function SelloColegio() {
  return (
    <div className={styles.sello}>
      <svg className={styles.selloSvg} viewBox="0 0 400 400" aria-hidden="true" focusable="false">
        <defs>
          <path id="sello-anillo" d="M200,200 m-172,0 a172,172 0 1,1 344,0 a172,172 0 1,1 -344,0" />
        </defs>
        <circle cx="200" cy="200" r="196" className={styles.selloLinea} />
        <g className={styles.selloGiro}>
          <text className={styles.selloAnillo}>
            <textPath href="#sello-anillo" textLength={1075} lengthAdjust="spacing">
              {ANILLO}
            </textPath>
          </text>
        </g>
      </svg>
      {/* WebP de 320 px (41 KB); diferida: en celulares el sello no se muestra y no se baja. */}
      <img
        src={escudo}
        alt="Escudo del Colegio Médico de Corrientes"
        className={styles.escudo}
        width={320}
        height={320}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

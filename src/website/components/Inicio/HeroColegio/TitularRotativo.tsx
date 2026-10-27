import { useRotacion } from "@/website/hooks/useRotacion";
import styles from "./HeroColegio.module.scss";

/** Cada frase: lo que va en recto y la palabra que va en cursiva dorada. */
type Frase = { antes: string; resalto: string };

// Pocas palabras y fuertes: una idea por frase.
const FRASES: Frase[] = [
  { antes: "Respaldo para tu", resalto: "práctica" },
  { antes: "70 años al servicio de la", resalto: "medicina" },
  { antes: "Convenios que", resalto: "suman" },
  { antes: "Profesionales de", resalto: "prestigio" },
];

const CADA_MS = 3800;

/** El titular del hero: una frase corta que cambia cada pocos segundos. */
export default function TitularRotativo() {
  const actual = useRotacion(FRASES.length, CADA_MS);
  const frase = FRASES[actual];

  return (
    <h1 className={styles.titular}>
      {/* Para lectores de pantalla y buscadores, un título que no cambia. */}
      <span className={styles.oculto}>Colegio Médico de Corrientes: respaldo para tu práctica</span>
      {/* La `key` reinicia la animación de entrada en cada cambio de frase. */}
      <span key={actual} className={styles.frase} aria-hidden="true">
        {frase.antes} <em>{frase.resalto}</em>
      </span>
    </h1>
  );
}

import { motion } from "framer-motion";
import { Stamp, Copy, CircleDashed, Hand } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Revelar from "../../../components/UI/Revelar/Revelar";
import TarjetaRequisito from "./TarjetaRequisito";
import { COPIAS_SIMPLES, PRINCIPALES, type Requisito } from "../socios.data";
import styles from "./Requisitos.module.scss";

const opcional = (r: Requisito) => Boolean(r.tags?.includes("no-obligatorio"));

// Agrupados por lo que hay que hacer con cada papel: así la etiqueta se lee
// una vez en el título del grupo y no repetida en cada tarjeta.
const GRUPOS: { titulo: string; icono: LucideIcon; items: Requisito[] }[] = [
  { titulo: "Legalizados", icono: Stamp, items: PRINCIPALES },
  { titulo: "Copias", icono: Copy, items: COPIAS_SIMPLES.filter((r) => !opcional(r)) },
  { titulo: "Opcionales", icono: CircleDashed, items: COPIAS_SIMPLES.filter(opcional) },
];

const escalonado = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

/** Qué hay que traer, en tarjetas con ícono. */
export default function Requisitos() {
  return (
    <section id="requisitos" className={styles.seccion}>
      <Revelar className={styles.encabezado}>
        <h2>¿Qué traer?</h2>
        <span className={styles.pista}>
          <motion.span
            className={styles.mano}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          >
            <Hand />
          </motion.span>
          Tocá para ver más
        </span>
      </Revelar>

      {GRUPOS.map(({ titulo, icono: Icono, items }) => (
        <div key={titulo} className={styles.grupo}>
          <h3 className={styles.titulo}>
            <Icono aria-hidden="true" />
            {titulo}
            <span className={styles.cantidad}>{items.length}</span>
          </h3>
          <motion.ul
            className={styles.grilla}
            variants={escalonado}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {items.map((item) => (
              <TarjetaRequisito key={item.id} item={item} />
            ))}
          </motion.ul>
        </div>
      ))}
    </section>
  );
}

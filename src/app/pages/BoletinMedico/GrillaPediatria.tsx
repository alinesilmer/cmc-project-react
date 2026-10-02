import { motion } from "framer-motion";
import type { ItemBoletin } from "./boletinMedico.api";
import { moneda } from "./boletinMedico.formato";
import s from "./BoletinMedico.module.scss";

/** Los códigos de pediatría de cada obra social, con el número y su valor. */
export default function GrillaPediatria({ items }: { items: ItemBoletin[] }) {
  return (
    <ul className={s.grid}>
      {items.map((i, idx) => (
        <motion.li
          key={i.nro}
          className={s.card}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: Math.min(idx, 10) * 0.03 }}
        >
          <div className={s.cardHead}>
            <h2 className={s.cardTitle}>{i.nombre}</h2>
            <span className={s.cardNro}>{i.nro}</span>
          </div>

          <ul className={s.valores}>
            {i.pediatria.map((v) => (
              <li key={v.codigo} className={s.valorFila}>
                <span className={s.valorNombre}>
                  <span className={s.valorCodigo}>{v.codigo}</span>
                  {v.nombre}
                </span>
                <span className={s.valorMonto}>{moneda.format(v.valor)}</span>
              </li>
            ))}
          </ul>
        </motion.li>
      ))}
    </ul>
  );
}

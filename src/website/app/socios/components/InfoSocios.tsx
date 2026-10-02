import { Wallet } from "lucide-react";
import Revelar from "../../../components/UI/Revelar/Revelar";
import AccionesContacto from "../../../components/Contacto/AccionesContacto/AccionesContacto";
import { CONTACTO } from "../../../lib/contacto";
import { ARANCELES } from "../socios.data";
import styles from "./InfoSocios.module.scss";

/** Cuánto cuesta y cómo contactarse. */
export default function InfoSocios() {
  return (
    <section className={styles.grilla}>
      <Revelar className={styles.aranceles} desde="izquierda">
        <span className={styles.icono} aria-hidden="true">
          <Wallet />
        </span>
        <dl className={styles.montos}>
          {ARANCELES.map((a) => (
            <div key={a.concepto} className={styles.monto}>
              <dt>{a.concepto}</dt>
              <dd>{a.monto}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.nota}>Pueden actualizarse.</p>
      </Revelar>

      <AccionesContacto email={CONTACTO.emails.auditoria} asunto="Consulta Socio Prestador" />
    </section>
  );
}

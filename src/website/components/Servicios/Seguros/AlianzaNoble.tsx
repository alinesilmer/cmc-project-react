import { Handshake } from "lucide-react";
import Revelar from "../../UI/Revelar/Revelar";
import logoCMC from "../../../assets/images/logoCMC-web.png";
// Servido desde el propio sitio: antes se cargaba a través del proxy de
// imágenes del buscador Brave, que recibía la IP de cada visitante.
import logoNoble from "../../../assets/images/noble.png";
import styles from "./AlianzaNoble.module.scss";

/** El Colegio y NOBLE, lado a lado: lo que la página de Seguros tiene que decir. */
export default function AlianzaNoble() {
  return (
    <div className={styles.alianza} role="img" aria-label="Colegio Médico de Corrientes y NOBLE Seguros, en convenio">
      <Revelar className={styles.marca} desde="izquierda" distancia={24} retraso={0.15} alVerse={false}>
        <img src={logoCMC} alt="" width={96} height={96} className={styles.cmc} />
      </Revelar>

      <Revelar className={styles.union} desde="nada" retraso={0.45} alVerse={false}>
        <Handshake aria-hidden="true" />
      </Revelar>

      <Revelar className={styles.marca} desde="derecha" distancia={24} retraso={0.15} alVerse={false}>
        <img src={logoNoble} alt="" width={481} height={174} className={styles.noble} />
      </Revelar>
    </div>
  );
}

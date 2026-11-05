import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Megaphone, X } from "lucide-react";
import { useModal } from "@/website/hooks/useModal";
import Button from "@/website/components/UI/Button/Button";
import styles from "./Comunicado.module.scss";

// Cambiar la clave cuando haya un comunicado nuevo, para que vuelva a aparecer.
const CLAVE_VISTO = "cmc:comunicado-liquidaciones";

function yaVisto(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_VISTO) === "1";
  } catch {
    return false;
  }
}

function marcarVisto() {
  try {
    sessionStorage.setItem(CLAVE_VISTO, "1");
  } catch {
    // Sin almacenamiento sólo se vuelve a mostrar en la próxima visita.
  }
}

/** Aviso temporal de las liquidaciones; se quita sacándolo de la página de Inicio. */
export default function Comunicado() {
  const [abierto, setAbierto] = useState(() => !yaVisto());

  const cerrar = () => {
    marcarVisto();
    setAbierto(false);
  };
  useModal(abierto, cerrar);

  if (!abierto) return null;

  return createPortal(
    <motion.div
      className={styles.fondo}
      onClick={cerrar}
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className={styles.dialogo}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comunicado-titulo"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className={styles.cabecera}>
          <Megaphone aria-hidden="true" className={styles.icono} />
          <div className={styles.titulos}>
            <h2 id="comunicado-titulo">Comunicado oficial - Liquidaciones</h2>
            <p>Colegio Médico de Corrientes</p>
          </div>
          <Button variant="plano" className={styles.cerrar} onClick={cerrar} aria-label="Cerrar">
            <X aria-hidden="true" />
          </Button>
        </header>

        <div className={styles.cuerpo}>
          <p className={styles.saludo}>Estimados socios:</p>
          <p>
            Informamos que, debido a trabajos de actualización y remodelación de nuestros sistemas informáticos,
            actualmente no es posible visualizar las últimas liquidaciones a través del nuevo sistema.
          </p>
          <p className={styles.destacado}>
            Por tal motivo, solicitamos a los socios que deseen consultar sus liquidaciones o conocer el detalle de las
            mismas que se acerquen personalmente a la sede del Colegio Médico de Corrientes, donde podrán retirar sus
            recibos y recibir la información correspondiente.
          </p>
          <p>
            Estamos trabajando con la mayor celeridad posible para solucionar esta situación y restablecer el servicio a
            la brevedad. Una vez finalizados los trabajos y habilitada la consulta de liquidaciones en el nuevo sistema,
            se informará oportunamente a todos los socios a través de nuestros canales oficiales.
          </p>
          <p>
            Pedimos disculpas por las molestias ocasionadas y agradecemos su paciencia y comprensión mientras
            continuamos trabajando para mejorar nuestros servicios.
          </p>
          <p className={styles.firma}>
            <strong>Colegio Médico de Corrientes</strong>
            <span>Comisión Directiva</span>
          </p>
        </div>

        <footer className={styles.pie}>
          <Button onClick={cerrar}>Entendido</Button>
        </footer>
      </motion.div>
    </motion.div>,
    document.body
  );
}

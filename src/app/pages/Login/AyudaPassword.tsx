import { AnimatePresence, motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import WhatsappIcon from "@/website/components/UI/icons/WhatsappIcon";
import { CONTACTO, linkWhatsApp } from "@/website/lib/contacto";
import styles from "./Login.module.scss";

const MENSAJE = "Hola, olvidé mi contraseña del sistema del Colegio Médico. Mi número de socio es: ";

type Props = { abierta: boolean };

/**
 * Qué hacer si no recuerda la contraseña. No hay recuperación automática: la
 * blanquea el área de Padrones (POST /api/medicos/{id}/reset-password), así que
 * esto explica el camino y deja el WhatsApp a un toque.
 */
export default function AyudaPassword({ abierta }: Props) {
  return (
    <AnimatePresence initial={false}>
      {abierta && (
        <motion.div
          id="ayuda-password"
          className={styles.ayuda}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className={styles.ayudaCuerpo}>
            <span className={styles.ayudaIcono} aria-hidden="true">
              <KeyRound />
            </span>
            <div>
              <p className={styles.ayudaTitulo}>Te ayudamos a recuperarla</p>
              <p className={styles.ayudaTexto}>
                Si nunca la cambiaste, es tu matrícula provincial. Si no, escribile al área de Padrones y te la
                blanquean.
              </p>
              <a
                className={styles.ayudaBoton}
                href={linkWhatsApp(CONTACTO.whatsapp.padrones, MENSAJE)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsappIcon aria-hidden="true" />
                Escribir a Padrones
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

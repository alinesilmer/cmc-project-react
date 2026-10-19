import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Logo from "../../assets/images/logoCMC-web.png";
import ChatMensaje, { Escribiendo } from "./ChatMensaje";
import { useChatbot } from "./useChatbot";
import EntradaChat from "./EntradaChat";
import { useModal } from "../../hooks/useModal";
import { EASE } from "../../lib/motion";
import styles from "./Chatbot.module.scss";
import Button from "@/website/components/UI/Button/Button";

type Props = { id: string; abierto: boolean; onCerrar: () => void };

/** La ventana del asistente: la conversación, el motor de respuestas y sus intents. */
export default function VentanaChat({ id, abierto, onCerrar }: Props) {
  const { mensajes, escribiendo, chipsVisibles, enviar, elegirChip, chips } = useChatbot();

  const finRef = useRef<HTMLDivElement>(null);

  useModal(abierto, onCerrar);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, escribiendo]);

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <motion.div
          key="backdrop"
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCerrar}
          aria-hidden="true"
        />
      )}

      {abierto && (
        <motion.div
          key="window"
          id={id}
          className={`${styles.window} ${styles.windowExpanded}`}
          role="dialog"
          aria-modal="true"
          aria-label="Asistente CMC"
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.96 }}
          transition={{ duration: 0.22, ease: EASE }}
        >
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.avatar} aria-hidden="true">
                <img src={Logo} alt="" className={styles.avatarImg} />
              </div>
              <div>
                <p className={styles.botName}>Asistente CMC</p>
                <p className={styles.botStatus}>En línea</p>
              </div>
            </div>
            <Button variant="plano" className={styles.closeBtn} onClick={onCerrar} aria-label="Cerrar chat" type="button">
              <X aria-hidden="true" />
            </Button>
          </div>

          <div className={styles.messages} aria-live="polite" aria-relevant="additions" aria-label="Conversación">
            {mensajes.map((m) => (
              <ChatMensaje
                key={m.id}
                mensaje={m}
                ocupado={escribiendo}
                onOpcion={(consulta) => void enviar(consulta)}
                onNavegar={onCerrar}
              />
            ))}

            {escribiendo && <Escribiendo />}

            <div ref={finRef} />
          </div>

          <EntradaChat
            chips={chips}
            mostrarChips={chipsVisibles}
            onChip={elegirChip}
            onEnviar={(t) => void enviar(t)}
            ocupado={escribiendo}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

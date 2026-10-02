import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Logo from "../../assets/images/logoCMC-web.png";
import ChatMensaje, { Escribiendo } from "./ChatMensaje";
import { useChatbot } from "./useChatbot";
import { EVENTO_ABRIR_CHATBOT } from "./abrirChatbot";
import BotonChat from "./BotonChat";
import EntradaChat from "./EntradaChat";
import { useModal } from "../../hooks/useModal";
import { EASE } from "../../lib/motion";
import styles from "./Chatbot.module.scss";

const RUTAS_OCULTO = ["/403", "/panel"];

// Dónde se ofrece el botón flotante. No va en todas: en la portada el chat ya
// se abre desde el hero, y un globito fijo en cada página del sitio es ruido.
// Acá están las dos pantallas a las que se llega justamente con una duda.
const RUTAS_CON_BOTON = ["/contacto", "/preguntas-frecuentes"];
const DIALOG_ID = "cmc-chat-dialog";

export default function Chatbot() {
  const { pathname } = useLocation();
  const oculto = RUTAS_OCULTO.some((p) => pathname.startsWith(p));
  const mostrarBoton = RUTAS_CON_BOTON.some((p) => pathname.startsWith(p));

  const [abierto, setAbierto] = useState(false);
  const { mensajes, escribiendo, chipsVisibles, enviar, elegirChip, chips } = useChatbot();

  const finRef = useRef<HTMLDivElement>(null);

  const cerrar = useCallback(() => setAbierto(false), []);
  useModal(abierto, cerrar);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, escribiendo]);

  useEffect(() => {
    const abrir = () => setAbierto(true);
    window.addEventListener(EVENTO_ABRIR_CHATBOT, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_CHATBOT, abrir);
  }, []);

  if (oculto) return null;

  return createPortal(
    <AnimatePresence>
      {mostrarBoton && !abierto && <BotonChat key="fab" idDialogo={DIALOG_ID} onAbrir={() => setAbierto(true)} />}

      {abierto && (
        <motion.div
          key="backdrop"
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={cerrar}
          aria-hidden="true"
        />
      )}

      {abierto && (
        <motion.div
          key="window"
          id={DIALOG_ID}
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
            <button className={styles.closeBtn} onClick={cerrar} aria-label="Cerrar chat" type="button">
              <X aria-hidden="true" />
            </button>
          </div>

          <div className={styles.messages} aria-live="polite" aria-relevant="additions" aria-label="Conversación">
            {mensajes.map((m) => (
              <ChatMensaje
                key={m.id}
                mensaje={m}
                ocupado={escribiendo}
                onOpcion={(consulta) => void enviar(consulta)}
                onNavegar={cerrar}
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

import { Link } from "react-router-dom";
import WhatsappIcon from "../UI/icons/WhatsappIcon";
import { WHATSAPP_NUMBERS } from "./chatbot.enlaces";
import { buildWhatsAppUrl } from "./chatbot.engine";
import type { ChatMsg } from "./chatbot.types";
import styles from "./ChatMensaje.module.scss";

type Props = {
  mensaje: ChatMsg;
  /** Deshabilita las opciones mientras el bot responde. */
  ocupado: boolean;
  onOpcion: (consulta: string) => void;
  /** Cierra el chat al seguir un enlace interno. */
  onNavegar: () => void;
};

/** Una burbuja de la conversación, con sus enlaces y opciones si las tiene. */
export default function ChatMensaje({ mensaje, ocupado, onOpcion, onNavegar }: Props) {
  const esUsuario = mensaje.role === "user";
  const hayEnlaces = Boolean(mensaje.links?.length || mensaje.whatsapp);

  return (
    <div className={`${styles.bubble} ${esUsuario ? styles.bubbleUser : styles.bubbleBot}`}>
      <p className={styles.bubbleText}>{mensaje.text}</p>

      {hayEnlaces && (
        <div className={styles.linkRow}>
          {mensaje.links?.map((l) =>
            l.external ? (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={styles.linkBtn}>
                {l.label} ↗
              </a>
            ) : (
              <Link key={l.href} to={l.href} className={styles.linkBtn} onClick={onNavegar}>
                {l.label}
              </Link>
            )
          )}

          {mensaje.whatsapp && (
            <a
              href={buildWhatsAppUrl(mensaje.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.linkBtn} ${styles.linkWa}`}
            >
              <WhatsappIcon aria-hidden="true" />
              WhatsApp {WHATSAPP_NUMBERS[mensaje.whatsapp].label}
            </a>
          )}
        </div>
      )}

      {mensaje.menuOptions && mensaje.menuOptions.length > 0 && (
        <div className={styles.menuOptions} role="group" aria-label="Opciones de consulta">
          {mensaje.menuOptions.map((opt) => (
            <button
              key={opt.label}
              type="button"
              className={styles.menuOptionBtn}
              onClick={() => onOpcion(opt.query)}
              disabled={ocupado}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Los tres puntos mientras el asistente «escribe». */
export function Escribiendo() {
  return (
    <div className={`${styles.bubble} ${styles.bubbleBot} ${styles.typingBubble}`} aria-label="El asistente está escribiendo">
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </div>
  );
}

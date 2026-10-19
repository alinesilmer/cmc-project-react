import { MessageCircle } from "lucide-react";
import styles from "./BotonChat.module.scss";
import Button from "@/website/components/UI/Button/Button";

type Props = {
  idDialogo: string;
  onAbrir: () => void;
  /** Se llama al acercar el mouse o enfocar el botón, antes del clic. */
  onPrecargar?: () => void;
};

/** El botón flotante «CONSULTAS» que abre el asistente. */
export default function BotonChat({ idDialogo, onAbrir, onPrecargar }: Props) {
  return (
    <div className={styles.root}>
      <Button variant="plano"
        type="button"
        className={styles.fab}
        onClick={onAbrir}
        onPointerEnter={onPrecargar}
        onFocus={onPrecargar}
        aria-label="Abrir el asistente del Colegio"
        aria-haspopup="dialog"
        aria-controls={idDialogo}
      >
        <span className={styles.fabIcon}>
          <MessageCircle aria-hidden="true" />
        </span>
        <span className={styles.fabLabel}>CONSULTAS</span>
      </Button>
    </div>
  );
}

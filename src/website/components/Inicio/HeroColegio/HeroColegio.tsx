import { ArrowRight, MessageCircle } from "lucide-react";
import Button from "../../UI/Button/Button";
import Revelar from "../../UI/Revelar/Revelar";
import { useIrAlSistema } from "@/website/hooks/useIrAlSistema";
import { abrirChatbot } from "../../Chatbot/abrirChatbot";
import TitularRotativo from "./TitularRotativo";
import SelloColegio from "./SelloColegio";
import styles from "./HeroColegio.module.scss";

/** Portada del sitio: el titular que cambia, el sello que gira y los dos accesos principales. Sin fotos: carga al instante. */
export default function HeroColegio() {
  const { ir } = useIrAlSistema();

  return (
    <section className={styles.hero} aria-label="Portada">
      <div className={styles.contenido}>
        <div className={styles.texto}>
          <TitularRotativo />

          <Revelar className={styles.raya} desde="nada" retraso={0.5} alVerse={false}>
            <span aria-hidden="true" />
          </Revelar>

          <Revelar como="p" className={styles.bajada} retraso={0.35} alVerse={false}>
            Convenios, servicios y gestión en un solo lugar.
          </Revelar>

          <Revelar className={styles.acciones} distancia={12} retraso={0.5} alVerse={false}>
            {/* El mismo botón amarillo que «Ingresar» y «Asociarme». */}
            <Button variant="secondary" size="large" className={styles.boton} icon={<ArrowRight aria-hidden="true" />} onClick={ir}>
              Entrar a Validar
            </Button>
            <Button variant="ghost" size="large" className={styles.boton} iconoIzquierda={<MessageCircle aria-hidden="true" />} onClick={abrirChatbot}>
              Asistente virtual
            </Button>
          </Revelar>
        </div>

        <Revelar className={styles.selloCaja} desde="nada" retraso={0.2} duracion={0.9} alVerse={false}>
          <SelloColegio />
        </Revelar>
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import Button from "../../UI/Button/Button";
import Revelar from "../../UI/Revelar/Revelar";
import { useIrAlSistema } from "../../../hooks/useIrAlSistema";
import { abrirChatbot } from "../../Chatbot/abrirChatbot";
import styles from "./HeroVideo.module.scss";

// Fotos propias, del Cloudinary del Colegio. Antes dos de las tres salían de
// i.pinimg.com: cada visitante de la portada le filtraba su IP y el referer a
// Pinterest, y la rotación se rompía el día que esa URL cambiara.
//
// `q_auto/f_auto` deja que Cloudinary elija calidad y formato según el
// navegador (WebP/AVIF donde se pueda), igual que el hero de Noticias.
// `w_1920,c_limit` la achica al ancho de una pantalla grande: sin eso se
// bajaba la foto original de la cámara (1,2 MB en vez de 176 KB).
const IMAGENES = [
  "https://res.cloudinary.com/dcfkgepmp/image/upload/q_auto/f_auto/w_1920,c_limit/v1767475582/_DSC0055_usaahm.jpg",
  "https://res.cloudinary.com/dcfkgepmp/image/upload/q_auto/f_auto/w_1920,c_limit/v1762471702/quintacmc3_s6sffw.jpg",
] as const;

const ROTACION_MS = 8000;

export default function HeroVideo() {
  const [actual, setActual] = useState(0);
  const { ir } = useIrAlSistema();

  useEffect(() => {
    const t = window.setInterval(() => setActual((i) => (i + 1) % IMAGENES.length), ROTACION_MS);
    return () => window.clearInterval(t);
  }, []);

  return (
    <section className={styles.hero} aria-label="Hero principal">
      <div className={styles.slides} aria-hidden="true">
        {IMAGENES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`${styles.slide} ${i === actual ? styles.slideActive : ""}`}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={i === 0 ? "high" : "auto"}
          />
        ))}
      </div>

      <div className={styles.overlay} aria-hidden="true" />

      <div className={styles.content}>
        <div className={styles.body}>
          <Revelar como="h1" className={styles.title} distancia={22} retraso={0.18} duracion={0.72} alVerse={false}>
            La institución que respalda tu práctica
          </Revelar>

          <Revelar como="p" className={styles.subtitle} retraso={0.3} duracion={0.65} alVerse={false}>
            Representamos y protegemos a los médicos de Corrientes hace más de 70 años.
            Accedé a convenios, servicios y gestión en un solo lugar.
          </Revelar>

          <Revelar className={styles.cta} distancia={12} retraso={0.44} alVerse={false}>
            <Button variant="secondary" size="xlg" onClick={ir}>
              Entrar a Validar
            </Button>
            <Button
              variant="primary"
              size="xlg"
              iconoIzquierda={<MessageCircle aria-hidden="true" />}
              onClick={abrirChatbot}
            >
              Chatbot
            </Button>
          </Revelar>
        </div>
      </div>
    </section>
  );
}

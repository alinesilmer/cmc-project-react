import type { FC } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiAward, FiUsers, FiHeart } from "react-icons/fi";
import Pill from "../../../components/UI/Pill/Pill";
import Button from "../../../components/UI/Button/Button";
import styles from "./HeroVideo.module.scss";

const IMAGES = [
  "https://i.pinimg.com/736x/fd/d3/d8/fdd3d83d55b928e22d751fbc1edcc012.jpg",
  "https://i.pinimg.com/1200x/12/65/5a/12655a0a44d613abc434ea1cc548a5f5.jpg",
  "https://i.pinimg.com/736x/01/bf/d8/01bfd827a566e504c3b5a1202f30be4f.jpg",
];

export const HeroVideo: FC = () => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % IMAGES.length);
    }, 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className={styles.heroSection}>
      <div className={styles.backgroundVideo}>
        {IMAGES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            className={`${styles.slide} ${i === idx ? styles.active : ""}`}
          />
        ))}
      </div>

      <div className={styles.overlay} />

      <div className={styles.content}>
        <motion.div
          className={styles.pills}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <Pill icon={<FiAward />} text="70+ años de servicio" />
          <Pill icon={<FiUsers />} text="400+ obras sociales" />
          <Pill icon={<FiHeart />} text="4000+ vidas impactadas" />
        </motion.div>

        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
        >
          Donde la comunidad y el bienestar se unen
        </motion.h1>

        <motion.div
          className={styles.ctaRow}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
        >
        
          <a href="https://colegiomedicocorrientes.com/">
          <Button variant="primary" size="large">
            Entrar a Validar
          </Button>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroVideo;

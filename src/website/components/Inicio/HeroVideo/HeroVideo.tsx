import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Button from "../../../components/UI/Button/Button";
import styles from "./HeroVideo.module.scss";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../app/auth/AuthProvider";
import { http } from "../../../../app/lib/http";

const IMAGES = [
  "https://i.pinimg.com/736x/fd/d3/d8/fdd3d83d55b928e22d751fbc1edcc012.jpg",
  "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc3_s6sffw.jpg",
  "https://i.pinimg.com/736x/01/bf/d8/01bfd827a566e504c3b5a1202f30be4f.jpg",
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

export const HeroVideo: FC = () => {
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const isAuthenticated = ready && !!user;

  const handleEntrarValidar = async () => {
    if (!isAuthenticated) { navigate("/panel/login"); return; }
    const me = user!;
    let next = "/principal.php";
    if (me.role?.toLowerCase() === "medico" && me.nro_socio) {
      next = `/menu.php?nro_socio1=${encodeURIComponent(String(me.nro_socio))}`;
    }
    try {
      const { data } = await http.get("/auth/legacy/sso-link", { params: { next } });
      window.location.href = data.url;
    } catch {
      navigate("/panel/login");
    }
  };

  useEffect(() => {
    const t = window.setInterval(() => setIdx((i) => (i + 1) % IMAGES.length), 8000);
    return () => window.clearInterval(t);
  }, []);

  const activeSrc = useMemo(() => IMAGES[idx], [idx]);

  return (
    <section className={styles.hero} aria-label="Hero principal">
      <div className={styles.slides} aria-hidden="true">
        {IMAGES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`${styles.slide} ${i === idx ? styles.slideActive : ""}`}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={i === 0 ? "high" : "auto"}
          />
        ))}
      </div>

      <div className={styles.overlay} aria-hidden="true" />

      <div className={styles.content}>
        <div className={styles.body}>

          <motion.h1
            className={styles.title}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, ease: EASE, delay: 0.18 }}
          >
            La institución que respalda tu práctica
          </motion.h1>

          <motion.p
            className={styles.subtitle}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASE, delay: 0.3 }}
          >
            Representamos y protegemos a los médicos de Corrientes hace más de 70 años.
            Accedé a convenios, servicios y gestión en un solo lugar.
          </motion.p>

          <motion.div
            className={styles.cta}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.44 }}
          >
            <Button variant="secondary" size="xlg" onClick={handleEntrarValidar}>
              Entrar a Validar
            </Button>
          </motion.div>
        </div>


      </div>

      <link rel="preload" as="image" href={activeSrc} />
    </section>
  );
};

export default HeroVideo;

import type { FC } from "react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiAward, FiUsers } from "react-icons/fi";
import Pill from "../../../components/UI/Pill/Pill";
import Button from "../../../components/UI/Button/Button";
import styles from "./HeroVideo.module.scss";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../app/auth/AuthProvider";
import { http } from "../../../../app/lib/http";
import InfoHero from "../InfoHero/InfoHero";
import { Info } from "lucide-react";

const IMAGES = [
  "https://res.cloudinary.com/dcfkgepmp/image/upload/v1767383257/White_Gold_And_Black_Modern_Happy_New_Year_Facebook_Cover_wyceso.png",
  "https://i.pinimg.com/736x/fd/d3/d8/fdd3d83d55b928e22d751fbc1edcc012.jpg",
  "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc3_s6sffw.jpg",
  "https://i.pinimg.com/736x/01/bf/d8/01bfd827a566e504c3b5a1202f30be4f.jpg",
];

export const HeroVideo: FC = () => {
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();

  const { user, ready } = useAuth();
  const isAuthenticated = ready && !!user;

  const handleEntrarValidar = async () => {
    if (!isAuthenticated) {
      navigate("/panel/login");
      return;
    }

    const me = user!;
    let next = "/principal.php";
    const isMedico = me.role?.toLowerCase() === "medico";
    if (isMedico && me.nro_socio) {
      next = `/menu.php?nro_socio1=${encodeURIComponent(String(me.nro_socio))}`;
    }

    const { data } = await http.get("/auth/legacy/sso-link", {
      params: { next },
    });
    window.location.href = data.url;
  };

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
          <Pill icon={<FiUsers />} text="70+ obras sociales" />
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
          <Button variant="primary" size="xlg" onClick={handleEntrarValidar}>
            Entrar a Validar
          </Button>
        </motion.div>
      </div>

      {/* ✅ NOW it will actually show (positioned above overlay) */}
      <div className={styles.rightSide}>
        <InfoHero
          items={[
            {
              title: "¡ATENCIÓN!",
              description:
                "Les recordamos que todo el mes de enero la atención es de 7 a 14 hs",
            },
          ]}
        />
      </div>

      <button type="button" className={styles.infoIcon} aria-label="Info">
        <Info />
      </button>
    </section>
  );
};

export default HeroVideo;

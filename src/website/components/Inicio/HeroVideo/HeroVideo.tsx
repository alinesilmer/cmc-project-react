import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";
import { FiAward, FiUsers, FiShield } from "react-icons/fi";
import Pill from "../../../components/UI/Pill/Pill";
import Button from "../../../components/UI/Button/Button";
import styles from "./HeroVideo.module.scss";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../app/auth/AuthProvider";
import { http } from "../../../../app/lib/http";

const IMAGES = [
  "https://i.pinimg.com/736x/fd/d3/d8/fdd3d83d55b928e22d751fbc1edcc012.jpg",
  "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc3_s6sffw.jpg",
  "https://i.pinimg.com/736x/01/bf/d8/01bfd827a566e504c3b5a1202f30be4f.jpg",
];

const FEATURES = [
  {
    icon: FiAward,
    title: "Trayectoria",
    description: "70+ años acompañando a la comunidad médica.",
  },
  {
    icon: FiUsers,
    title: "Obras Sociales",
    description: "Acceso a múltiples convenios y servicios.",
  },
  {
    icon: FiShield,
    title: "Validación",
    description: "Ingresá al sistema para validar y gestionar.",
  },
] as const;

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

    const { data } = await http.get("/auth/legacy/sso-link", { params: { next } });
    window.location.href = data.url;
  };

  useEffect(() => {
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % IMAGES.length);
    }, 8000);
    return () => window.clearInterval(t);
  }, []);

  const activeSrc = useMemo(() => IMAGES[idx], [idx]);

  return (
    <section className={styles.heroSection} aria-label="Hero">
      <div className={styles.backgroundVideo} aria-hidden="true">
        {IMAGES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`${styles.slide} ${i === idx ? styles.active : ""}`}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            // @ts-expect-error fetchpriority supported in modern browsers
            fetchpriority={i === 0 ? "high" : "low"}
          />
        ))}
      </div>

      <div className={styles.overlay} aria-hidden="true" />

      <div className={styles.content}>
        <div className={styles.centerBlock}>
          <div className={styles.pills}>
            <Pill icon={<FiAward />} text="70+ años de servicio" />
            <Pill icon={<FiUsers />} text="70+ obras sociales" />
          </div>

          <h1 className={styles.title}>Colegio Médico de Corrientes</h1>


          <div className={styles.ctaRow}>
            <Button variant="primary" size="xlg" onClick={handleEntrarValidar}>
              Entrar a Validar
            </Button>
          </div>

          <link rel="preload" as="image" href={activeSrc} />
        </div>

      
      </div>

    </section>
  );
};

export default HeroVideo;
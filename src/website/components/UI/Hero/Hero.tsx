import type { StaticImageData } from "next/image";
import styles from "./Hero.module.scss";

interface HeroProps {
  title: string;
  subtitle: string;
  backgroundImage: string | StaticImageData;
}

const Hero = ({ title, subtitle, backgroundImage }: HeroProps) => {
  const bgSrc =
    typeof backgroundImage === "string" ? backgroundImage : backgroundImage.src;

  return (
    <section
      className={styles.hero}
      style={{ backgroundImage: `url(${bgSrc})` }}
    >
      <div className={styles.overlay}>
        <div className={styles.content}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </div>
    </section>
  );
};

export default Hero;

import styles from "./Hero.module.scss";

interface HeroProps {
  title: string;
  subtitle: string;
  backgroundImage: string;
}

const Hero = ({ title, subtitle, backgroundImage }: HeroProps) => {
  return (
    <section
      className={styles.hero}
      style={{ backgroundImage: `url(${backgroundImage})` }}
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

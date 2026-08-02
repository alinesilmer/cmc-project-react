import { useEffect } from "react";
import styles from "./asociados.module.scss";
import MedicosCarousel from "../../components/Nosotros/MedicosCarousel/MedicosCarousel";
import Hero from "../../components/UI/Hero/Hero";

export default function MedicosAsociadosPage() {
  useEffect(() => {
    document.title = "Médicos Asociados | Colegio Médico de Corrientes";
    return () => {
      document.title = "Colegio Médico de Corrientes";
    };
  }, []);

  return (
    <div>
      <Hero
        title="Médicos Asociados"
        subtitle="Conocé a los médicos asociados al Colegio y los servicios que ofrecen"
        backgroundImage="https://res.cloudinary.com/dcfkgepmp/image/upload/v1764368543/20251128_1921_Smiling_Doctors_Ensemble_simple_compose_01kb68shdbej09h82bt2caw19x_ylpvke.png"
      />

      <section
        className={styles.wrapper}
        aria-label="Médicos Asociados al Colegio Médico de Corrientes"
      >
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>Profesionales</span>
            <h2 className={styles.sectionTitle}>Nuestros médicos asociados</h2>
            <p className={styles.sectionLead}>
              Recorré los profesionales asociados al Colegio Médico de
              Corrientes. Hacé clic en una tarjeta para verla en detalle.
            </p>
          </header>

          <MedicosCarousel />
        </div>
      </section>
    </div>
  );
}

import Welcome from "../../components/Inicio/Welcome/Welcome";
import MedicosCarousel from "../../components/Nosotros/MedicosCarousel/MedicosCarousel";
import styles from "../nosotros/nosotros.module.scss";
// import ServicesGrid from "../../components/ServicesGrid/ServicesGrid";
// import DoctorReimbursement from "../../components/DoctorReimbursement/DoctorReimbursement";
import HealthServices from "../../components/Servicios/HealthServices/HealthServices";
import { HeroVideo } from "../../components/Inicio/HeroVideo/HeroVideo";

export default function Home() {
  return (
    <>
      <HeroVideo />
      <main>
        <Welcome />
        {/* <ServicesGrid />
        <DoctorReimbursement />*/}
        <HealthServices />
        {/* CARRUSEL MÉDICOS PROMO */}
        <section className={styles.sectionPromo}>
          <div className={styles.wrapNarrow}>
            {/* <div className={styles.sectionHeader}>
            {/* </div> */}
            <h2 className={styles.h2Center}>Médicos asociados</h2>
          </div>
          <div className={styles.wrap}>
            <MedicosCarousel />
          </div>
        </section>
      </main>
    </>
  );
}

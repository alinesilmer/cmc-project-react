"use client"

import styles from "./asociados.module.scss"
import MedicosCarousel from "../../components/Nosotros/MedicosCarousel/MedicosCarousel";
import Hero from "../../components/UI/Hero/Hero";

export default function ServiciosPage() {

  return (
    <div>
    <div>
     <Hero
      title="Médicos Asociados"
      subtitle="Conocé a los médicos asociados al Colegio y los servicios que ofrecen"
      backgroundImage={"https://res.cloudinary.com/dcfkgepmp/image/upload/v1764368543/20251128_1921_Smiling_Doctors_Ensemble_simple_compose_01kb68shdbej09h82bt2caw19x_ylpvke.png"}
      />
      </div>
    <section className={styles.wrapper} aria-label="Médicos Asociados al Colegio Médico de Corrientes">
    

      <div className={styles.cards} >
       <MedicosCarousel/>
      </div>
    </section>
    </div>
  )
}

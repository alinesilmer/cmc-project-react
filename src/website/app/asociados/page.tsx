import styles from "./asociados.module.scss";
import MedicosDirectorio from "../../components/Asociados/MedicosDirectorio/MedicosDirectorio";
import Hero from "../../components/UI/Hero/Hero";
import { useTituloPagina } from "../../lib/useTituloPagina";

export default function MedicosAsociadosPage() {
  useTituloPagina("Médicos Asociados");

  return (
    <div>
      <Hero
        title="Médicos Asociados"
        subtitle="Conocé a los médicos asociados al Colegio y los servicios que ofrecen"
        backgroundImage="https://res.cloudinary.com/dcfkgepmp/image/upload/v1764368543/20251128_1921_Smiling_Doctors_Ensemble_simple_compose_01kb68shdbej09h82bt2caw19x_ylpvke.png"
      />

      <section
        className={styles.wrapper}
        aria-labelledby="titulo-asociados"
      >
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>Profesionales</span>
            <h2 id="titulo-asociados" className={styles.sectionTitle}>
              Avisos de nuestros asociados
            </h2>
            {/* La lista sale de `/api/publicidad-medicos`: son los socios que
                publicaron su aviso, no el padrón. Decirlo acá evita que alguien
                concluya que un médico no está asociado porque no aparece. */}
            <p className={styles.sectionLead}>
              Estos son algunos de los médicos asociados: los que publicaron su
              aviso profesional. No es el padrón completo, así que si no
              encontrás a quien buscás, consultanos en el Colegio.
            </p>
          </header>

          <MedicosDirectorio />
        </div>
      </section>
    </div>
  );
}

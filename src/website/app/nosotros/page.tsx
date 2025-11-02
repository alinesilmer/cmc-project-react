import MedicosCarousel from "../../components/Nosotros/MedicosCarousel/MedicosCarousel"
import DirectivosCarousel from "../../components/Nosotros/DirectivosCarousel/DirectivosCarousel"
import styles from "./nosotros.module.scss"
import PageHero from "../../components/UI/Hero/Hero";

export default function NosotrosPage() {
  return (
    <div className={styles.page}>
       <PageHero
        title="Nosotros"
        subtitle="Conocé nuestra historia, misión, visión y los valores que nos guían."
        backgroundImage="https://i.pinimg.com/1200x/e8/d9/29/e8d9299c4850c5f45ca246ddfcc2089d.jpg"
      />
    

      {/* HISTORIA */}
      <section className={styles.sectionWhite}>
        <div className={styles.wrapNarrow}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Nuestra trayectoria</span>
            <h2 className={styles.h2}>Historia</h2>
          </div>
          <p className={styles.lead}>
            Desde nuestros inicios, trabajamos para fortalecer la comunidad médica de Corrientes, promoviendo el
            desarrollo profesional y el acceso a servicios que faciliten la práctica diaria.
          </p>
        </div>
      </section>

      {/* MISIÓN (franja azul) */}
      <section className={styles.bandBlue}>
        <div className={styles.wrapSplit}>
          <div className={styles.bandTitle}>
            <span className={styles.bandIcon}>🎯</span>
            Nuestra misión
          </div>
          <div className={styles.bandText}>
            <p>
              Acompañar a las y los profesionales de la salud brindando herramientas, representación y servicios que
              potencien su crecimiento, con foco en la calidad, la transparencia y el compromiso social.
            </p>
            <p>
              Impulsamos iniciativas que mejoren las condiciones del ejercicio profesional y promuevan el bienestar de
              la comunidad.
            </p>
          </div>
        </div>
        <div className={styles.bandDecor}></div>
      </section>

      {/* VISIÓN (franja azul con imagen) */}
      <section className={styles.bandBlueWithImage}>
        <div className={styles.wrapSplit}>
          <div className={styles.bandTitle}>
            <span className={styles.bandIcon}>🔭</span>
            Nuestra visión
          </div>
          <div className={styles.bandText}>
            <p>
              Ser una institución de referencia en innovación y calidad de servicios, fortaleciendo lazos con entidades
              públicas y privadas para generar impacto positivo y sostenido en el sistema de salud.
            </p>
            <p>Construimos una red colaborativa que fomenta el desarrollo continuo y la excelencia.</p>
          </div>
        </div>

       
      </section>

      {/* VALORES */}
      <section className={styles.sectionWhite}>
        <div className={styles.wrapNarrow}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Lo que nos define</span>
            <h2 className={styles.h2}>Nuestros valores</h2>
          </div>
          <div className={styles.valuesGrid}>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>💙</div>
              <h3>Compromiso</h3>
              <p>Con la comunidad y la ética profesional.</p>
            </div>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>🔍</div>
              <h3>Transparencia</h3>
              <p>En la gestión y en la comunicación.</p>
            </div>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>🤝</div>
              <h3>Colaboración</h3>
              <p>Trabajo colaborativo y enfoque en la mejora continua.</p>
            </div>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>💡</div>
              <h3>Innovación</h3>
              <p>Para brindar mejores servicios y experiencias.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CARRUSEL DIRECTIVOS */}
      <section className={styles.sectionGray}>
        <div className={styles.wrapNarrow}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Nuestro equipo</span>
            <h2 className={styles.h2Center}>Directivos</h2>
          </div>
          <p className={styles.pCenter}>Conocé al equipo que lidera el Colegio y representa a la comunidad médica.</p>
        </div>
        <div className={styles.wrap}>
          <DirectivosCarousel />
        </div>
      </section>

      {/* COMISIONES Y TRIBUNAL */}
      <section className={styles.sectionWhite}>
        <div className={styles.wrap}>
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <span className={styles.infoIcon}>📋</span>
                <h2>Comisiones</h2>
              </div>
              <p>
                Las comisiones trabajan por áreas específicas para impulsar proyectos y atender necesidades puntuales de
                la comunidad. Próximamente publicaremos la composición y agenda de cada comisión.
              </p>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <span className={styles.infoIcon}>⚖️</span>
                <h2>Tribunal de Ética</h2>
              </div>
              <p>
                Órgano encargado de velar por el cumplimiento de los principios éticos de la profesión. Su labor
                garantiza el ejercicio responsable y el respeto a las normativas vigentes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CARRUSEL MÉDICOS PROMO */}
      <section className={styles.sectionPromo}>
        <div className={styles.wrapNarrow}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Nuestra comunidad</span>
            <h2 className={styles.h2Center}>Médicos asociados</h2>
          </div>
         
        </div>
        <div className={styles.wrap}>
          <MedicosCarousel />
        </div>
      </section>
    </div>
  )
}

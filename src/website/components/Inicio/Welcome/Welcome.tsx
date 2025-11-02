import { Link } from "react-router-dom";
import styles from "./Welcome.module.scss";
import Button from "../../../components/UI/Button/Button";
import CategoryCard from "../../../components/UI/CategoryCard/CategoryCard";

export default function Welcome() {
  return (
    <section className={styles.hero}>
      <div className={styles.wrap}>
        <div className={styles.bigCard}>
          <h2 className={styles.bigCardTitle}>Comunidad médica</h2>

          <div className={styles.tagline}>
            <span className={styles.badge}>Servicio de trámites</span>
            <span className={styles.badge}>Acompañamiento profesional</span>
          </div>

          <p className={styles.lead}>
            Si buscás una forma simple y confiable de gestionar tu práctica, estamos para acompañarte. Unite al Colegio
            y accedé a servicios, beneficios y soporte que facilitan tu día a día.
          </p>

          <div className={styles.ctaRow}>
            <Link to="/auth/register">
              <Button variant="secondary" size="small">Asociarme</Button>
            </Link>
          </div>

          <img
            src="https://png.pngtree.com/png-vector/20240205/ourmid/pngtree-professional-doctor-with-order-png-image_11626748.png"
            alt="Profesional de la salud"
          />
        </div>

        <div className={styles.cardsContainer}>
          <CategoryCard
            title="Recepción y Liquidación de Facturación"
            description="Recepción y Liquidación de Facturación"
            color="teal"
            href="https://comecorammeco.com/web/"
          />
          <CategoryCard
            title="Entrar a Validar"
            description="Recepción de Facturación"
            color="orange"
            href="https://colegiomedicocorrientes.com/"
          />
          <CategoryCard
            title="Noticias"
            description="Actualizaciones, comunicados y eventos del Colegio."
            color="blue"
            href="/noticias"
          />
          <CategoryCard
            title="Contacto"
            description="Horarios, teléfonos y canales de atención para ayudarte."
            color="mint"
            href="/contacto"
          />
        </div>
      </div>
    </section>
  );
}

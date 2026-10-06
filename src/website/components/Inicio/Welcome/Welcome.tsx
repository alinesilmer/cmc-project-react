import { Award, BookOpen, Headphones, Shield, UserCheck, UserPlus, Users } from "lucide-react";
import Button from "../../UI/Button/Button";
import LineaPulso from "../../UI/LineaPulso/LineaPulso";
import Pilares, { type Pilar } from "../../UI/Pilares/Pilares";
import Revelar from "../../UI/Revelar/Revelar";
import styles from "./Welcome.module.scss";

const BENEFICIOS: Pilar[] = [
  { icono: UserCheck, titulo: "Ejercicio legal" },
  { icono: Shield, titulo: "Defensa profesional" },
  { icono: BookOpen, titulo: "Formación continua" },
  { icono: Award, titulo: "Ética y calidad" },
  { icono: Headphones, titulo: "Asesoramiento" },
  { icono: Users, titulo: "Comunidad médica" },
];

/** Debajo del hero: por qué ser parte del Colegio y el botón para asociarse. */
export default function Welcome() {
  return (
    <section className={styles.bienvenida} aria-labelledby="bienvenida">
      <Revelar className={styles.texto}>
        <h2 id="bienvenida" className={styles.titulo}>
          Donde la <em>comunidad</em> y el <em>bienestar</em> se unen
        </h2>
        <LineaPulso className={styles.pulso} />
        <p className={styles.bajada}>Respaldo institucional para el ejercicio de la medicina.</p>
        <Button to="/socios" size="large" className={styles.boton} iconoIzquierda={<UserPlus />}>
          Asociarme
        </Button>
      </Revelar>

      <Pilares items={BENEFICIOS} columnas={2} />
    </section>
  );
}

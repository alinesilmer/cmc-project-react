import AccesosRapidos from "../../components/Inicio/AccesosRapidos/AccesosRapidos";
import Welcome from "../../components/Inicio/Welcome/Welcome";
import HealthServices from "../../components/Servicios/HealthServices/HealthServices";
import HeroVideo from "../../components/Inicio/HeroVideo/HeroVideo";
import { useTituloPagina } from "../../hooks/useTituloPagina";
import styles from "./inicio.module.scss";

export default function Home() {
  useTituloPagina("Inicio");

  return (
    <>
      <HeroVideo />
      <main>
        <div className={styles.secciones}>
          <Welcome />
          <AccesosRapidos />
          <HealthServices />
        </div>
      </main>
    </>
  );
}

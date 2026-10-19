import AccesosRapidos from "../../components/Inicio/AccesosRapidos/AccesosRapidos";
import Welcome from "../../components/Inicio/Welcome/Welcome";
import HealthServices from "../../components/Servicios/HealthServices/HealthServices";
import HeroColegio from "../../components/Inicio/HeroColegio/HeroColegio";
import FranjaPulso from "../../components/Inicio/FranjaPulso/FranjaPulso";
import UltimasNoticias from "../../components/Inicio/UltimasNoticias/UltimasNoticias";
import { useTituloPagina } from "../../hooks/useTituloPagina";
import styles from "./inicio.module.scss";

export default function Home() {
  useTituloPagina("Inicio");

  return (
    <>
      <HeroColegio />
      <FranjaPulso />
      <div className={styles.fondo}>
        <div className={styles.secciones}>
          <Welcome />
          <UltimasNoticias />
          <AccesosRapidos />
          <HealthServices oscuro />
        </div>
      </div>
    </>
  );
}

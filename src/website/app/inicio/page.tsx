import Welcome from "../../components/Inicio/Welcome/Welcome";
import HealthServices from "../../components/Servicios/HealthServices/HealthServices";
import HeroVideo from "../../components/Inicio/HeroVideo/HeroVideo";
import { useTituloPagina } from "../../hooks/useTituloPagina";

export default function Home() {
  useTituloPagina("Inicio");

  return (
    <>
      <HeroVideo />
      <main>
        <Welcome />
        <HealthServices />
      </main>
    </>
  );
}

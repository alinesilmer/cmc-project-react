import Welcome from "../../components/Inicio/Welcome/Welcome";
import HealthServices from "../../components/Servicios/HealthServices/HealthServices";
import { HeroVideo } from "../../components/Inicio/HeroVideo/HeroVideo";

export default function Home() {
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

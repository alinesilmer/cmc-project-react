import Welcome from "../../components/Inicio/Welcome/Welcome";
import HealthServices from "../../components/Servicios/HealthServices/HealthServices";
import { HeroVideo } from "../../components/Inicio/HeroVideo/HeroVideo";
import PromoModal from "../../components/Inicio/PromoModal/PromoModal";

import promoImage from "../../../app/assets/ad-prevencion.jpeg";

export default function Home() {
  return (
    <>
      <PromoModal
        imageSrc={promoImage}
        imageAlt="Gran convenio exclusivo — Prevención Salud de SANCOR SEGUROS"
        contacts={[
          { name: "Yanina", phone: "3794006475" },
          { name: "Belén",  phone: "3795860073" },
        ]}
        storageKey="cmc-promo-prevencion-v1"
      />
      <HeroVideo />
      <main>
        <Welcome />
        <HealthServices />
      </main>
    </>
  );
}

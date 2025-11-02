
import Welcome from "../../components/Inicio/Welcome/Welcome";
// import ServicesGrid from "../../components/ServicesGrid/ServicesGrid";
// import DoctorReimbursement from "../../components/DoctorReimbursement/DoctorReimbursement";
import HealthServices from "../../components/Servicios/HealthServices/HealthServices";
import { HeroVideo } from "../../components/Inicio/HeroVideo/HeroVideo";

export default function Home() {
  return (
    <>
      <HeroVideo />
      <main>
        <Welcome />
        {/* <ServicesGrid />
        <DoctorReimbursement />*/}
        <HealthServices />
      </main>
    </>
  );
}

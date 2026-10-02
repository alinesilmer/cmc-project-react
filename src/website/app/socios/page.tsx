import ContenedorPagina from "../../components/UI/ContenedorPagina/ContenedorPagina";
import HeroSocios from "./components/HeroSocios";
import Requisitos from "./components/Requisitos";
import InfoSocios from "./components/InfoSocios";
import { useTituloPagina } from "../../hooks/useTituloPagina";

export default function SociosPage() {
  useTituloPagina("Quiero ser Socio");

  return (
    <ContenedorPagina>
      <HeroSocios />
      <Requisitos />
      <InfoSocios />
    </ContenedorPagina>
  );
}

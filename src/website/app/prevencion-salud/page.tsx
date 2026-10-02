import { Percent, Users } from "lucide-react";
import ContenedorPagina from "../../components/UI/ContenedorPagina/ContenedorPagina";
import CabeceraFresca from "../../components/UI/CabeceraFresca/CabeceraFresca";
import Asesoras from "../../components/Servicios/PrevencionSalud/Asesoras";
import PrevencionSalud from "../../components/Servicios/PrevencionSalud/PrevencionSalud";
import { useTituloPagina } from "../../hooks/useTituloPagina";

const DESTACADOS = [
  { icono: Percent, texto: "Descuento exclusivo" },
  { icono: Users, texto: "Grupo familiar" },
];

export default function PrevencionSaludPage() {
  useTituloPagina("Prevención Salud");

  return (
    <ContenedorPagina>
      <CabeceraFresca
        titulo={
          <>
            Prevención <span>Salud</span>
          </>
        }
        bajada="Tu plan, con descuento de socio."
        lema={
          <>
            Para vos y <em>tu familia.</em>
          </>
        }
        destacados={DESTACADOS}
      >
        <Asesoras />
      </CabeceraFresca>

      <PrevencionSalud />
    </ContenedorPagina>
  );
}

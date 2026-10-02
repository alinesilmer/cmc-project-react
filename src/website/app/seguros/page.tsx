import { ShieldCheck, Users } from "lucide-react";
import ContenedorPagina from "../../components/UI/ContenedorPagina/ContenedorPagina";
import CabeceraFresca from "../../components/UI/CabeceraFresca/CabeceraFresca";
import Button from "../../components/UI/Button/Button";
import WhatsappIcon from "../../components/UI/icons/WhatsappIcon";
import AlianzaNoble from "../../components/Servicios/Seguros/AlianzaNoble";
import { CONSULTAR_SEGUROS } from "../../components/Servicios/Seguros/consulta";
import { useTituloPagina } from "../../hooks/useTituloPagina";

const DESTACADOS = [
  { icono: ShieldCheck, texto: "Convenio vigente" },
  { icono: Users, texto: "Para socios" },
];

export default function SegurosPage() {
  useTituloPagina("Seguro médico");

  return (
    <ContenedorPagina>
      <CabeceraFresca
        titulo={
          <>
            Asegurados con <span>NOBLE</span>
          </>
        }
        bajada="El Colegio trabaja con NOBLE Seguros."
        lema={
          <>
            Tu práctica, <em>protegida.</em>
          </>
        }
        destacados={DESTACADOS}
        acciones={
          <Button href={CONSULTAR_SEGUROS} variant="secondary" size="large" iconoIzquierda={<WhatsappIcon />}>
            Consultar
          </Button>
        }
      >
        <AlianzaNoble />
      </CabeceraFresca>
    </ContenedorPagina>
  );
}

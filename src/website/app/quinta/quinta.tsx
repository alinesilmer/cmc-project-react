import { Clock, Waves } from "lucide-react";
import ContenedorPagina from "../../components/UI/ContenedorPagina/ContenedorPagina";
import CabeceraFresca from "../../components/UI/CabeceraFresca/CabeceraFresca";
import Button from "../../components/UI/Button/Button";
import WhatsappIcon from "../../components/UI/icons/WhatsappIcon";
import Quinta from "../../components/Servicios/Quinta/Quinta";
import { RESERVAR_QUINTA } from "../../components/Servicios/Quinta/reserva";
import { useTituloPagina } from "../../hooks/useTituloPagina";

const DESTACADOS = [
  { icono: Waves, texto: "Pileta en temporada" },
  { icono: Clock, texto: "Lun a vie · 8 a 14 h" },
];

export default function QuintaPage() {
  useTituloPagina("Quinta");

  return (
    <ContenedorPagina>
      <CabeceraFresca
        titulo={
          <>
            La <span>Quinta</span>
          </>
        }
        bajada="Pileta y aire libre para socios."
        lema={
          <>
            Tu lugar para <em>desconectar.</em>
          </>
        }
        destacados={DESTACADOS}
        compacto
        acciones={
          <Button href={RESERVAR_QUINTA} variant="secondary" size="large" iconoIzquierda={<WhatsappIcon />}>
            Reservar
          </Button>
        }
      />

      <Quinta />
    </ContenedorPagina>
  );
}

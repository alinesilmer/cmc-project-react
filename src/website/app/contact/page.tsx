import { Clock, MapPin } from "lucide-react";
import ContenedorPagina from "../../components/UI/ContenedorPagina/ContenedorPagina";
import CabeceraFresca from "../../components/UI/CabeceraFresca/CabeceraFresca";
import Revelar from "../../components/UI/Revelar/Revelar";
import AccionesContacto from "../../components/Contacto/AccionesContacto/AccionesContacto";
import MapaSede from "./MapaSede";
import { useTituloPagina } from "../../hooks/useTituloPagina";
import { CONTACTO } from "../../lib/contacto";

const DESTACADOS = [
  { icono: Clock, texto: "Lun a vie · 7 a 15 h" },
  { icono: MapPin, texto: CONTACTO.direccion },
];

export default function Contacto() {
  useTituloPagina("Contacto");

  return (
    <ContenedorPagina>
      <CabeceraFresca
        titulo={<span>Hablemos</span>}
        bajada="Elegí cómo."
        lema={
          <>
            Estamos <em>para vos.</em>
          </>
        }
        destacados={DESTACADOS}
        compacto
      />

      <AccionesContacto mensajeWhatsApp="Hola, quisiera hacer una consulta al Colegio Médico." />

      <Revelar>
        <MapaSede />
      </Revelar>
    </ContenedorPagina>
  );
}

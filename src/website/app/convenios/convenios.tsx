import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Handshake, ShieldCheck } from "lucide-react";
import ContenedorPagina from "../../components/UI/ContenedorPagina/ContenedorPagina";
import CabeceraFresca from "../../components/UI/CabeceraFresca/CabeceraFresca";
import Buscador from "../../components/UI/Buscador/Buscador";
import BandaInvitacion from "../../components/UI/BandaInvitacion/BandaInvitacion";
import ObrasSociales from "../../components/Servicios/ObrasSociales/ObrasSociales";
import { useTituloPagina } from "../../hooks/useTituloPagina";
import { listObrasSocialesPublicas, OBRAS_SOCIALES_KEY } from "../../lib/obrasSociales.client";
import { CONTACTO, CONVENIO } from "../../lib/contacto";

export default function ConveniosPage() {
  useTituloPagina("Convenios");
  const [busqueda, setBusqueda] = useState("");

  const { data: obras = [], isPending, isError } = useQuery({
    queryKey: OBRAS_SOCIALES_KEY,
    queryFn: ({ signal }) => listObrasSocialesPublicas(signal),
    staleTime: 10 * 60 * 1000,
  });

  // El número sale de la lista real; mientras carga, sólo la palabra.
  const destacados = [
    { icono: Handshake, texto: obras.length > 0 ? `${obras.length} convenios` : "Convenios" },
    { icono: ShieldCheck, texto: "Vigentes" },
  ];

  return (
    <ContenedorPagina>
      <CabeceraFresca
        titulo={
          <>
            Obras <span>sociales</span>
          </>
        }
        bajada="Con convenio vigente."
        lema={
          <>
            Más convenios, <em>más pacientes.</em>
          </>
        }
        destacados={destacados}
        compacto
      >
        <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar obra social…" etiqueta="Buscar obra social" />
      </CabeceraFresca>

      <ObrasSociales obras={obras} busqueda={busqueda} loading={isPending} error={isError} />

      <BandaInvitacion
        titulo={
          <>
            ¿Sos una obra social? <em>Sumate.</em>
          </>
        }
        bajada="Firmá convenio con el Colegio: escribinos o mandá tu carta de presentación."
        whatsapp={{ numero: CONTACTO.whatsapp.sede, visible: CONTACTO.telefono.corto, mensaje: CONVENIO.mensajeWhatsApp }}
        email={{ direccion: CONVENIO.email, asunto: CONVENIO.asuntoEmail, cuerpo: CONVENIO.cuerpoEmail }}
      />
    </ContenedorPagina>
  );
}

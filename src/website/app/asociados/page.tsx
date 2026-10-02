import { Search, Stethoscope } from "lucide-react";
import ContenedorPagina from "../../components/UI/ContenedorPagina/ContenedorPagina";
import CabeceraFresca from "../../components/UI/CabeceraFresca/CabeceraFresca";
import MedicosDirectorio from "../../components/Asociados/MedicosDirectorio/MedicosDirectorio";
import { useTituloPagina } from "../../hooks/useTituloPagina";

const DESTACADOS = [
  { icono: Search, texto: "Buscá por nombre" },
  { icono: Stethoscope, texto: "Tocá para ver el aviso" },
];

export default function MedicosAsociadosPage() {
  useTituloPagina("Médicos Asociados");

  return (
    <ContenedorPagina>
      {/* La lista sale de `/api/publicidad-medicos`: son los socios que
          publicaron su aviso, no el padrón. La bajada lo dice para que nadie
          concluya que un médico no está asociado porque no aparece. */}
      <CabeceraFresca
        titulo={
          <>
            Médicos <span>asociados</span>
          </>
        }
        bajada="Sólo quienes publicaron su aviso."
        lema={
          <>
            Encontrá <em>a tu médico.</em>
          </>
        }
        destacados={DESTACADOS}
        compacto
      />
      <section aria-label="Avisos de médicos asociados">
        <MedicosDirectorio />
      </section>
    </ContenedorPagina>
  );
}

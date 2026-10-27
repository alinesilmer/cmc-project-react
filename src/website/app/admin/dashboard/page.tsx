import { Globe } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import PublicacionesAdmin from "../publicaciones/PublicacionesAdmin";
import AdminMedicosPromo from "../MedicosPromo/MedicosPromo";
import ValoresEticos from "../valoresEticos/ValoresEticos";
import PaginaPasos from "@/app/components/layout/PaginaPasos/PaginaPasos";
import { Solapa } from "@/app/components/layout/Franja/Franja";

const SOLAPAS = [
  { id: "noticias", etiqueta: "Publicaciones" },
  { id: "promo", etiqueta: "Publicidad de doctores" },
  { id: "etica", etiqueta: "Valores Éticos" },
] as const;

type SolapaId = (typeof SOLAPAS)[number]["id"];

const esSolapa = (v: string | null): v is SolapaId => SOLAPAS.some((s) => s.id === v);

/** Administrador del contenido del sitio (/panel/sitio). */
export default function DashboardPage() {
  // La solapa sale de la URL para que `?tab=promo` siga siendo enlazable: es a donde redirige la vieja dirección del sitio (/admin/medicos-promo).
  const [params, setParams] = useSearchParams();
  const pedida = params.get("tab");
  const solapa: SolapaId = esSolapa(pedida) ? pedida : "noticias";
  const elegir = (s: SolapaId) => setParams(s === "noticias" ? {} : { tab: s }, { replace: true });

  return (
    <PaginaPasos
      titulo="Contenido del sitio"
      icono={Globe}
      ancha
      solapas={SOLAPAS.map((s) => (
        <Solapa key={s.id} activa={solapa === s.id} onClick={() => elegir(s.id)}>
          {s.etiqueta}
        </Solapa>
      ))}
    >
      {solapa === "noticias" && <PublicacionesAdmin />}
      {solapa === "promo" && <AdminMedicosPromo />}
      {solapa === "etica" && <ValoresEticos />}
    </PaginaPasos>
  );
}

import { FileText } from "lucide-react";

import { abrirAdjunto } from "@/app/shared/lib/archivos";
import Franja from "@/app/components/layout/Franja/Franja";
import { useNotify } from "../../hooks/useNotify";
import ListaPlanillas from "./components/ListaPlanillas";
import { usePlanillas } from "./usePlanillas";
import { urlPlanilla, type Planilla } from "./planillas.types";
import s from "./Planillas.module.scss";

/** Planillas de consulta publicadas por el Colegio, en versión sólo lectura. */
export default function PlanillasMedico() {
  // Se desestructura `error`: `useNotify()` devuelve un objeto nuevo en cada render, así que el objeto entero como dependencia relanzaría el efecto en bucle.
  const { error: avisarError } = useNotify();
  const { planillas, cargando } = usePlanillas(avisarError);

  const ver = (p: Planilla) =>
    abrirAdjunto(urlPlanilla(p)).catch((e) => avisarError(e.message));

  return (
    <div className={s.container}>
      <Franja titulo="Planillas" icono={FileText} />

      <ListaPlanillas
        planillas={planillas}
        cargando={cargando}
        vacio="Todavía no hay planillas."
        onVer={ver}
      />
    </div>
  );
}

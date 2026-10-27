import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Info } from "lucide-react";

import { listObrasSociales } from "@/app/pages/ObrasSociales/obrasSociales.api";
import { OBRAS_SOCIALES_KEY } from "@/app/pages/ObrasSociales/useObrasSociales";
import { observacionesPorOS } from "@/app/pages/BoletinMedico/boletinMedico.api";
import DiaLimite from "./DiaLimite";
import s from "./PanelObraSocial.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

type Chip = "calendario" | "info";

interface Props {
  /** NRO_OBRA_SOCIAL; sin número no hay día límite ni observaciones que buscar. */
  codigo: number | null;
}

const DIEZ_MINUTOS = 10 * 60 * 1000;

/** Columna derecha de la carga: «Calendario» (día límite) e «Info» (observaciones de la obra social). */
export default function PanelObraSocial({ codigo }: Props) {
  const [chip, setChip] = useState<Chip>("calendario");

  // Mismo caché que el resto del panel.
  const catalogo = useQuery({
    queryKey: OBRAS_SOCIALES_KEY,
    queryFn: () => listObrasSociales(),
    staleTime: DIEZ_MINUTOS,
    enabled: codigo !== null,
  });
  const observaciones = useQuery({
    queryKey: ["boletin-observaciones"],
    queryFn: observacionesPorOS,
    staleTime: DIEZ_MINUTOS,
    // Se pide de entrada para mostrar la cuenta en la solapa «Info».
    enabled: codigo !== null,
  });

  const dia = catalogo.data?.find((o) => o.nro_obra_social === codigo)?.dia_corte;
  const lineas = codigo === null ? [] : (observaciones.data?.get(codigo) ?? []);

  return (
    <aside className={s.panel}>
      <div className={s.chips} role="tablist" aria-label="Datos de la obra social">
        <BotonPlano
          type="button"
          role="tab"
          aria-selected={chip === "calendario"}
          className={`${s.chip} ${chip === "calendario" ? s.chipActivo : ""}`}
          onClick={() => setChip("calendario")}
        >
          <CalendarDays size={18} aria-hidden="true" /> Calendario
        </BotonPlano>
        <BotonPlano
          type="button"
          role="tab"
          aria-selected={chip === "info"}
          className={`${s.chip} ${chip === "info" ? s.chipActivo : ""}`}
          onClick={() => setChip("info")}
        >
          <Info size={18} aria-hidden="true" /> Info
          {lineas.length > 0 && (
            <span className={s.cuenta} aria-label={`${lineas.length} observaciones`}>
              {lineas.length}
            </span>
          )}
        </BotonPlano>
      </div>

      {chip === "calendario" ? (
        <div className={s.contenido}>
          {dia != null && <DiaLimite dia={dia} compacto />}
        </div>
      ) : (
        <div className={s.info}>
          <h3 className={s.infoTitulo}>
            <span className={s.infoIcono} aria-hidden="true">
              <Info size={18} />
            </span>
            Observaciones de la obra social
          </h3>
          {observaciones.isPending ? (
            <p className={s.vacio}>Cargando…</p>
          ) : lineas.length === 0 ? (
            <p className={s.vacio}>Esta obra social no tiene observaciones.</p>
          ) : (
            <ol className={s.lista}>
              {lineas.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </aside>
  );
}

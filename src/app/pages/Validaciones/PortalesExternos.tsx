import { useState } from "react";
import { Globe, Info } from "lucide-react";

import { OBRAS_EXTERNAS } from "./validaciones.config";
import type { ObraSocialConfig } from "./validaciones.types";
import ObraSocialCard, {
  obraSocialCardStyles as card,
} from "./components/ObraSocialCard";
import GuiaPortalModal from "./components/GuiaPortalModal";
import RequisitosModal from "./components/RequisitosModal";
import s from "./PortalesExternos.module.scss";
import BackButton from "@/app/components/ui/BackButton/BackButton";

/** Sólo las obras sociales que se validan fuera del panel. */
export default function PortalesExternos() {
  const [guia, setGuia] = useState<ObraSocialConfig | null>(null);
  const [requisitos, setRequisitos] = useState<ObraSocialConfig | null>(null);

  return (
    <div className={s.container}>
      <BackButton label="Validaciones" to="/panel/validaciones" />

      <header className={s.header}>
        <Globe size={32} className={s.headerIcon} />
        <div>
          <h1 className={s.title}>Portales de obras sociales</h1>
          <p className={s.subtitle}>
            Estas obras sociales se validan fuera del panel. Hacé click para entrar
            directo al portal que corresponde.
          </p>
        </div>
      </header>

      <div className={card.grid}>
        {OBRAS_EXTERNAS.map((os) => (
          <ObraSocialCard key={os.slug} os={os} onAbrirGuia={setGuia} onRequisitos={setRequisitos} />
        ))}
      </div>

      <p className={s.pie}>
        <Info size={15} />
        ¿Necesitás usuario o clave para alguno de estos portales? Consultá en el
        Colegio Médico de lunes a viernes de 8 a 14 h.
      </p>

      {guia && <GuiaPortalModal os={guia} onClose={() => setGuia(null)} />}
      {requisitos && <RequisitosModal os={requisitos} onClose={() => setRequisitos(null)} />}
    </div>
  );
}

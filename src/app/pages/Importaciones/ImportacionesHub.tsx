import { FileUp } from "lucide-react";

import Franja from "@/app/components/layout/Franja/Franja";
import Carpeta, { carpetaStyles } from "@/app/pages/Validaciones/components/Carpeta";
import { IMPORTADORES } from "./importaciones.config";
import s from "./ImportacionesHub.module.scss";

/** Importaciones masivas de prestaciones. */
export default function ImportacionesHub() {
  return (
    <div className={s.container}>
      <Franja titulo="Importaciones" icono={FileUp} />

      <div className={carpetaStyles.grid}>
        {IMPORTADORES.map((imp) => (
          <Carpeta
            key={imp.slug}
            nombre={imp.nombre}
            logo={imp.logo}
            href={`/panel/importaciones/${imp.slug}`}
            deshabilitada={!imp.disponible}
            aviso="Próximamente"
          />
        ))}
      </div>
    </div>
  );
}

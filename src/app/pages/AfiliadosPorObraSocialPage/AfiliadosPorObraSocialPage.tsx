import { useState } from "react";
import { Building2, UserRound, type LucideIcon, FolderOpen } from "lucide-react";

import { usePermisos } from "@/app/auth/usePermisos";
import PorObraSocial from "./PorObraSocial";
import PorSocio from "./PorSocio";
import comun from "./Comun.module.scss";
import styles from "./AfiliadosPorObraSocialPage.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";;

type Vista = "obra-social" | "socio";

// Cada solapa pide el permiso de la ruta que antes tenía su propia pantalla (`/panel/afiliadospadron` y `/panel/padron-socio`).
const SOLAPAS: {
  id: Vista;
  titulo: string;
  icono: LucideIcon;
  permiso: string;
}[] = [
  {
    id: "obra-social",
    titulo: "Por obra social",
    icono: Building2,
    permiso: "padron:leer",
  },
  {
    id: "socio",
    titulo: "Por socio",
    icono: UserRound,
    permiso: "medico:leer",
  },
];

type Props = {
  /** Solapa con la que abre; la usa `/panel/padron-socio`. */
  vistaInicial?: Vista;
};

/** Padrones, en una sola sección: quiénes atienden una obra social, o en qué obras sociales figura un socio. */
export default function AfiliadosPorObraSocialPage({
  vistaInicial = "obra-social",
}: Props) {
  const { can } = usePermisos();
  const solapas = SOLAPAS.filter((s) => can(s.permiso));
  const [elegida, setElegida] = useState<Vista>(vistaInicial);
  // Si no tiene permiso para la solapa pedida, cae en la que sí puede ver.
  const vista = solapas.some((s) => s.id === elegida)
    ? elegida
    : solapas[0]?.id;

  return (
    <div className={styles.fondo}>
      <div className={styles.container}>
        <header className={styles.cabecera}>
          <h1 className={styles.title}>
            <FolderOpen size={38} strokeWidth={1.9} style={{ verticalAlign: "-4px", marginRight: 12 }} aria-hidden="true" />
            Padrones
          </h1>

          {solapas.length > 1 && (
            <div
              className={styles.solapas}
              role="tablist"
              aria-label="Cómo consultar el padrón"
            >
              {solapas.map((s) => {
                const Icono = s.icono;
                const activa = s.id === vista;
                return (
                  <BotonPlano
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={activa}
                    className={`${comun.solapa} ${activa ? styles.solapaActiva : ""}`}
                    onClick={() => setElegida(s.id)}
                  >
                    <Icono size={16} strokeWidth={1.8} aria-hidden="true" />
                    {s.titulo}
                  </BotonPlano>
                );
              })}
            </div>
          )}
        </header>

        {/* Las dos quedan montadas: al cambiar de solapa no se pierde la obra social elegida ni se vuelve a pedir su padrón. */}
        {solapas.map((s) => (
          <section
            key={s.id}
            className={styles.panel}
            role="tabpanel"
            hidden={s.id !== vista}
          >
            {s.id === "obra-social" ? <PorObraSocial /> : <PorSocio />}
          </section>
        ))}
      </div>
    </div>
  );
}

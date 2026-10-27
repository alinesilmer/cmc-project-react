import { Moon, Sun } from "lucide-react";

import { TEMA_OSCURO_DISPONIBLE, elegirTema, useTema } from "@/app/hooks/tema";
import s from "./BotonTema.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

/** Cambia el panel entre claro y oscuro. La elección queda en el navegador. */
export default function BotonTema() {
  const tema = useTema();
  if (!TEMA_OSCURO_DISPONIBLE) return null;

  const oscuro = tema === "oscuro";
  const etiqueta = oscuro ? "Pasar a tema claro" : "Pasar a tema oscuro";
  const Icono = oscuro ? Sun : Moon;

  return (
    <BotonPlano
      type="button"
      className={s.boton}
      onClick={() => elegirTema(oscuro ? "claro" : "oscuro")}
      title={etiqueta}
      aria-label={etiqueta}
    >
      <Icono size={18} strokeWidth={1.8} aria-hidden="true" />
    </BotonPlano>
  );
}

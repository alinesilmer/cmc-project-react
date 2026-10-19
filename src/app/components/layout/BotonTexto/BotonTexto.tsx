import { ALargeSmall } from "lucide-react";

import { TEXTO_TAMANOS, pasarAlSiguienteTexto, useTextoTamano, type TextoTamano } from "@/app/hooks/textoTamano";
import base from "@/app/components/layout/BotonTema/BotonTema.module.scss";
import s from "./BotonTexto.module.scss";

const NOMBRE: Record<TextoTamano, string> = { normal: "normal", grande: "grande", "muy-grande": "muy grande" };

/** Agranda el texto del panel: cada clic pasa al tamaño siguiente. La elección queda en el navegador. */
export default function BotonTexto() {
  const tamano = useTextoTamano();
  const nivel = TEXTO_TAMANOS.indexOf(tamano);
  const siguiente = TEXTO_TAMANOS[(nivel + 1) % TEXTO_TAMANOS.length];
  const etiqueta = `Tamaño del texto: ${NOMBRE[tamano]}. Pasar a ${NOMBRE[siguiente]}`;

  return (
    <button
      type="button"
      className={`${base.boton} ${s.texto}`}
      onClick={pasarAlSiguienteTexto}
      title={etiqueta}
      aria-label={etiqueta}
    >
      <ALargeSmall size={20} strokeWidth={1.8} aria-hidden="true" />
      <span className={s.niveles} aria-hidden="true">
        {TEXTO_TAMANOS.map((t, i) => (
          <i key={t} className={i <= nivel ? s.activo : undefined} />
        ))}
      </span>
    </button>
  );
}

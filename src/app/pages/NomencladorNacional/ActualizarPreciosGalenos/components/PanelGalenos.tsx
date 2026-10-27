import PasoGuardar from "./PasoGuardar";
import PasoValores from "./PasoValores";
import { useEdicionPrecios } from "../useEdicionPrecios";
import { useGalenosOS } from "../useGalenosOS";

/** Los pasos de una obra social. Se monta con `key` por obra social: cambiarla descarta lo tipeado. */
export default function PanelGalenos({ obraNro, obraNombre }: { obraNro: number; obraNombre: string }) {
  const g = useGalenosOS(obraNro);
  const ed = useEdicionPrecios(obraNro, g.grupos, g.galenos, g.refrescar);

  return (
    <>
      <PasoValores
        grupos={g.grupos}
        cargando={g.cargando}
        fallo={g.fallo}
        edits={ed.edits}
        abiertos={ed.abiertos}
        resultadoPorCodigo={ed.resultadoPorCodigo}
        resumenPorCodigo={g.resumenPorCodigo}
        cambiando={g.cambiando}
        onEditar={ed.editar}
        onAbrir={ed.alternarAbierto}
        onVisible={g.alternarVisible}
      />
      <PasoGuardar ed={ed} obraNombre={obraNombre} alDescartar={() => void g.refrescar()} />
    </>
  );
}

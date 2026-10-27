import Alcance from "./Alcance";
import Parametros from "./Parametros";
import QueAumentar from "./QueAumentar";
import RevisarAplicar from "./RevisarAplicar";
import Revertir from "./Revertir";
import { useAplicarAumento } from "../useAplicarAumento";
import { useFormAumento } from "../useFormAumento";
import { useGalenosAumentables } from "../useGalenosAumentables";
import { useReversion } from "../useReversion";

/** Los pasos del aumento de una obra social. Se monta con `key` por obra social: cambiarla arranca todo de cero. */
export default function PanelAumento({ obraNro, obraNombre }: { obraNro: number; obraNombre: string }) {
  const f = useFormAumento(obraNro);
  const galenos = useGalenosAumentables(obraNro, f.incluirGalenos);

  const ap = useAplicarAumento(f.payload, galenos.refrescar);
  const rv = useReversion(obraNro, galenos.refrescar);

  // Alcance sólo existe con valores fijos, así que el último paso corre un número.
  const pasoRevisar = f.incluirFijos ? 5 : 4;

  return (
    <>
      <QueAumentar
        numero={2}
        incluirFijos={f.incluirFijos}
        onFijos={f.setIncluirFijos}
        incluirGalenos={f.incluirGalenos}
        onGalenos={f.setIncluirGalenos}
        opciones={galenos.opciones}
        seleccion={f.galenosSel}
        onSeleccion={f.setGalenosSel}
        cargando={galenos.cargando}
        fallo={galenos.fallo}
        vacio={!f.algoQueAumentar}
      />

      <Parametros
        numero={3}
        incluirFijos={f.incluirFijos}
        origen={f.origen}
        onOrigen={f.setOrigen}
        vigencia={f.vigencia}
        onVigencia={f.setVigencia}
        pct={f.pct}
        onPct={f.setPct}
        pctNum={f.pctNum}
        pctError={f.pctError}
      />

      {f.incluirFijos && (
        <Alcance
          numero={4}
          alcance={f.alcance}
          onAlcance={f.setAlcance}
          codigoTipeado={f.codigoTipeado}
          onCodigoTipeado={f.setCodigoTipeado}
          onAgregar={f.agregarCodigo}
          codigos={f.codigos}
          onQuitar={f.quitarCodigo}
          onLimpiar={f.limpiarCodigos}
          desde={f.desde}
          onDesde={f.setDesde}
          hasta={f.hasta}
          onHasta={f.setHasta}
        />
      )}

      <RevisarAplicar
        numero={pasoRevisar}
        ap={ap}
        completo={f.payload !== null}
        obraNombre={obraNombre}
        pctNum={f.pctNum}
        vigencia={f.vigencia}
      />

      <Revertir rv={rv} obraNombre={obraNombre} />
    </>
  );
}

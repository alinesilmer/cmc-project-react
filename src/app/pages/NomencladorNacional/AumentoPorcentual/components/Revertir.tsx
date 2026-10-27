import { Eye, RotateCcw } from "lucide-react";

import Paso from "@/app/components/ui/Paso/Paso";
import Bloque from "@/app/components/ui/Bloque/Bloque";
import Cifras from "@/app/components/ui/Cifras/Cifras";
import DetalleTabla from "./DetalleTabla";
import { ErrorAccion, ResultadoOk } from "@/app/components/ui/ResultadoAccion/ResultadoAccion";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import type { Reversion } from "../useReversion";
import { cifrasDe, plural } from "../aumento.helpers";
import Button from "@/app/components/ui/Button/Button";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import Dialogo, { DialogoAviso, DialogoDatos } from "@/app/components/ui/Dialogo/Dialogo";
import { formatFecha } from "@/app/shared/lib/fechas";

/** Bloque «Revertir un aumento»: deshace lo que abrió un aumento en una fecha; se ve qué vuelve antes de confirmar. */
export default function Revertir({ rv, obraNombre }: { rv: Reversion; obraNombre: string }) {
  return (
    <Paso icono={RotateCcw} titulo="Revertir un aumento" peligro>
      <p className={c.ayuda}>Deshace sólo lo que abrió un aumento ese día: no altas ni ediciones.</p>

      <div className={c.campo}>
        <span className={c.rotulo}>Vigencia a revertir</span>
        <CampoFecha value={rv.vigencia} onChange={rv.cambiarVigencia} />
      </div>

      <div className={c.acciones}>
        <Button
          variant="ghost"
          leftIcon={<Eye size={16} aria-hidden="true" />}
          disabled={!rv.vigencia}
          isLoading={rv.calculando}
          onClick={rv.calcular}
        >
          Ver qué se revierte
        </Button>
        <Button
          variant="danger"
          leftIcon={<RotateCcw size={16} aria-hidden="true" />}
          disabled={!rv.hayParaRevertir || rv.revirtiendo}
          onClick={rv.pedirConfirmacion}
        >
          Revertir
        </Button>
      </div>

      {rv.error && <ErrorAccion>{rv.error}</ErrorAccion>}

      {rv.preview && (
        <Bloque>
          <Cifras items={cifrasDe(rv.preview, "a revertir")} />
          {!rv.hayParaRevertir && <p className={c.ayuda}>No hay ningún aumento para revertir con esa vigencia.</p>}
          <DetalleTabla items={rv.preview.detalle} rotuloNuevo="Vuelve a" />
        </Bloque>
      )}

      {rv.resultado && (
        <ResultadoOk errores={rv.resultado.errores}>
          Revertidos: {plural(rv.resultado.actualizados, "valor", "valores")} y {plural(rv.resultado.galenos_actualizados, "galeno", "galenos")}
        </ResultadoOk>
      )}

      {rv.confirmando && rv.preview && (
        <Dialogo
          titulo="Revertir aumento"
          icono={RotateCcw}
          peligro
          onClose={rv.revirtiendo ? undefined : rv.cancelar}
          acciones={
            <>
              <Button variant="ghost" onClick={rv.cancelar} disabled={rv.revirtiendo}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={rv.revertir} isLoading={rv.revirtiendo}>
                Sí, revertir
              </Button>
            </>
          }
        >
          <DialogoDatos
            filas={[
              { rotulo: "Obra social", valor: obraNombre },
              { rotulo: "Aumento del", valor: formatFecha(rv.vigencia) },
              {
                rotulo: "Vuelven a su precio",
                valor: `${plural(rv.preview.actualizados, "valor", "valores")} y ${plural(rv.preview.galenos_actualizados, "galeno", "galenos")}`,
              },
            ]}
          />
          <DialogoAviso tono="peligro">Los precios actuales dejan de estar vigentes.</DialogoAviso>
        </Dialogo>
      )}
    </Paso>
  );
}

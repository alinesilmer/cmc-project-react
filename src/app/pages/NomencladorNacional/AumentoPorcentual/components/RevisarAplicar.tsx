import { Eye, Percent } from "lucide-react";

import Paso from "@/app/components/ui/Paso/Paso";
import Bloque from "@/app/components/ui/Bloque/Bloque";
import Cifras from "@/app/components/ui/Cifras/Cifras";
import DetalleTabla from "./DetalleTabla";
import { ErrorAccion, ResultadoOk } from "@/app/components/ui/ResultadoAccion/ResultadoAccion";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import type { Aplicacion } from "../useAplicarAumento";
import { cifrasDe, plural } from "../aumento.helpers";
import Button from "@/app/components/ui/Button/Button";
import Dialogo, { DialogoAviso, DialogoDatos } from "@/app/components/ui/Dialogo/Dialogo";
import { formatFecha } from "@/app/shared/lib/fechas";
import { formatoNumero2 } from "@/app/shared/lib/formatos";

type Props = {
  numero: number;
  ap: Aplicacion;
  /** Los datos están completos y se puede calcular. */
  completo: boolean;
  obraNombre: string;
  pctNum: number | null;
  vigencia: string;
};

/** Paso «Revisar y aplicar»: la vista previa que calcula el servidor y, recién después, el botón que guarda. */
export default function RevisarAplicar({ numero, ap, completo, obraNombre, pctNum, vigencia }: Props) {
  const signo = pctNum !== null && pctNum > 0 ? "+" : "";

  return (
    <Paso numero={numero} titulo="Revisar y aplicar">
      <div className={c.acciones}>
        <Button
          variant="ghost"
          leftIcon={<Eye size={16} aria-hidden="true" />}
          disabled={!completo}
          isLoading={ap.calculando}
          onClick={ap.calcular}
        >
          {ap.preview ? "Actualizar vista previa" : "Vista previa"}
        </Button>
        <Button
          leftIcon={<Percent size={16} aria-hidden="true" />}
          disabled={!ap.hayParaAplicar || ap.aplicando}
          onClick={ap.pedirConfirmacion}
          title={ap.preview ? undefined : "Primero generá la vista previa"}
        >
          Aplicar porcentaje
        </Button>
      </div>

      {ap.previewVencida && <p className={c.ayuda}>Cambiaste los datos: generá la vista previa de nuevo antes de aplicar.</p>}
      {ap.error && <ErrorAccion>{ap.error}</ErrorAccion>}

      {ap.preview && (
        <Bloque>
          <Cifras items={cifrasDe(ap.preview, "a actualizar")} />
          {!ap.hayParaAplicar && <p className={c.ayuda}>No hay nada para actualizar con estos datos: revisá los omitidos y su motivo.</p>}
          <DetalleTabla items={ap.preview.detalle} />
        </Bloque>
      )}

      {ap.resultado && (
        <Bloque>
          <ResultadoOk errores={ap.resultado.errores}>
            Listo: {plural(ap.resultado.actualizados, "valor", "valores")} y {plural(ap.resultado.galenos_actualizados, "galeno", "galenos")} actualizados
            {ap.resultado.omitidos > 0 && ` · ${plural(ap.resultado.omitidos, "omitido", "omitidos")}`}
          </ResultadoOk>
          <DetalleTabla items={ap.resultado.detalle} />
        </Bloque>
      )}

      {ap.confirmando && ap.preview && pctNum !== null && (
        <Dialogo
          titulo="Aplicar aumento"
          icono={Percent}
          onClose={ap.aplicando ? undefined : ap.cancelar}
          acciones={
            <>
              <Button variant="ghost" onClick={ap.cancelar} disabled={ap.aplicando}>
                Cancelar
              </Button>
              <Button onClick={ap.aplicar} isLoading={ap.aplicando}>
                Confirmar
              </Button>
            </>
          }
        >
          <DialogoDatos
            filas={[
              { rotulo: "Obra social", valor: obraNombre },
              { rotulo: "Porcentaje", valor: `${signo}${formatoNumero2.format(pctNum)} %` },
              { rotulo: "Vigencia", valor: formatFecha(vigencia) },
              {
                rotulo: "Se actualizan",
                valor: `${plural(ap.preview.actualizados, "valor", "valores")} y ${plural(ap.preview.galenos_actualizados, "galeno", "galenos")}`,
              },
            ]}
          />
          <DialogoAviso>Se puede revertir desde esta misma pantalla.</DialogoAviso>
        </Dialogo>
      )}
    </Paso>
  );
}

import { useMemo } from "react";
import { DatabaseZap } from "lucide-react";

import InformeNN from "./components/InformeNN";
import { useCompletarNN } from "./useCompletarNN";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import PaginaPasos from "@/app/components/layout/PaginaPasos/PaginaPasos";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import Button from "@/app/components/ui/Button/Button";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Dialogo, { DialogoAviso, DialogoDatos } from "@/app/components/ui/Dialogo/Dialogo";
import Paso from "@/app/components/ui/Paso/Paso";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import { ErrorAccion } from "@/app/components/ui/ResultadoAccion/ResultadoAccion";
import { formatoNumero } from "@/app/shared/lib/formatos";

/** Herramientas → «Completar nomenclador NN»: crea en $0 los galenos base y los valores NN que le falten a una obra social. */
export default function CompletarNomencladorNN() {
  const osQuery = useObrasSociales();
  const h = useCompletarNN();

  const opciones = useMemo(
    () =>
      (osQuery.data ?? [])
        .map((o) => ({ id: o.nro_obra_social, label: `${o.nro_obra_social} · ${o.nombre}` }))
        .sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true })),
    [osQuery.data],
  );
  const obraNombre = opciones.find((o) => o.id === h.os)?.label ?? "";

  return (
    <PaginaPasos titulo="Completar nomenclador NN" icono={DatabaseZap}>
      <Paso numero={1} titulo="Obra social">
        <div className={c.campo}>
          <AppSearchSelect
            options={opciones}
            value={h.os}
            loading={osQuery.isLoading}
            disabled={osQuery.isLoading || h.cargando === "aplicar"}
            onChange={(v) => h.elegirOs(v == null ? null : Number(v))}
          />
          <p className={c.ayuda}>
            Lo que falta se crea en $0 con vigencia 01/01/1900; lo que ya tiene no se toca. Después cargá el precio de los
            galenos base en Actualizar unidades.
          </p>
        </div>

        {h.cargando === "preview" && (
          <p className={c.ayuda}>
            <Cargando size={14} /> Revisando qué le falta…
          </p>
        )}
        {h.cargando === "aplicar" && (
          <p className={c.ayuda}>
            <Cargando size={14} /> Creando galenos y valores NN… no cierres la página.
          </p>
        )}
        {h.error && <ErrorAccion>{h.error}</ErrorAccion>}
      </Paso>

      {h.informe && (
        <InformeNN
          informe={h.informe}
          guardado={!!h.resultado}
          obraNombre={obraNombre}
          hayAlgoParaCrear={h.hayAlgoParaCrear}
          ocupado={h.cargando !== null}
          onCompletar={h.pedirConfirmacion}
        />
      )}

      {h.confirmando && h.preview && (
        <Dialogo
          titulo="Completar nomenclador NN"
          icono={DatabaseZap}
          onClose={h.cancelar}
          acciones={
            <>
              <Button variant="ghost" onClick={h.cancelar}>
                Cancelar
              </Button>
              <Button onClick={h.aplicar}>Completar</Button>
            </>
          }
        >
          <DialogoDatos
            filas={[
              { rotulo: "Obra social", valor: obraNombre },
              { rotulo: "Galenos base en $0", valor: h.preview.galenos_creados.length },
              { rotulo: "Valores NN en $0", valor: formatoNumero.format(h.preview.nn_creados) },
              {
                rotulo: "Ya existen, no se tocan",
                valor: `${h.preview.galenos_existentes.length} galeno(s) y ${formatoNumero.format(h.preview.nn_existentes)} NN`,
              },
            ]}
          />
          <DialogoAviso>Se crea sin precio: después hay que cargarlo.</DialogoAviso>
        </Dialogo>
      )}
    </PaginaPasos>
  );
}

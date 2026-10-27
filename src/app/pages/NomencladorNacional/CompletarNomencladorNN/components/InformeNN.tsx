import { CheckCircle2, DatabaseZap } from "lucide-react";

import Paso from "@/app/components/ui/Paso/Paso";
import Bloque from "@/app/components/ui/Bloque/Bloque";
import Cifras from "@/app/components/ui/Cifras/Cifras";
import ListaCambios from "@/app/components/ui/ListaCambios/ListaCambios";
import { ResultadoOk } from "@/app/components/ui/ResultadoAccion/ResultadoAccion";
import Button from "@/app/components/ui/Button/Button";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import type { CompletarBaseNNResult } from "../../nomenclador.types";
import { fechaAR } from "../../utiles";
import { formatoNumero, formatoPesos } from "@/app/shared/lib/formatos";

const MAX_ERRORES = 50;

type Props = {
  informe: CompletarBaseNNResult;
  /** El informe es el de lo ya guardado, no una vista previa. */
  guardado: boolean;
  obraNombre: string;
  hayAlgoParaCrear: boolean;
  ocupado: boolean;
  onCompletar: () => void;
};

/** Paso «Vista previa» / «Resultado»: los galenos base, los valores NN y lo que no se pudo crear. */
export default function InformeNN({ informe, guardado, obraNombre, hayAlgoParaCrear, ocupado, onCompletar }: Props) {
  const verbo = guardado ? "creados" : "se crean";

  return (
    <Paso numero={2} titulo={guardado ? "Resultado" : "Vista previa"}>
      {guardado ? (
        <ResultadoOk>
          {obraNombre} quedó con su nomenclador NN completo: {informe.galenos_creados.length} galeno(s) y{" "}
          {formatoNumero.format(informe.nn_creados)} valor(es) NN en $0.
        </ResultadoOk>
      ) : (
        <p className={c.ayuda}>Todavía no se guardó nada.</p>
      )}

      <Bloque>
        <h3 className={c.subtitulo}>Galenos base</h3>
        <ListaCambios
          filas={[
            ...informe.galenos_creados.map((g) => ({
              clave: g.codigo,
              tono: "nuevo" as const,
              titulo: g.nombre,
              detalle: guardado ? "creado en $0" : "se crea en $0",
            })),
            ...informe.galenos_existentes.map((g) => ({
              clave: g.codigo,
              tono: "igual" as const,
              titulo: g.nombre,
              detalle: `ya existía: ${formatoPesos.format(Number(g.valor_unitario))} desde ${fechaAR(g.vigencia_desde)}, no se toca`,
            })),
          ]}
        />

        <h3 className={c.subtitulo}>Valores NN</h3>
        <Cifras
          items={[
            { valor: formatoNumero.format(informe.nn_creados), rotulo: `${verbo} en $0` },
            { valor: formatoNumero.format(informe.nn_existentes), rotulo: "ya existían, no se tocan", tono: "apagada" },
            { valor: formatoNumero.format(informe.total_candidatos), rotulo: "códigos del Nomenclador Nacional", tono: "apagada" },
          ]}
        />
        {informe.habilitaciones_sembradas > 0 && (
          <p className={c.ayuda}>
            En {formatoNumero.format(informe.habilitaciones_sembradas)} código(s) nuevos se cargan también las
            especialidades de su plantilla (o «sin restricción»).
          </p>
        )}

        {informe.errores.length > 0 && (
          <>
            <h3 className={c.subtitulo}>No se pueden crear ({informe.errores.length})</h3>
            <ListaCambios
              filas={informe.errores.slice(0, MAX_ERRORES).map((e) => ({
                clave: e.codigo,
                tono: "error" as const,
                titulo: e.codigo,
                detalle: e.motivo,
              }))}
            />
            {informe.errores.length > MAX_ERRORES && <p className={c.ayuda}>…y {informe.errores.length - MAX_ERRORES} más.</p>}
          </>
        )}
      </Bloque>

      {!guardado &&
        (hayAlgoParaCrear ? (
          <div className={c.acciones}>
            <Button leftIcon={<DatabaseZap size={16} aria-hidden="true" />} onClick={onCompletar} disabled={ocupado}>
              Completar nomenclador
            </Button>
          </div>
        ) : (
          <p className={c.ayuda}>
            <CheckCircle2 size={14} aria-hidden="true" /> Esta obra social ya tiene todo: no hay nada para crear.
          </p>
        ))}
    </Paso>
  );
}

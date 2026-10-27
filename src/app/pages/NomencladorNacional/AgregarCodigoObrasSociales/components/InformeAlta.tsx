import { ListPlus } from "lucide-react";

import Paso from "@/app/components/ui/Paso/Paso";
import Aviso from "@/app/components/ui/Aviso/Aviso";
import Bloque from "@/app/components/ui/Bloque/Bloque";
import Button from "@/app/components/ui/Button/Button";
import Cifras from "@/app/components/ui/Cifras/Cifras";
import Fichas from "@/app/components/ui/Fichas/Fichas";
import ListaCambios from "@/app/components/ui/ListaCambios/ListaCambios";
import { ResultadoOk } from "@/app/components/ui/ResultadoAccion/ResultadoAccion";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import type { AltaNECeroOS, AltaNECeroResult } from "../../nomenclador.types";
import { fechaAR } from "../../utiles";
import { formatoNumero } from "@/app/shared/lib/formatos";

type Props = {
  informe: AltaNECeroResult;
  /** El informe es el de lo ya guardado, no una vista previa. */
  guardado: boolean;
  ocupado: boolean;
  onAgregar: () => void;
};

const TONO = { creada: "nuevo", sin_cambios: "igual" } as const;

/** Paso «Vista previa» / «Resultado»: qué se crea en cada obra social, qué ya estaba y los avisos. */
export default function InformeAlta({ informe, guardado, ocupado, onAgregar }: Props) {
  const nombreEsp = new Map(informe.plantilla.map((e) => [e.id_colegio, e.nombre]));
  const espLabel = (e: number | null) => (e == null ? "Sin especialidad" : (nombreEsp.get(e) ?? String(e)));

  const conAltas = informe.obras_sociales.filter((o) => o.estado === "creada").length;
  const sinCambios = informe.obras_sociales.filter((o) => o.estado === "sin_cambios").length;
  // Un NE le gana al NN al cotizar: con el NN ya cargado, el médico cotizaría $0 hasta que se cargue el precio NE.
  const conNN = informe.obras_sociales.filter((o: AltaNECeroOS) => o.nn_con_precio && o.creadas.length > 0);

  return (
    <Paso numero={3} titulo={guardado ? "Resultado" : "Vista previa"}>
      {guardado ? (
        <ResultadoOk>
          Se crearon {formatoNumero.format(informe.total_creadas)} valor(es) NE en $0 del código {informe.codigo} con vigencia{" "}
          {fechaAR(informe.vigencia_desde)}.
        </ResultadoOk>
      ) : (
        <p className={c.ayuda}>Todavía no se guardó nada.</p>
      )}

      <Bloque>
        <h3 className={c.subtitulo}>
          {informe.codigo}
          {informe.descripcion ? ` · ${informe.descripcion}` : ""}
        </h3>
        {informe.sin_restriccion ? (
          <p className={c.ayuda}>Sin restricción de especialidad: se crea un único valor sin especialidad.</p>
        ) : (
          <Fichas items={informe.plantilla.map((e) => ({ clave: String(e.id_colegio), texto: e.nombre }))} />
        )}

        <Cifras
          items={[
            { valor: formatoNumero.format(informe.total_creadas), rotulo: `valores NE ${guardado ? "creados" : "a crear"} en $0` },
            { valor: conAltas, rotulo: "obras sociales con altas" },
            { valor: sinCambios, rotulo: "ya tenían todo, no se tocan", tono: "apagada" },
          ]}
        />

        {conNN.length > 0 && (
          <Aviso>
            {conNN.length} obra(s) social(es) ya tienen este código en NN con precio: desde el {fechaAR(informe.vigencia_desde)} los
            médicos de esas especialidades cotizarían <strong>$0</strong> hasta que cargues el precio NE (
            {conNN.map((o) => o.obra_social_nro).join(", ")}).
          </Aviso>
        )}

        <h3 className={c.subtitulo}>Detalle por obra social</h3>
        <ListaCambios
          filas={informe.obras_sociales.map((o) => ({
            clave: o.obra_social_nro,
            tono: o.estado === "creada" || o.estado === "sin_cambios" ? TONO[o.estado] : "error",
            titulo: `${o.obra_social_nro} · ${o.nombre}`,
            detalle: [
              o.creadas.length > 0 && `${guardado ? "Creadas" : "Se crean"}: ${o.creadas.map(espLabel).join(", ")}.`,
              o.existentes.length > 0 && `Ya existían (no se tocan): ${o.existentes.map(espLabel).join(", ")}.`,
              o.motivo,
            ]
              .filter(Boolean)
              .join(" "),
          }))}
        />
      </Bloque>

      {!guardado &&
        (informe.total_creadas > 0 ? (
          <div className={c.acciones}>
            <Button leftIcon={<ListPlus size={16} aria-hidden="true" />} onClick={onAgregar} disabled={ocupado}>
              Agregar código
            </Button>
          </div>
        ) : (
          <p className={c.ayuda}>No hay nada para crear: las obras sociales elegidas ya lo tienen.</p>
        ))}
    </Paso>
  );
}

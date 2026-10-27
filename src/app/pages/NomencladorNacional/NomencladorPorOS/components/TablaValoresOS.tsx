import { Fragment } from "react";
import { SquarePen, Trash2 } from "lucide-react";

import s from "./TablaValoresOS.module.scss";
import { MODALIDAD_LABELS, montoDe, origenBadgeLabel } from "../porOS.helpers";
import { parseMonto } from "../../nomenclador.helpers";
import type { PorOSCtx } from "../useNomencladorPorOS";
import BotonAccion from "@/app/components/ui/BotonAccion/BotonAccion";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { formatoPesos } from "@/app/shared/lib/formatos";

type Props = Pick<PorOSCtx, "pageGroups" | "resolvedDesc" | "espMap" | "openEdit" | "openEditNucleo" | "handleDelete">;

const COLUMNAS = 10;
const importe = (n: number | null | undefined) => (n == null ? "—" : formatoPesos.format(n));

/** La tabla de valores: un encabezado por código y una fila por cada variante (origen, especialidad, nivel). */
export default function TablaValoresOS({ pageGroups, resolvedDesc, espMap, openEdit, openEditNucleo, handleDelete }: Props) {
  return (
    <div className={s.envoltorio}>
      {/* `data-lisa`: las filas no alternan color, los encabezados de código marcan los grupos. */}
      <Tabla data-lisa>
        <thead>
          <tr>
            <th>Origen</th>
            <th>Modalidad</th>
            <th>Especialidad</th>
            <th>Nivel</th>
            <th>Precio</th>
            <th>Ayudante</th>
            <th>Gastos</th>
            <th>Coseguro</th>
            <th>Vigente desde</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {pageGroups.map(([nomId, variantes]) => {
            const primera = variantes[0];
            const descripcion = resolvedDesc(primera);
            return (
              <Fragment key={nomId}>
                <tr className={s.grupo}>
                  <td colSpan={COLUMNAS}>
                    <div className={s.grupoCabeza}>
                      <span className={s.codigo}>{primera.codigo}</span>
                      {descripcion && <span className={s.descripcion}>{descripcion}</span>}
                      <BotonAccion
                        icono={SquarePen}
                        etiqueta="Editar el código para todas las especialidades"
                        onClick={() => openEditNucleo(nomId, variantes.some((x) => x.origen === "NE") ? "NE" : "NN")}
                      />
                    </div>
                  </td>
                </tr>

                {variantes.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <span className={`${s.origen} ${v.origen === "NE" ? s.ne : s.nn}`}>{origenBadgeLabel(v.origen)}</span>
                    </td>
                    <td>
                      {MODALIDAD_LABELS[v.modalidad]}
                      {v.nomenclador_nivelado && <span className={s.tenue}> · {v.nomenclador_nivelado}</span>}
                    </td>
                    <td>
                      {v.especialidad_id_colegio
                        ? (espMap[v.especialidad_id_colegio] ?? `Esp. ${v.especialidad_id_colegio}`)
                        : v.origen === "NE"
                          ? "Sin restricción de especialidad"
                          : v.sin_restriccion_especialidad
                            ? "Mismo valor · Sin restricción"
                            : `Mismo valor · ${v.especialidades.length} especialidad${v.especialidades.length === 1 ? "" : "es"}`}
                    </td>
                    <td>{v.nivel != null ? `Niv. ${v.nivel}` : "—"}</td>
                    {v.por_presupuesto ? (
                      // Sin precio pactado no hay nada que desglosar: el chip ocupa las tres columnas de importe.
                      <td colSpan={3}>
                        <span className={s.presupuesto}>Por presupuesto</span>
                      </td>
                    ) : (
                      <>
                        <td className={s.monto}>{formatoPesos.format(montoDe(v, "Honorarios") ?? 0)}</td>
                        <td className={s.monto}>{importe(montoDe(v, "Ayudante"))}</td>
                        <td className={s.monto}>{importe(montoDe(v, "Gastos"))}</td>
                      </>
                    )}
                    <td className={s.monto}>{parseMonto(v.coseguro) === 0 ? "—" : formatoPesos.format(parseMonto(v.coseguro))}</td>
                    <td className={s.fecha}>{v.vigencia_desde}</td>
                    <td>
                      <div className={s.acciones}>
                        <BotonAccion icono={SquarePen} etiqueta="Editar valores y vigencia" onClick={() => openEdit(v)} />
                        <BotonAccion icono={Trash2} etiqueta="Cerrar valor" peligro onClick={() => handleDelete(v)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </Tabla>
    </div>
  );
}

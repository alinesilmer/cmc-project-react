import { memo } from "react";
import { SquarePen, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

import s from "./TablaCodigos.module.scss";
import type { NomencladorNacionalOut, NomencladorOut } from "../../nomenclador.types";
import BotonAccion from "@/app/components/ui/BotonAccion/BotonAccion";
import Tabla from "@/app/components/ui/Tabla/Tabla";

type Acciones = {
  onAlternar: (item: NomencladorOut) => void;
  /** Sin permiso de edición no se dibuja. */
  onEditar?: (item: NomencladorOut) => void;
  /** Sin permiso de eliminar no se dibuja. */
  onEliminar?: (item: NomencladorOut) => void;
  /** Sin permiso de edición, activar y desactivar tampoco. */
  puedeAlternar: boolean;
};

const Fila = memo(function Fila({
  item,
  nn,
  acciones,
}: {
  item: NomencladorOut;
  nn?: NomencladorNacionalOut;
  acciones: Acciones;
}) {
  const vinculo = item.nomenclador_nacional_id != null ? (nn?.codigo ?? item.nomenclador_nacional_id) : "—";

  return (
    <tr>
      <td className={s.codigo}>{item.codigo}</td>
      <td>{vinculo}</td>
      <td>{item.categoria ?? "—"}</td>
      <td>{item.complejidad ? <span className={`${s.pastilla} ${s[item.complejidad]}`}>{item.complejidad}</span> : "—"}</td>
      <td>
        <span className={`${s.pastilla} ${item.activo ? s.activo : s.inactivo}`}>{item.activo ? "Activo" : "Inactivo"}</span>
      </td>
      <td>
        <div className={s.acciones}>
          {acciones.puedeAlternar && (
            <BotonAccion
              icono={item.activo ? ToggleRight : ToggleLeft}
              etiqueta={item.activo ? "Desactivar" : "Activar"}
              onClick={() => acciones.onAlternar(item)}
            />
          )}
          {acciones.onEditar && <BotonAccion icono={SquarePen} etiqueta="Editar" onClick={() => acciones.onEditar?.(item)} />}
          {acciones.onEliminar && <BotonAccion icono={Trash2} etiqueta="Eliminar" peligro onClick={() => acciones.onEliminar?.(item)} />}
        </div>
      </td>
    </tr>
  );
});

type Props = {
  items: NomencladorOut[];
  nnPorId: Map<number, NomencladorNacionalOut>;
  acciones: Acciones;
  /** Se está pidiendo otra página o un filtro nuevo: la tabla se apaga un poco. */
  actualizando: boolean;
};

/** La tabla del catálogo: una fila por código, con sus acciones según el permiso. */
export default function TablaCodigos({ items, nnPorId, acciones, actualizando }: Props) {
  return (
    <div className={`${s.envoltorio} ${actualizando ? s.apagada : ""}`}>
      <Tabla>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nomenclador Nacional</th>
            <th>Categoría</th>
            <th>Complejidad</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <Fila
              key={item.id}
              item={item}
              nn={item.nomenclador_nacional_id != null ? nnPorId.get(item.nomenclador_nacional_id) : undefined}
              acciones={acciones}
            />
          ))}
        </tbody>
      </Tabla>
    </div>
  );
}

import type { Responsable } from "@/app/pages/Agenda/agenda.types";
import s from "../Tablero.module.scss";

type Props = {
  id?: string;
  responsables: Responsable[];
  valorId: number | null;
  /** Nombre guardado en la tarjeta: se muestra aunque la persona ya no figure en la lista. */
  valorNombre: string;
  onChange: (id: number | null, nombre: string) => void;
};

export default function SelectorResponsable({ id, responsables, valorId, valorNombre, onChange }: Props) {
  const estaEnLista = valorId !== null && responsables.some((r) => r.id === valorId);

  return (
    <select
      id={id}
      className={s.entrada}
      value={valorId ?? ""}
      onChange={(e) => {
        const nuevo = e.target.value === "" ? null : Number(e.target.value);
        const nombre = responsables.find((r) => r.id === nuevo)?.nombre ?? "";
        onChange(nuevo, nombre);
      }}
    >
      <option value="">Sin asignar</option>
      {valorId !== null && !estaEnLista && <option value={valorId}>{valorNombre || `Usuario ${valorId}`}</option>}
      {responsables.map((r) => (
        <option key={r.id} value={r.id}>
          {r.nombre}
        </option>
      ))}
    </select>
  );
}

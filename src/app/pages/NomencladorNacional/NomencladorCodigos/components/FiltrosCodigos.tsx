import { Plus } from "lucide-react";

import s from "./FiltrosCodigos.module.scss";
import { TIPOS_CODIGO } from "../../components/tipoCodigo";
import type { TipoCodigo } from "../../nomenclador.types";
import type { FiltroEstado } from "../useCodigosCatalogo";
import Button from "@/app/components/ui/Button/Button";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Segmentos from "@/app/components/ui/Segmentos/Segmentos";

type Props = {
  busqueda: string;
  onBusqueda: (v: string) => void;
  tipo: TipoCodigo | "";
  onTipo: (v: TipoCodigo | "") => void;
  complejidad: string;
  onComplejidad: (v: string) => void;
  estado: FiltroEstado;
  onEstado: (v: FiltroEstado) => void;
  /** Muestra «Nuevo código»; sin permiso de edición no se dibuja. */
  onNuevo?: () => void;
};

const ESTADOS: { valor: FiltroEstado; rotulo: string }[] = [
  { valor: "activos", rotulo: "Activos" },
  { valor: "inactivos", rotulo: "Inactivos" },
  { valor: "todos", rotulo: "Todos" },
];

/** La barra sobre la tabla: búsqueda, tipo, complejidad, estado y el alta. */
export default function FiltrosCodigos({ busqueda, onBusqueda, tipo, onTipo, complejidad, onComplejidad, estado, onEstado, onNuevo }: Props) {
  return (
    <div className={s.barra}>
      <SearchField value={busqueda} onChange={(e) => onBusqueda(e.target.value)} onClear={() => onBusqueda("")} placeholder="Código" ariaLabel="Buscar por código" />

      <select className={`${c.seleccion} ${s.filtro}`} value={tipo} onChange={(e) => onTipo(e.target.value as TipoCodigo | "")} aria-label="Tipo">
        <option value="">Todos los tipos</option>
        {TIPOS_CODIGO.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <select className={`${c.seleccion} ${s.filtro}`} value={complejidad} onChange={(e) => onComplejidad(e.target.value)} aria-label="Complejidad">
        <option value="">Toda complejidad</option>
        <option value="baja">Baja</option>
        <option value="media">Media</option>
        <option value="alta">Alta</option>
      </select>

      <Segmentos ariaLabel="Estado" opciones={ESTADOS} valor={estado} onChange={onEstado} />

      {onNuevo && (
        <div className={s.nuevo}>
          <Button leftIcon={<Plus size={16} aria-hidden="true" />} onClick={onNuevo}>
            Nuevo código
          </Button>
        </div>
      )}
    </div>
  );
}

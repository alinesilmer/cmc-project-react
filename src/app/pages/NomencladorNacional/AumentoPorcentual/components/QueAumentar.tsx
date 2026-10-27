import { memo } from "react";
import { AlertTriangle } from "lucide-react";

import Paso from "@/app/components/ui/Paso/Paso";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import MultiSelectBuscable from "@/app/components/ui/MultiSelectBuscable/MultiSelectBuscable";

type Props = {
  numero: number;
  incluirFijos: boolean;
  onFijos: (v: boolean) => void;
  incluirGalenos: boolean;
  onGalenos: (v: boolean) => void;
  opciones: { value: string; label: string; hint?: string }[];
  seleccion: string[];
  onSeleccion: (v: string[]) => void;
  cargando: boolean;
  fallo: boolean;
  /** Falta elegir algo: se avisa debajo. */
  vacio: boolean;
};

/** Paso «Qué aumentar»: los valores de precio fijo, los galenos que se elijan, o ambos. */
function QueAumentar({
  numero,
  incluirFijos,
  onFijos,
  incluirGalenos,
  onGalenos,
  opciones,
  seleccion,
  onSeleccion,
  cargando,
  fallo,
  vacio,
}: Props) {
  return (
    <Paso numero={numero} titulo="Qué aumentar">
      <label className={c.casilla}>
        <input type="checkbox" checked={incluirFijos} onChange={(e) => onFijos(e.target.checked)} />
        <span>
          <strong>Valores de precio fijo</strong>
          <small className={c.ayuda}>Los del origen y el alcance que elijas.</small>
        </span>
      </label>

      <label className={c.casilla}>
        <input type="checkbox" checked={incluirGalenos} onChange={(e) => onGalenos(e.target.checked)} />
        <span>
          <strong>Galenos</strong>
          <small className={c.ayuda}>Actualiza todo lo que se calcula con ese galeno, sin importar origen ni alcance.</small>
        </span>
      </label>

      {incluirGalenos &&
        (fallo ? (
          <p className={c.ayuda} role="alert">
            <AlertTriangle size={14} aria-hidden="true" /> No se pudieron cargar los galenos.
          </p>
        ) : (
          <MultiSelectBuscable
            options={opciones}
            selected={seleccion}
            onChange={onSeleccion}
            noun="galenos"
            loading={cargando}
          />
        ))}

      {vacio && <p className={c.ayuda}>Elegí valores fijos, al menos un galeno, o ambos.</p>}
    </Paso>
  );
}

export default memo(QueAumentar);

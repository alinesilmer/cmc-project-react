import { memo, useMemo, useState } from "react";

import s from "./ListaObrasSociales.module.scss";
import Button from "@/app/components/ui/Button/Button";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import type { ObraSocialListItem } from "../../../ObrasSociales/obrasSociales.types";

const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Props = {
  obras: ObraSocialListItem[];
  cargando: boolean;
  elegidas: Set<number>;
  onAlternar: (nro: number) => void;
  onSumar: (nros: number[]) => void;
  onQuitar: (nros: number[]) => void;
  bloqueada: boolean;
};

const Fila = memo(function Fila({
  obra,
  elegida,
  bloqueada,
  onAlternar,
}: {
  obra: ObraSocialListItem;
  elegida: boolean;
  bloqueada: boolean;
  onAlternar: (nro: number) => void;
}) {
  return (
    <li>
      <label className={s.item}>
        <input type="checkbox" checked={elegida} onChange={() => onAlternar(obra.nro_obra_social)} disabled={bloqueada} />
        <span className={s.nro}>{obra.nro_obra_social}</span>
        <span className={s.nombre}>{obra.nombre}</span>
        {!obra.activo && <span className={s.inactiva}>inactiva</span>}
      </label>
    </li>
  );
});

/** Lista de obras sociales con check, buscador y «todas / ninguna»; con un filtro escrito, los botones actúan sobre lo que se ve. */
function ListaObrasSociales({ obras, cargando, elegidas, onAlternar, onSumar, onQuitar, bloqueada }: Props) {
  const [filtro, setFiltro] = useState("");

  const visibles = useMemo(() => {
    const q = normalizar(filtro.trim());
    if (!q) return obras;
    return obras.filter((o) => normalizar(o.nombre).includes(q) || String(o.nro_obra_social).includes(q));
  }, [obras, filtro]);

  const sufijo = filtro.trim() ? " (filtradas)" : "";
  const nrosVisibles = () => visibles.map((o) => o.nro_obra_social);

  return (
    <>
      <div className={s.cabecera}>
        <span className={c.rotulo}>{elegidas.size} elegida(s)</span>
        <div className={c.acciones}>
          <Button variant="ghost" size="sm" disabled={bloqueada || visibles.length === 0} onClick={() => onSumar(nrosVisibles())}>
            Todas{sufijo}
          </Button>
          <Button variant="ghost" size="sm" disabled={bloqueada || elegidas.size === 0} onClick={() => onQuitar(nrosVisibles())}>
            Ninguna{sufijo}
          </Button>
        </div>
      </div>

      <SearchField
        placeholder="Nombre o número"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        onClear={() => setFiltro("")}
        ariaLabel="Buscar obra social"
      />

      <ul className={s.lista}>
        {cargando && (
          <li className={s.vacio}>
            <Cargando size={14} /> Cargando…
          </li>
        )}
        {!cargando && visibles.length === 0 && <li className={s.vacio}>Ninguna obra social coincide.</li>}
        {visibles.map((o) => (
          <Fila key={o.nro_obra_social} obra={o} elegida={elegidas.has(o.nro_obra_social)} bloqueada={bloqueada} onAlternar={onAlternar} />
        ))}
      </ul>
    </>
  );
}

export default memo(ListaObrasSociales);

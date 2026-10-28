import { useMemo, useState } from "react";

import s from "./PanelObrasSociales.module.scss";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

type Obra = { nro_obra_social: number; nombre: string };

type Props = {
  obras: Obra[];
  /** El número de la obra social elegida, o `null` si todavía no hay ninguna. */
  elegida: number | null;
  onElegir: (nro: number) => void;
  /** Al pasar el mouse por una obra social: para ir cargando lo que se va a pedir. */
  onResaltar?: (nro: number) => void;
  titulo?: string;
};

const TONOS = 6;

/** Sin tildes ni mayúsculas: «osde» encuentra «OSDE» y «jerarquicos» encuentra «Jerárquicos». */
const normalizar = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** «Federada Salud» → «FS». */
function iniciales(nombre: string): string {
  const palabras = nombre.replace(/[^\p{L}\p{N} ]/gu, "").split(" ").filter(Boolean);
  return palabras.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

/** El panel lateral para elegir una obra social: una ficha por obra, con su monograma y su número. */
export default function PanelObrasSociales({ obras, elegida, onElegir, onResaltar, titulo = "Obras sociales" }: Props) {
  const [busqueda, setBusqueda] = useState("");

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return obras;
    return obras.filter((o) => normalizar(o.nombre).includes(q) || String(o.nro_obra_social).includes(q));
  }, [obras, busqueda]);

  return (
    <aside className={s.panel} aria-label={titulo}>
      <div className={s.cabeza}>
        <h2 className={s.titulo}>{titulo}</h2>
        <SearchField
          fullWidth
          placeholder="Buscar…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onClear={() => setBusqueda("")}
          ariaLabel={`Buscar en ${titulo.toLowerCase()}`}
        />
      </div>

      <div className={s.lista}>
        {visibles.map((o) => {
          const activa = o.nro_obra_social === elegida;
          return (
            <BotonPlano
              key={o.nro_obra_social}
              type="button"
              className={`${s.ficha} ${activa ? s.fichaActiva : ""}`}
              aria-pressed={activa}
              onClick={() => onElegir(o.nro_obra_social)}
              onMouseEnter={onResaltar ? () => onResaltar(o.nro_obra_social) : undefined}
            >
              <span className={`${s.monograma} ${s[`tono${o.nro_obra_social % TONOS}`]}`} aria-hidden="true">
                {iniciales(o.nombre)}
              </span>
              <span className={s.nombre}>{o.nombre}</span>
              <span className={s.numero}>{o.nro_obra_social}</span>
            </BotonPlano>
          );
        })}
        {visibles.length === 0 && <p className={s.vacio}>Sin resultados</p>}
      </div>
    </aside>
  );
}

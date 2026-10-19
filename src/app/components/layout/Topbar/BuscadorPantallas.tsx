import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import MarcoModal from "@/app/components/ui/MarcoModal/MarcoModal";
import type { Destino } from "./navegacion";
import { leerRecientes } from "./recientes";
import s from "./BuscadorPantallas.module.scss";

const MAX_RESULTADOS = 8;

/** Minúsculas y sin tildes, para que «padron» encuentre «Padrón». */
const normalizar = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Puntaje de coincidencia: empieza igual > empieza una palabra > la contiene > sólo la sección. */
function puntaje(d: Destino, q: string): number {
  const nombre = normalizar(d.label);
  if (nombre.startsWith(q)) return 4;
  if (nombre.split(/\s+/).some((w) => w.startsWith(q))) return 3;
  if (nombre.includes(q)) return 2;
  if (normalizar(d.seccion).includes(q)) return 1;
  return 0;
}

/** El nombre con la parte buscada resaltada. */
function resaltar(texto: string, q: string): ReactNode {
  if (!q) return texto;
  const i = normalizar(texto).indexOf(q);
  if (i < 0) return texto;
  return (
    <>
      {texto.slice(0, i)}
      <mark>{texto.slice(i, i + q.length)}</mark>
      {texto.slice(i + q.length)}
    </>
  );
}

interface Props {
  destinos: Destino[];
  onClose: () => void;
}

type Grupo = { titulo: string; items: Destino[] };

/** Buscador de pantallas (Ctrl K): escribís parte del nombre y Enter abre la pantalla. */
export default function BuscadorPantallas({ destinos, onClose }: Props) {
  const navigate = useNavigate();
  const [texto, setTexto] = useState("");
  const [sel, setSel] = useState(0);
  const listaRef = useRef<HTMLDivElement>(null);
  const q = normalizar(texto.trim());

  const grupos = useMemo<Grupo[]>(() => {
    if (q) {
      const items = destinos
        .map((d) => ({ d, p: puntaje(d, q) }))
        .filter((x) => x.p > 0)
        .sort((a, b) => b.p - a.p)
        .slice(0, MAX_RESULTADOS)
        .map((x) => x.d);
      return [{ titulo: "Pantallas", items }];
    }
    const porRuta = new Map(destinos.map((d) => [d.path, d]));
    const recientes = leerRecientes()
      .map((p) => porRuta.get(p))
      .filter((d): d is Destino => Boolean(d));
    const sugeridas = destinos.filter((d) => !recientes.includes(d)).slice(0, MAX_RESULTADOS - recientes.length);
    return [
      { titulo: "Recientes", items: recientes },
      { titulo: "Pantallas", items: sugeridas },
    ].filter((g) => g.items.length > 0);
  }, [destinos, q]);

  const planos = useMemo(() => grupos.flatMap((g) => g.items), [grupos]);

  useEffect(() => setSel(0), [q]);

  // La opción elegida siempre a la vista.
  useEffect(() => {
    listaRef.current?.querySelector(`[data-indice="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const abrir = (d: Destino | undefined) => {
    if (!d) return;
    onClose();
    if (d.external) window.open(d.path, "_blank", "noopener,noreferrer");
    else navigate(d.path);
  };

  const alTeclear = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((i) => (planos.length ? (i + 1) % planos.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((i) => (planos.length ? (i - 1 + planos.length) % planos.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      abrir(planos[sel]);
    }
  };

  let indice = -1;

  return (
    <MarcoModal onClose={onClose} className={s.paleta} aria-label="Buscar pantalla">
      <div className={s.entrada}>
        <Search size={21} aria-hidden="true" />
        <input
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={alTeclear}
          placeholder="¿A qué pantalla vas?"
          aria-label="Buscar pantalla"
          aria-controls="buscador-resultados"
          aria-activedescendant={planos[sel] ? `buscador-op-${sel}` : undefined}
          role="combobox"
          aria-expanded="true"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd>Esc</kbd>
      </div>

      <div className={s.resultados} id="buscador-resultados" role="listbox" ref={listaRef}>
        {planos.length === 0 ? (
          <p className={s.vacio}>No hay pantallas con «{texto.trim()}».</p>
        ) : (
          grupos.map((g) => (
            <div key={g.titulo} role="group" aria-label={g.titulo}>
              <h4 className={s.grupo}>{g.titulo}</h4>
              {g.items.map((d) => {
                indice += 1;
                const i = indice;
                const Icono = d.icon;
                return (
                  <div
                    key={`${g.titulo}-${d.path}`}
                    id={`buscador-op-${i}`}
                    data-indice={i}
                    role="option"
                    aria-selected={i === sel}
                    className={`${s.op} ${i === sel ? s.opSel : ""}`}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => abrir(d)}
                  >
                    <span className={s.icono}>
                      <Icono size={18} aria-hidden="true" />
                    </span>
                    <b className={s.nombre}>{resaltar(d.label, q)}</b>
                    <small className={s.seccion}>{d.seccion}</small>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className={s.pie}>
        <span><kbd>↑</kbd><kbd>↓</kbd> elegir</span>
        <span><kbd>Enter</kbd> abrir</span>
        <span><kbd>Esc</kbd> cerrar</span>
      </div>
    </MarcoModal>
  );
}

import { useEffect, useId, useRef, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";

import { buscarCodigos } from "../validaciones.api";
import { formatMoneda } from "../validaciones.types";
import type { CodigoNomenclador } from "../validaciones.types";
import s from "./CodigoSelect.module.scss";

interface Props {
  /** NRO_OBRA_SOCIAL — define qué valor se muestra para cada código. */
  obraSocial: number;
  value: string;
  onChange: (codigo: string) => void;
  placeholder?: string;
  invalid?: boolean;
  /** Códigos que la obra social no acepta: se listan pero no se pueden elegir. */
  bloqueados?: string[];
  disabled?: boolean;
}

/**
 * Buscador de códigos del nomenclador. Reemplaza al `<datalist>` del legacy:
 * además del código muestra la descripción y el valor, que es lo que el
 * prestador necesita para elegir sin equivocarse.
 */
export default function CodigoSelect({
  obraSocial,
  value,
  onChange,
  placeholder = "Buscá por código o descripción",
  invalid = false,
  bloqueados = [],
  disabled = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [opciones, setOpciones] = useState<CodigoNomenclador[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const [seleccionado, setSeleccionado] = useState<CodigoNomenclador | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Busca con un pequeño debounce mientras el desplegable está abierto.
  useEffect(() => {
    if (!abierto) return;
    let cancelado = false;
    setCargando(true);

    const t = setTimeout(() => {
      buscarCodigos(obraSocial, query)
        .then((res) => {
          if (cancelado) return;
          setOpciones(res);
          setResaltado(0);
        })
        .catch(() => {
          if (!cancelado) setOpciones([]);
        })
        .finally(() => {
          if (!cancelado) setCargando(false);
        });
    }, 250);

    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [query, abierto, obraSocial]);

  // Cierra al hacer click fuera.
  useEffect(() => {
    if (!abierto) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [abierto]);

  // Si el formulario se limpia desde afuera, limpiamos el texto visible.
  useEffect(() => {
    if (!value) {
      setSeleccionado(null);
      setQuery("");
    }
  }, [value]);

  // Un código no se puede elegir si la obra social lo excluye por convenio, o
  // si el backend lo devolvió como no admitido (sin habilitación o sin precio).
  const noSeleccionable = (op: CodigoNomenclador) =>
    bloqueados.includes(op.codigo) || !op.admitido;

  const elegir = (op: CodigoNomenclador) => {
    if (noSeleccionable(op)) return;
    setSeleccionado(op);
    onChange(op.codigo);
    setQuery("");
    setAbierto(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!abierto && (e.key === "ArrowDown" || e.key === "Enter")) {
      setAbierto(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltado((i) => Math.min(i + 1, opciones.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const op = opciones[resaltado];
      if (op) elegir(op);
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  };

  const textoInput = abierto
    ? query
    : seleccionado
      ? `${seleccionado.codigo} — ${seleccionado.descripcion}`
      : value;

  return (
    <div className={s.wrap} ref={wrapRef}>
      <div className={`${s.control} ${invalid ? s.invalid : ""} ${disabled ? s.disabled : ""}`}>
        <Search size={16} className={s.searchIcon} />
        <input
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          className={s.input}
          value={textoInput}
          placeholder={placeholder}
          onFocus={() => setAbierto(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setAbierto(true);
          }}
          onKeyDown={onKeyDown}
        />
        {cargando && abierto && <Loader2 size={15} className={s.spinner} />}
      </div>

      {abierto && (
        <ul className={s.list} id={listId} role="listbox">
          {opciones.length === 0 && !cargando && (
            <li className={s.vacio}>No hay códigos que coincidan.</li>
          )}

          {opciones.map((op, i) => {
            const bloqueado = noSeleccionable(op);
            const razon = bloqueados.includes(op.codigo)
              ? "no habilitado para esta obra social"
              : op.motivo ?? "sin precio vigente";
            const activo = op.codigo === value;
            return (
              <li
                key={op.codigo}
                role="option"
                aria-selected={activo}
                aria-disabled={bloqueado}
                className={[
                  s.opcion,
                  i === resaltado ? s.resaltado : "",
                  bloqueado ? s.bloqueado : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseEnter={() => setResaltado(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(op)}
              >
                <span className={s.opCodigo}>{op.codigo}</span>
                <span className={s.opDesc}>
                  {op.descripcion}
                  {bloqueado && <em className={s.opBloqueado}>{razon}</em>}
                </span>
                <span className={s.opValor}>
                  {bloqueado ? "—" : formatMoneda(op.honorarios + op.gastos)}
                </span>
                {activo && <Check size={15} className={s.opCheck} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

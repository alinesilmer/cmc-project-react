import { useEffect, useId, useRef, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";

import { buscarCodigos } from "../validaciones.api";
import { formatMoneda } from "../validaciones.types";
import type { CodigoNomenclador } from "../validaciones.types";
import s from "./CodigoSelect.module.scss";

/** Códigos que pide el buscador por vez. Es el default del backend; se explicita
 * acá porque hay que pasarlo para llegar al parámetro `nroSocio`. */
const LIMITE = 20;

interface Props {
  /** NRO_OBRA_SOCIAL — define qué valor se muestra para cada código. */
  obraSocial: number;
  value: string;
  onChange: (codigo: string) => void;
  placeholder?: string;
  invalid?: boolean;
  /** Códigos que la obra social no acepta por convenio: no se listan. */
  bloqueados?: string[];
  disabled?: boolean;
  /** Médico sobre el que se resuelve habilitación y precio. Lo manda el
   * personal del Colegio al cargar en nombre de un socio; un médico logueado
   * no lo necesita (el backend usa el del token). */
  nroSocio?: number;
}

/**
 * Buscador de códigos del nomenclador. Reemplaza al `<datalist>` del legacy:
 * además del código muestra la descripción y el valor, que es lo que el
 * prestador necesita para elegir sin equivocarse.
 *
 * **Sólo lista lo que el médico puede facturar.** Antes los no habilitados se
 * mostraban en gris con el motivo; ahora se ocultan: el médico no los puede
 * usar, y verlos sólo servía para que intentara elegirlos.
 */
export default function CodigoSelect({
  obraSocial,
  value,
  onChange,
  placeholder = "Buscá por código o descripción",
  invalid = false,
  bloqueados = [],
  disabled = false,
  nroSocio,
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
      buscarCodigos(obraSocial, query, LIMITE, nroSocio)
        .then((res) => {
          if (cancelado) return;
          // El backend ya descarta los no habilitados; acá se sacan además los
          // que la obra social no acepta por convenio, que el backend no
          // conoce a nivel de catálogo.
          setOpciones(res.filter((op) => op.admitido && !bloqueados.includes(op.codigo)));
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
    // `bloqueados` es un literal del config y no cambia entre renders; se omite
    // de las deps a propósito para no rehacer la búsqueda en cada uno.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, abierto, obraSocial, nroSocio]);

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

  // Lo que llega a `opciones` ya está filtrado: todo lo listado es elegible.
  const elegir = (op: CodigoNomenclador) => {
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

      {/* Sancor autoriza algunos códigos con otro número. Sin este aviso, el
          prestador ve en la tabla un código distinto del que eligió y no
          entiende por qué. El precio y lo que se factura no cambian. */}
      {!abierto && seleccionado?.seEnvia && (
        <span className={s.homologado}>
          La obra social lo autoriza como <strong>{seleccionado.seEnvia}</strong>
        </span>
      )}

      {abierto && (
        <ul className={s.list} id={listId} role="listbox">
          {opciones.length === 0 && !cargando && (
            <li className={s.vacio}>
              No hay códigos habilitados que coincidan con la búsqueda.
            </li>
          )}

          {opciones.map((op, i) => {
            const activo = op.codigo === value;
            return (
              <li
                key={op.codigo}
                role="option"
                aria-selected={activo}
                className={`${s.opcion} ${i === resaltado ? s.resaltado : ""}`}
                onMouseEnter={() => setResaltado(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(op)}
              >
                <span className={s.opCodigo}>{op.codigo}</span>
                <span className={s.opDesc}>
                  {op.descripcion}
                  {op.seEnvia && (
                    <em className={s.opHomologado}>se envía como {op.seEnvia}</em>
                  )}
                </span>
                <span className={s.opValor}>
                  {formatMoneda(op.honorarios + op.gastos)}
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

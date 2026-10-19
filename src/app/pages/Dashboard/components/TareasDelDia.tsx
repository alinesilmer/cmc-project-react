import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";

import { PRIORIDADES, useTareasDelDia, type Prioridad, type Tarea } from "../useTareasDelDia";
import s from "./TareasDelDia.module.scss";

type Props = {
  claveUsuario: string;
};

const ETIQUETA: Record<Prioridad, string> = { alta: "Alta", media: "Media", baja: "Baja" };

const CLASE: Record<Prioridad, string> = { alta: s.alta, media: s.media, baja: s.baja };

/** Etiqueta de prioridad. Es un botón: cada clic pasa a la siguiente. */
function BotonPrioridad({ prioridad, onClick }: { prioridad: Prioridad; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`${s.prioridad} ${CLASE[prioridad]}`}
      onClick={onClick}
      title="Cambiar prioridad"
      aria-label={`Prioridad ${ETIQUETA[prioridad].toLowerCase()}. Cambiar`}
    >
      {ETIQUETA[prioridad]}
    </button>
  );
}

type ItemProps = {
  tarea: Tarea;
  onAlternar: () => void;
  onEditar: (texto: string) => void;
  onPriorizar: () => void;
  onQuitar: () => void;
};

function ItemTarea({ tarea, onAlternar, onEditar, onPriorizar, onQuitar }: ItemProps) {
  // `null` = no se está editando; si no, el borrador del texto.
  const [borrador, setBorrador] = useState<string | null>(null);

  const guardar = () => {
    if (borrador === null) return;
    if (borrador.trim() !== tarea.texto) onEditar(borrador);
    setBorrador(null);
  };

  const alTeclear = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") guardar();
    if (e.key === "Escape") setBorrador(null);
  };

  return (
    <li className={`${s.item} ${tarea.hecha ? s.itemHecha : ""}`}>
      <label className={s.marca}>
        <input type="checkbox" className={s.casilla} checked={tarea.hecha} onChange={onAlternar} />
        <span className={s.tilde} aria-hidden="true">
          <Check size={12} strokeWidth={3} />
        </span>
        {borrador === null && <span className={s.texto}>{tarea.texto}</span>}
      </label>

      {borrador !== null && (
        <input
          className={`${s.campo} ${s.campoEdicion}`}
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          onBlur={guardar}
          onKeyDown={alTeclear}
          aria-label="Editar tarea"
          maxLength={140}
          autoFocus
        />
      )}

      <BotonPrioridad prioridad={tarea.prioridad} onClick={onPriorizar} />
      <button
        type="button"
        className={s.accion}
        onClick={() => setBorrador(tarea.texto)}
        aria-label={`Editar «${tarea.texto}»`}
      >
        <Pencil size={13} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`${s.accion} ${s.quitar}`}
        onClick={onQuitar}
        aria-label={`Quitar «${tarea.texto}»`}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </li>
  );
}

/** Checklist personal del día, dibujada como una hoja de cuaderno. */
export default function TareasDelDia({ claveUsuario }: Props) {
  const { tareas, hechas, agregar, alternar, editar, priorizar, quitar, limpiar, llena } =
    useTareasDelDia(claveUsuario);
  const [texto, setTexto] = useState("");
  const [prioridad, setPrioridad] = useState<Prioridad>("media");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    agregar(texto, prioridad);
    setTexto("");
    setPrioridad("media");
  };

  const rotarPrioridad = () =>
    setPrioridad((p) => PRIORIDADES[(PRIORIDADES.indexOf(p) + 1) % PRIORIDADES.length]);

  return (
    <section className={s.cuaderno} aria-labelledby="tareas-titulo">
      <div className={s.pagina}>
        <div className={s.anillas} aria-hidden="true" />

        <div className={s.hoja}>
          <header className={s.cabecera}>
            <h2 id="tareas-titulo" className={s.titulo}>
              {/* El encabezado de las recetas médicas. */}
              <span className={s.receta} aria-hidden="true">
                Rp/
              </span>
              Tareas de hoy
            </h2>
            {tareas.length > 0 && (
              <span className={s.resumen}>
                {/* Sólo aparece cuando hay algo tildado para sacar. */}
                {hechas > 0 && (
                  <button type="button" className={s.limpiar} onClick={limpiar}>
                    Limpiar
                  </button>
                )}
                <span className={s.cuenta}>
                  {hechas}/{tareas.length}
                </span>
              </span>
            )}
          </header>

          <div className={s.renglones}>
            <ul className={s.lista}>
              {tareas.map((t) => (
                <ItemTarea
                  key={t.id}
                  tarea={t}
                  onAlternar={() => alternar(t.id)}
                  onEditar={(nuevo) => editar(t.id, nuevo)}
                  onPriorizar={() => priorizar(t.id)}
                  onQuitar={() => quitar(t.id)}
                />
              ))}
            </ul>

            <form className={s.nueva} onSubmit={enviar}>
              <input
                className={s.campo}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={llena ? "La hoja está llena" : "Anotar una tarea…"}
                aria-label="Nueva tarea"
                maxLength={140}
                disabled={llena}
              />
              <BotonPrioridad prioridad={prioridad} onClick={rotarPrioridad} />
              <button
                type="submit"
                className={s.agregar}
                aria-label="Agregar tarea"
                disabled={!texto.trim() || llena}
              >
                <Plus size={16} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

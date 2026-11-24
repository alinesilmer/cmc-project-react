import { useState, type FormEvent } from "react";
import { Send, Trash2 } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import Segmentos from "@/app/components/ui/Segmentos/Segmentos";
import type { Responsable } from "@/app/pages/Agenda/agenda.types";
import { ESTADOS, PRIORIDADES, type Tarjeta } from "../tablero.types";
import s from "../Tablero.module.scss";
import SelectorResponsable from "./SelectorResponsable";

type Props = {
  tarjeta: Tarjeta;
  autor: string;
  responsables: Responsable[];
  onEditar: (cambios: Partial<Omit<Tarjeta, "id" | "comentarios">>) => void;
  onComentar: (texto: string) => void;
  onQuitar: () => void;
};

const cuando = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** El detalle de la tarjeta elegida: se edita en el lugar y cada cambio se guarda solo. Va con `key` por tarjeta. */
export default function PanelTarjeta({ tarjeta, autor, responsables, onEditar, onComentar, onQuitar }: Props) {
  const [titulo, setTitulo] = useState(tarjeta.titulo);
  const [descripcion, setDescripcion] = useState(tarjeta.descripcion);
  const [comentario, setComentario] = useState("");

  const guardarTitulo = () => {
    const limpio = titulo.trim();
    if (!limpio) setTitulo(tarjeta.titulo);
    else if (limpio !== tarjeta.titulo) onEditar({ titulo: limpio });
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onComentar(comentario);
    setComentario("");
  };

  return (
    <aside className={s.panel} aria-label="Detalle de la tarjeta">
      <header className={s.cabeceraPanel}>Tarjeta</header>
      <div className={s.cuerpoPanel}>
        <input
          className={`${s.entrada} ${s.tituloPanel}`}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={guardarTitulo}
          maxLength={140}
          aria-label="Título"
        />

        <label className={s.fila} htmlFor="pt-resp">
          <span>Asignada</span>
          <SelectorResponsable
            id="pt-resp"
            responsables={responsables}
            valorId={tarjeta.asignadoId}
            valorNombre={tarjeta.asignadoNombre}
            onChange={(id, nombre) => onEditar({ asignadoId: id, asignadoNombre: nombre })}
          />
        </label>
        <div className={s.fila}>
          <span>Vence</span>
          <CampoFecha value={tarjeta.vence} onChange={(vence) => onEditar({ vence })} ariaLabel="Fecha de vencimiento" />
        </div>
        <div className={s.fila}>
          <span>Prioridad</span>
          <Segmentos opciones={PRIORIDADES} valor={tarjeta.prioridad} onChange={(prioridad) => onEditar({ prioridad })} ariaLabel="Prioridad" />
        </div>
        <div className={s.fila}>
          <span>Columna</span>
          <Segmentos opciones={ESTADOS} valor={tarjeta.estado} onChange={(estado) => onEditar({ estado })} ariaLabel="Columna" />
        </div>

        <label className={s.bloque} htmlFor="pt-desc">
          <span>Descripción</span>
          <textarea
            id="pt-desc"
            className={s.entrada}
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            onBlur={() => descripcion !== tarjeta.descripcion && onEditar({ descripcion })}
            maxLength={2000}
          />
        </label>

        <div className={s.bloque}>
          <span>Comentarios</span>
          {tarjeta.comentarios.length === 0 && <p className={s.sinComentarios}>Todavía no hay comentarios.</p>}
          <ul className={s.comentarios}>
            {tarjeta.comentarios.map((c) => (
              <li key={c.id} className={s.comentario}>
                <b>{c.autor}</b>
                <time dateTime={c.creado}>{cuando(c.creado)}</time>
                <p>{c.texto}</p>
              </li>
            ))}
          </ul>
          <form className={s.nuevoComentario} onSubmit={enviar}>
            <input
              className={s.entrada}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder={`Comentar como ${autor || "vos"}…`}
              aria-label="Nuevo comentario"
              maxLength={500}
            />
            <Button submit size="sm" disabled={!comentario.trim()} aria-label="Enviar comentario">
              <Send size={14} aria-hidden="true" />
            </Button>
          </form>
        </div>

        <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} aria-hidden="true" />} onClick={onQuitar}>
          Eliminar tarjeta
        </Button>
      </div>
    </aside>
  );
}

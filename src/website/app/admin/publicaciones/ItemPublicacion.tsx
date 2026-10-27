import { memo } from "react";
import { SquarePen, Trash2 } from "lucide-react";

import s from "./ItemPublicacion.module.scss";
import BotonAccion from "@/app/components/ui/BotonAccion/BotonAccion";
import WhatsappIcon from "@/website/components/UI/icons/WhatsappIcon";
import { formatearFecha } from "@/website/lib/fechas";
import { linkWhatsApp } from "@/website/lib/contacto";
import { PUBLICACIONES } from "@/website/components/Contenido/publicaciones";
import type { Noticia } from "@/website/types";

type Props = {
  publicacion: Noticia;
  onEditar: (n: Noticia) => void;
  onBorrar: (n: Noticia) => void;
};

/** Enlace para compartir la publicación por WhatsApp, con título y URL pública. */
function linkCompartir(n: Noticia): string {
  const url = `${window.location.origin}${PUBLICACIONES[n.tipo ?? "Noticia"].ruta}/${n.id}`;
  return linkWhatsApp("", `${n.titulo} – ${url}`);
}

/** La tarjeta de una publicación: portada, estado, título, resumen y sus acciones. */
function ItemPublicacion({ publicacion: n, onEditar, onBorrar }: Props) {
  const esCurso = n.tipo === "Curso";

  return (
    <article className={s.tarjeta}>
      <div className={s.miniatura}>
        {n.portada ? <img src={n.portada} alt="" loading="lazy" /> : <span>Sin portada</span>}
      </div>

      <div className={s.cuerpo}>
        <div className={s.pastillas}>
          <span className={`${s.pastilla} ${esCurso ? s.curso : s.noticia}`}>{n.tipo ?? "Noticia"}</span>
          <span className={`${s.pastilla} ${n.publicada ? s.publicada : s.borrador}`}>{n.publicada ? "Publicada" : "Borrador"}</span>
        </div>

        <h3 className={s.titulo} title={n.titulo}>
          {n.titulo}
        </h3>
        <p className={s.resumen}>{n.resumen}</p>

        <div className={s.pie}>
          {n.fechaCreacion ? (
            <time className={s.fecha} dateTime={String(n.fechaCreacion)}>
              {formatearFecha(n.fechaCreacion, "corta")}
            </time>
          ) : (
            <span />
          )}
          <div className={s.acciones}>
            <BotonAccion icono={WhatsappIcon} etiqueta="Compartir por WhatsApp" href={linkCompartir(n)} />
            <BotonAccion icono={SquarePen} etiqueta="Editar publicación" onClick={() => onEditar(n)} />
            <BotonAccion icono={Trash2} etiqueta="Eliminar publicación" peligro onClick={() => onBorrar(n)} />
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(ItemPublicacion);

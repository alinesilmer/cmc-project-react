import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";

import Button from "../../UI/Button/Button";
import Revelar from "../../UI/Revelar/Revelar";
import ContenidoMarkdown from "../ContenidoMarkdown/ContenidoMarkdown";
import DocumentosPublicacion from "./DocumentosPublicacion";
import { getNewsPublica } from "../../../lib/news.client";
import { formatearFecha } from "../../../lib/fechas";
import { minutosDeLectura, normalizar } from "../../../lib/texto";
import { useTituloPagina } from "../../../hooks/useTituloPagina";
import { AUTOR_POR_DEFECTO, PUBLICACIONES, publicacionKey } from "../publicaciones";
import type { TipoPublicacion } from "../../../types";
import styles from "./DetallePublicacion.module.scss";

/** /noticias/:id y /cursos/:id. */
export default function DetallePublicacion({ tipo }: { tipo: TipoPublicacion }) {
  const { id = "" } = useParams<{ id: string }>();
  const config = PUBLICACIONES[tipo];

  const { data: publicacion, isPending, isError } = useQuery({
    queryKey: publicacionKey(id),
    queryFn: () => getNewsPublica(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useTituloPagina(publicacion?.titulo ?? config.tituloPagina);

  if (isPending) {
    return (
      <main className={styles.pagina} aria-busy="true">
        <div className={styles.cabecera} aria-hidden="true">
          <span className={`${styles.hueso} ${styles.huesoTitulo}`} />
          <span className={`${styles.hueso} ${styles.huesoTitulo} ${styles.huesoCorto}`} />
          <span className={`${styles.hueso} ${styles.huesoMeta}`} />
        </div>
        <span className={`${styles.hueso} ${styles.huesoPortada}`} aria-hidden="true" />
      </main>
    );
  }

  if (isError || !publicacion) {
    return (
      <main className={styles.pagina}>
        <div className={styles.estado}>
          <p>{config.noEncontrada}</p>
          <Button to={config.ruta} variant="outline" iconoIzquierda={<ArrowLeft />}>
            {config.volver}
          </Button>
        </div>
      </main>
    );
  }

  const portada = publicacion.portada?.trim();
  const resumen = publicacion.resumen?.trim();
  // El resumen va como entrada sólo si no es el mismo primer párrafo del texto.
  const mostrarResumen = resumen ? !normalizar(publicacion.contenido).includes(normalizar(resumen)) : false;

  return (
    <main className={styles.pagina}>
      <Revelar como="header" className={styles.cabecera} distancia={16} alVerse={false}>
        <Link to={config.ruta} className={styles.volver}>
          <ArrowLeft aria-hidden="true" />
          {config.tituloPagina}
        </Link>
        {publicacion.badge && <span className={styles.etiqueta}>{publicacion.badge}</span>}
        <h1 className={styles.titulo}>{publicacion.titulo}</h1>

        <ul className={styles.meta}>
          <li>
            <Calendar aria-hidden="true" />
            {formatearFecha(publicacion.fechaCreacion)}
          </li>
          <li>
            <User aria-hidden="true" />
            {publicacion.autor || AUTOR_POR_DEFECTO}
          </li>
          <li>
            <Clock aria-hidden="true" />
            {minutosDeLectura(publicacion.contenido)} min de lectura
          </li>
        </ul>
      </Revelar>

      {portada && (
        <Revelar className={styles.portada} distancia={16} alVerse={false}>
          <img src={portada} alt="" decoding="async" />
        </Revelar>
      )}

      <article className={styles.cuerpo}>
        {mostrarResumen && <p className={styles.resumen}>{resumen}</p>}
        <ContenidoMarkdown contenido={publicacion.contenido} className={styles.texto} />
        <DocumentosPublicacion documentos={publicacion.documentos ?? []} />
      </article>

      <footer className={styles.pie}>
        <Button to={config.ruta} variant="outline" iconoIzquierda={<ArrowLeft />}>
          {config.volver}
        </Button>
      </footer>
    </main>
  );
}

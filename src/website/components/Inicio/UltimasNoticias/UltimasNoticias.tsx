import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Revelar from "../../UI/Revelar/Revelar";
import TarjetaPublicacion from "../../Contenido/TarjetaPublicacion/TarjetaPublicacion";
import { listNewsPublicas } from "../../../lib/news.client";
import { PUBLICACIONES, publicacionesKey } from "../../Contenido/publicaciones";
import styles from "./UltimasNoticias.module.scss";

const CUANTAS = 3;
const RUTA = PUBLICACIONES.Noticia.ruta;

/** Las tres últimas noticias del Colegio: la portada siempre muestra algo nuevo. */
export default function UltimasNoticias() {
  // Misma clave y caché que /noticias: ir de una a otra no vuelve a pedir.
  const { data, isPending, isError } = useQuery({
    queryKey: publicacionesKey("Noticia"),
    queryFn: () => listNewsPublicas("Noticia"),
    staleTime: 5 * 60 * 1000,
  });

  // Sin noticias (o sin conexión) la sección no aparece: un hueco vacío no le dice nada a nadie.
  if (isError || (!isPending && !data?.length)) return null;

  const ultimas = (data ?? []).slice(0, CUANTAS);

  return (
    <section className={styles.seccion} aria-labelledby="ultimas-noticias">
      <Revelar className={styles.cabeza}>
        <h2 id="ultimas-noticias" className={styles.titulo}>
          Lo <em>último</em>
        </h2>
        <Link to={RUTA} className={styles.todas}>
          Ver todas <ArrowRight aria-hidden="true" />
        </Link>
      </Revelar>

      <div className={styles.grilla} aria-busy={isPending}>
        {isPending
          ? Array.from({ length: CUANTAS }, (_, i) => <div key={i} className={styles.esqueleto} />)
          : ultimas.map((n) => <TarjetaPublicacion key={n.id} publicacion={n} href={`${RUTA}/${n.id}`} />)}
      </div>
    </section>
  );
}

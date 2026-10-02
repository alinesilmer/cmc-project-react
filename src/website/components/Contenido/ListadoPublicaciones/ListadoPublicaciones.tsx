import { useQuery } from "@tanstack/react-query";
import ContenedorPagina from "../../UI/ContenedorPagina/ContenedorPagina";
import CabeceraFresca from "../../UI/CabeceraFresca/CabeceraFresca";
import ListadoContenido from "../ListadoContenido/ListadoContenido";
import { listNewsPublicas } from "../../../lib/news.client";
import { useTituloPagina } from "../../../hooks/useTituloPagina";
import { PUBLICACIONES, publicacionesKey } from "../publicaciones";
import type { Noticia, TipoPublicacion } from "../../../types";

const SIN_ITEMS: Noticia[] = [];

/** La página /noticias o /cursos completa: cabecera, datos y listado. */
export default function ListadoPublicaciones({ tipo }: { tipo: TipoPublicacion }) {
  const config = PUBLICACIONES[tipo];
  const { titulo, resaltado, bajada, lema, lemaResaltado } = config.cabecera;
  useTituloPagina(config.tituloPagina);

  // Con caché: volver del detalle al listado no vuelve a pedir todo.
  const { data = SIN_ITEMS, isPending } = useQuery({
    queryKey: publicacionesKey(tipo),
    queryFn: () => listNewsPublicas(tipo),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <ContenedorPagina>
      <CabeceraFresca
        titulo={
          <>
            {titulo} <span>{resaltado}</span>
          </>
        }
        bajada={bajada}
        lema={
          <>
            {lema} <em>{lemaResaltado}</em>
          </>
        }
        compacto
      />
      <ListadoContenido items={data} loading={isPending} textos={config.textos} rutaDetalle={config.ruta} />
    </ContenedorPagina>
  );
}

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";

import FormPublicacion from "./FormPublicacion";
import ItemPublicacion from "./ItemPublicacion";
import s from "./PublicacionesAdmin.module.scss";
import { publicacionesAdminKey, refrescarPublicaciones, type FiltroTipo } from "./publicaciones.queries";
import Button from "@/app/components/ui/Button/Button";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Paginador from "@/app/components/ui/Paginador/Paginador";
import { ErrorAccion } from "@/app/components/ui/ResultadoAccion/ResultadoAccion";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Segmentos from "@/app/components/ui/Segmentos/Segmentos";
import Vacio from "@/app/components/ui/Vacio/Vacio";
import { useConfirmacion } from "@/app/hooks/useConfirmacion";
import { useNotify } from "@/app/hooks/useNotify";
import { listNews, removeNews } from "@/website/lib/news.client";
import { coincide } from "@/website/lib/texto";
import { useDebounce } from "@/website/hooks/useDebounce";
import { usePaginacion } from "@/website/hooks/usePaginacion";
import type { Noticia } from "@/website/types";

const POR_PAGINA = 12;
const SIN_PUBLICACIONES: Noticia[] = [];

const TIPOS: { valor: FiltroTipo; rotulo: string }[] = [
  { valor: "Todos", rotulo: "Todas" },
  { valor: "Noticia", rotulo: "Noticias" },
  { valor: "Curso", rotulo: "Cursos" },
];

/** La solapa «Publicaciones»: filtros, alta/edición y el listado paginado. */
export default function PublicacionesAdmin() {
  const queryClient = useQueryClient();
  const notify = useNotify();
  const { pedir, modal } = useConfirmacion();
  const [tipo, setTipo] = useState<FiltroTipo>("Todos");
  const [busqueda, setBusqueda] = useState("");
  const termino = useDebounce(busqueda);
  const [editando, setEditando] = useState<Noticia | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);

  const { data: publicaciones = SIN_PUBLICACIONES, isPending, isError } = useQuery({
    queryKey: publicacionesAdminKey(tipo),
    queryFn: () => listNews(tipo === "Todos" ? undefined : { tipo }),
  });

  const filtradas = useMemo(
    () => publicaciones.filter((n) => coincide(termino, [n.titulo, n.resumen])),
    [publicaciones, termino],
  );
  const { pagina, totalPaginas, visibles, irA, rango } = usePaginacion(filtradas, POR_PAGINA, termino);

  const abrirForm = (n: Noticia | null) => {
    setEditando(n);
    setFormAbierto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cerrarForm = () => {
    setFormAbierto(false);
    setEditando(null);
  };

  const alGuardar = async () => {
    cerrarForm();
    await refrescarPublicaciones(queryClient);
  };

  const eliminar = async (n: Noticia) => {
    try {
      await removeNews(n.id);
      await refrescarPublicaciones(queryClient);
    } catch {
      notify.error("No se pudo eliminar la publicación. Intentá de nuevo.");
    }
  };

  const borrar = (n: Noticia) =>
    pedir({ titulo: "Eliminar publicación", mensaje: "¿Estás seguro de eliminar esta publicación?" }, () => void eliminar(n));

  return (
    <>
      <div className={s.barra}>
        <SearchField value={busqueda} onChange={(e) => setBusqueda(e.target.value)} onClear={() => setBusqueda("")} placeholder="Título o resumen" ariaLabel="Buscar publicaciones" />
        <Segmentos ariaLabel="Tipo de publicación" opciones={TIPOS} valor={tipo} onChange={setTipo} />
        <div className={s.nueva}>
          <Button leftIcon={<Plus size={16} aria-hidden="true" />} onClick={formAbierto ? cerrarForm : () => abrirForm(null)}>
            {formAbierto ? "Cancelar" : "Nueva publicación"}
          </Button>
        </div>
      </div>

      {formAbierto && <FormPublicacion key={editando?.id ?? "nueva"} publicacion={editando} onGuardada={alGuardar} onCancelar={cerrarForm} />}

      {isError && <ErrorAccion>No se pudieron cargar las publicaciones. Intentá de nuevo.</ErrorAccion>}

      {isPending ? (
        <Vacio icono={FileText}>
          <Cargando size={18} tono="marca" /> Cargando publicaciones…
        </Vacio>
      ) : filtradas.length === 0 ? (
        <Vacio icono={FileText}>{termino ? `Nada coincide con «${termino}»` : "Todavía no hay publicaciones"}</Vacio>
      ) : (
        <>
          <div className={s.tarjetas}>
            {visibles.map((n) => (
              <ItemPublicacion key={n.id} publicacion={n} onEditar={abrirForm} onBorrar={borrar} />
            ))}
          </div>

          <Paginador
            pagina={pagina}
            totalPaginas={totalPaginas}
            onCambiar={irA}
            numerado
            resumen={`${filtradas.length} ${filtradas.length === 1 ? "publicación" : "publicaciones"}`}
            estado={`${rango.desde}–${rango.hasta} de ${rango.total}`}
            etiqueta="Paginación de publicaciones"
          />
        </>
      )}
      {modal}
    </>
  );
}

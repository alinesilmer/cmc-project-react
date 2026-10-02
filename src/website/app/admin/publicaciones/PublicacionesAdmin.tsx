import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Button from "../../../components/UI/Button/Button";
import Buscador from "../../../components/UI/Buscador/Buscador";
import Paginacion from "../../../components/UI/Paginacion/Paginacion";
import Esqueletos from "../../../components/UI/Esqueletos/Esqueletos";
import Alerta from "../../../components/UI/Alerta/Alerta";
import FormPublicacion from "./FormPublicacion";
import ItemPublicacion from "./ItemPublicacion";
import { listNews, removeNews } from "../../../lib/news.client";
import { coincide } from "../../../lib/texto";
import { useDebounce } from "../../../hooks/useDebounce";
import { usePaginacion } from "../../../hooks/usePaginacion";
import { publicacionesAdminKey, refrescarPublicaciones, type FiltroTipo } from "./publicaciones.queries";
import type { Noticia } from "../../../types";
import styles from "./publicaciones.module.scss";

const POR_PAGINA = 10;
const SIN_PUBLICACIONES: Noticia[] = [];

/** La solapa «Publicaciones»: filtros, alta/edición y el listado paginado. */
export default function PublicacionesAdmin() {
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState<FiltroTipo>("Todos");
  const [busqueda, setBusqueda] = useState("");
  const termino = useDebounce(busqueda);
  const [editando, setEditando] = useState<Noticia | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: publicaciones = SIN_PUBLICACIONES, isPending, isError } = useQuery({
    queryKey: publicacionesAdminKey(tipo),
    queryFn: () => listNews(tipo === "Todos" ? undefined : { tipo }),
  });

  const filtradas = useMemo(
    () => publicaciones.filter((n) => coincide(termino, [n.titulo, n.resumen])),
    [publicaciones, termino]
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
    setError(null);
    cerrarForm();
    await refrescarPublicaciones(queryClient);
  };

  const borrar = async (n: Noticia) => {
    if (!confirm("¿Estás seguro de eliminar esta publicación?")) return;
    try {
      await removeNews(n.id);
      setError(null);
      await refrescarPublicaciones(queryClient);
    } catch {
      setError("Error al eliminar la publicación. Por favor, intentá de nuevo.");
    }
  };

  const mensajeError = error ?? (isError ? "Error al cargar las publicaciones. Intentá de nuevo." : null);

  return (
    <>
      {mensajeError && (
        <div className={styles.alerta}>
          <Alerta onCerrar={error ? () => setError(null) : undefined}>{mensajeError}</Alerta>
        </div>
      )}

      <div className={styles.filtersBar}>
        <Buscador
          valor={busqueda}
          onCambio={setBusqueda}
          placeholder="Buscar por título o resumen…"
          etiqueta="Buscar publicaciones"
          className={styles.buscador}
          compacto
        />

        <div className={styles.selectGroup}>
          <label className={styles.selectLabel} htmlFor="filtro-tipo">
            Tipo
          </label>
          <select
            id="filtro-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as FiltroTipo)}
            className={styles.select}
          >
            <option value="Todos">Todos</option>
            <option value="Noticia">Noticia</option>
            <option value="Curso">Curso</option>
          </select>
        </div>

        <div className={styles.rightActions}>
          <Button variant="primary" size="medium" iconoIzquierda={<Plus />} onClick={formAbierto ? cerrarForm : () => abrirForm(null)}>
            {formAbierto ? "Cancelar" : "Nueva publicación"}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {formAbierto && (
          <FormPublicacion key={editando?.id ?? "nueva"} publicacion={editando} onGuardada={alGuardar} onCancelar={cerrarForm} />
        )}
      </AnimatePresence>

      <div className={styles.noticias}>
        <div className={styles.noticiasHeader}>
          <h2>Publicaciones</h2>
          {!isPending && (
            <span className={styles.count}>
              {filtradas.length} {filtradas.length === 1 ? "resultado" : "resultados"}
            </span>
          )}
        </div>

        {isPending ? (
          <Esqueletos cantidad={6} className={styles.skeletonGrid} clasePieza={styles.skeleton} />
        ) : filtradas.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyMsg}>
              {termino ? `No hay resultados para "${termino}".` : "No hay publicaciones todavía."}
            </p>
            {!termino && (
              <Button variant="primary" size="medium" iconoIzquierda={<Plus />} onClick={() => abrirForm(null)}>
                Crear primera publicación
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {visibles.map((n) => (
                <ItemPublicacion key={n.id} publicacion={n} onEditar={abrirForm} onBorrar={borrar} />
              ))}
            </div>

            {totalPaginas > 1 && (
              <div className={styles.pie}>
                <span className={styles.pieInfo}>{`Mostrando ${rango.desde}–${rango.hasta} de ${rango.total}`}</span>
                <Paginacion pagina={pagina} totalPaginas={totalPaginas} onCambiar={irA} etiqueta="Paginación de publicaciones" />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiEdit, FiTrash2, FiLogOut, FiSearch } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import Button from "../../../components/UI/Button/Button";
import AdminMedicosPromo from "../MedicosPromo/MedicosPromo";
import NewsForm from "./NewsForm";
import styles from "./dashboard.module.scss";
import { useAuth } from "../../../../app/auth/AuthProvider";

import {
  listNews,
  removeNews,
  type TipoPublicacion,
} from "../../../lib/news.client";

import type { Noticia } from "../../../types";

type Tab = "noticias" | "promo";

type EditInitialValues = {
  titulo: string;
  resumen: string;
  contenido: string;
  publicada: boolean;
  tipo: TipoPublicacion;
  portadaUrl?: string;
  badge?: string;
};

const PAGE_SIZE = 10;

function fmtDate(d: Date | string | undefined) {
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(d as string));
  } catch {
    return "";
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [tab, setTab] = useState<Tab>("noticias");
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInitialValues, setEditInitialValues] = useState<EditInitialValues | undefined>(undefined);
  const [opError, setOpError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState<TipoPublicacion | "Todos">("Todos");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 180);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    if (tab !== "noticias") return;
    void cargarNoticias();
  }, [tab, tipo]);

  const cargarNoticias = async () => {
    try {
      setLoading(true);
      const data = await listNews(tipo === "Todos" ? undefined : { tipo });
      setNoticias(data);
    } catch (error) {
      console.error("Error al cargar noticias:", error);
      setOpError("Error al cargar las publicaciones. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (n: Noticia) => {
    setEditingId(n.id);
    setEditInitialValues({
      titulo: n.titulo,
      resumen: n.resumen,
      contenido: n.contenido || "",
      publicada: n.publicada ?? true,
      tipo: n.tipo ?? "Noticia",
      portadaUrl: n.portada || "",
      badge: n.badge ?? "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta publicación?")) return;
    try {
      await removeNews(id);
      setOpError(null);
      await cargarNoticias();
    } catch (error) {
      console.error("Error al eliminar noticia:", error);
      setOpError("Error al eliminar la publicación. Por favor, intentá de nuevo.");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/panel/login", { replace: true });
    }
  };

  const onShareWhatsApp = (n: Noticia) => {
    const url = `${window.location.origin}/noticias/${n.id}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${n.titulo} – ${url}`)}`,
      "_blank"
    );
  };

  const openNew = () => {
    setEditingId(null);
    setEditInitialValues(undefined);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setEditInitialValues(undefined);
  };

  const onFormSuccess = async () => {
    setOpError(null);
    closeForm();
    await cargarNoticias();
  };

  const filteredNoticias = useMemo(() => {
    const term = debouncedQ.trim().toLowerCase();
    if (!term) return noticias;
    return noticias.filter(
      (n) =>
        (n.titulo || "").toLowerCase().includes(term) ||
        (n.resumen || "").toLowerCase().includes(term)
    );
  }, [noticias, debouncedQ]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  const pageCount = Math.max(1, Math.ceil(filteredNoticias.length / PAGE_SIZE));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const startIdx = (page - 1) * PAGE_SIZE;
  const currentNoticias = useMemo(
    () => filteredNoticias.slice(startIdx, startIdx + PAGE_SIZE),
    [filteredNoticias, startIdx]
  );

  const visiblePages = useMemo(() => {
    const spread = 2;
    let from = Math.max(1, page - spread);
    let to = Math.min(pageCount, page + spread);
    if (to - from < 4) {
      if (from === 1) to = Math.min(pageCount, from + 4);
      else if (to === pageCount) from = Math.max(1, to - 4);
    }
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [page, pageCount]);

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.wrapperTabsTittle}>
          <h1>Panel de Administración</h1>
          <div className={styles.tabs}>
            <Button
              className={`${styles.tab} ${tab === "noticias" ? styles.active : ""}`}
              onClick={() => setTab("noticias")}
            >
              Publicaciones
            </Button>
            <Button
              className={`${styles.tab} ${tab === "promo" ? styles.active : ""}`}
              onClick={() => setTab("promo")}
            >
              Publicidad de doctores
            </Button>
          </div>
        </div>

        <Button variant="ghost" size="medium" icon={<FiLogOut />} onClick={handleLogout}>
          Cerrar Sesión
        </Button>
      </header>

      <div className={styles.container}>
        {opError && (
          <div className={styles.errorBanner} role="alert">
            <span>{opError}</span>
            <button type="button" onClick={() => setOpError(null)} aria-label="Cerrar">
              ×
            </button>
          </div>
        )}

        {tab === "noticias" && (
          <>
            {/* Filters bar */}
            <div className={styles.filtersBar}>
              <div className={styles.searchWrapper}>
                <FiSearch className={styles.searchIcon} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Buscar por título o resumen…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Buscar publicaciones"
                />
              </div>

              <div className={styles.selectGroup}>
                <label className={styles.selectLabel} htmlFor="filter-tipo">
                  Tipo
                </label>
                <select
                  id="filter-tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoPublicacion | "Todos")}
                  className={styles.select}
                >
                  <option value="Todos">Todos</option>
                  <option value="Noticia">Noticia</option>
                  <option value="Curso">Curso</option>
                </select>
              </div>

              <div className={styles.rightActions}>
                <Button
                  variant="primary"
                  size="medium"
                  icon={<FiPlus />}
                  onClick={showForm ? closeForm : openNew}
                >
                  {showForm ? "Cancelar" : "Nueva publicación"}
                </Button>
              </div>
            </div>

            {/* Form */}
            <AnimatePresence>
              {showForm && (
                <NewsForm
                  editingId={editingId}
                  initialValues={editInitialValues}
                  onSuccess={onFormSuccess}
                  onCancel={closeForm}
                />
              )}
            </AnimatePresence>

            {/* List */}
            <div className={styles.noticias}>
              <div className={styles.noticiasHeader}>
                <h2>Publicaciones</h2>
                {!loading && (
                  <span className={styles.count}>
                    {filteredNoticias.length}{" "}
                    {filteredNoticias.length === 1 ? "resultado" : "resultados"}
                  </span>
                )}
              </div>

              {loading ? (
                <div className={styles.skeletonGrid}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={styles.skeleton} />
                  ))}
                </div>
              ) : filteredNoticias.length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyMsg}>
                    {debouncedQ
                      ? `No hay resultados para "${debouncedQ}".`
                      : "No hay publicaciones todavía."}
                  </p>
                  {!debouncedQ && (
                    <Button variant="primary" size="medium" icon={<FiPlus />} onClick={openNew}>
                      Crear primera publicación
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className={styles.list}>
                    {currentNoticias.map((n) => (
                      <motion.div
                        key={n.id}
                        className={`${styles.noticiaItem} ${
                          n.tipo === "Curso" ? styles.tipoCurso : styles.tipoNoticia
                        }`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22 }}
                      >
                        <div className={styles.noticiaContent}>
                          <div className={styles.cardMeta}>
                            <span
                              className={`${styles.badge} ${
                                n.tipo === "Curso" ? styles.badgeCurso : styles.badgeNoticia
                              }`}
                            >
                              {n.tipo ?? "Noticia"}
                            </span>
                            <span
                              className={`${styles.statusBadge} ${
                                n.publicada ? styles.statusPublished : styles.statusDraft
                              }`}
                            >
                              {n.publicada ? "Publicada" : "Borrador"}
                            </span>
                          </div>
                          <h3 title={n.titulo}>{n.titulo}</h3>
                          <p>{n.resumen}</p>
                          {n.fechaCreacion && (
                            <time
                              className={styles.cardDate}
                              dateTime={String(n.fechaCreacion)}
                            >
                              {fmtDate(n.fechaCreacion)}
                            </time>
                          )}
                        </div>

                        <div className={styles.noticiaActions}>
                          <button
                            onClick={() => onShareWhatsApp(n)}
                            title="Compartir por WhatsApp"
                            aria-label="Compartir por WhatsApp"
                            className={styles.actionWhatsapp}
                          >
                            <FaWhatsapp />
                          </button>
                          <button
                            onClick={() => handleEdit(n)}
                            title="Editar"
                            aria-label="Editar publicación"
                            className={styles.actionEdit}
                          >
                            <FiEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(n.id)}
                            title="Eliminar"
                            aria-label="Eliminar publicación"
                            className={styles.actionDelete}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {pageCount > 1 && (
                    <div className={styles.pager}>
                      <div className={styles.pagerInfo}>
                        {`Mostrando ${startIdx + 1}–${Math.min(
                          startIdx + PAGE_SIZE,
                          filteredNoticias.length
                        )} de ${filteredNoticias.length}`}
                      </div>
                      <div className={styles.pagerNav}>
                        <button
                          className={styles.pagerBtn}
                          disabled={page === 1}
                          onClick={() => setPage(1)}
                          aria-label="Primera página"
                        >
                          «
                        </button>
                        <button
                          className={styles.pagerBtn}
                          disabled={page === 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          aria-label="Anterior"
                        >
                          ‹
                        </button>
                        {visiblePages.map((num) => (
                          <button
                            key={num}
                            className={`${styles.pagerBtn} ${num === page ? styles.active : ""}`}
                            onClick={() => setPage(num)}
                            aria-current={num === page ? "page" : undefined}
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          className={styles.pagerBtn}
                          disabled={page === pageCount}
                          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                          aria-label="Siguiente"
                        >
                          ›
                        </button>
                        <button
                          className={styles.pagerBtn}
                          disabled={page === pageCount}
                          onClick={() => setPage(pageCount)}
                          aria-label="Última página"
                        >
                          »
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {tab === "promo" && (
          <div className={styles.tabContent}>
            <AdminMedicosPromo />
          </div>
        )}
      </div>
    </div>
  );
}

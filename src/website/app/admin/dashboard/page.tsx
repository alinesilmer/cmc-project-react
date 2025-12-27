// src/website/app/admin/dashboard/page.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiPlus, FiEdit, FiTrash2, FiLogOut } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import Button from "../../../components/UI/Button/Button";
import AdminMedicosPromo from "../MedicosPromo/MedicosPromo";
import styles from "./dashboard.module.scss";
import { useAuth } from "../../../../app/auth/AuthProvider";

import {
  listNews,
  createNews,
  updateNews,
  removeNews,
  getNewsById,
  removeNewsDoc,
  type TipoPublicacion,
} from "../../../lib/news.client";

import type { Noticia } from "../../../types";
import { marked } from "marked";
import DOMPurify from "dompurify";

// type Preview =
//   | { kind: "none" }
//   | { kind: "image"; url: string }
//   | { kind: "pdf"; url: string };

type Tab = "noticias" | "promo";

type DocItem = {
  id: number | string;
  original_name?: string;
  filename: string;
  content_type?: string | null;
  size?: number | null;
  path: string;
  label?: string | null;
};

const PAGE_SIZE = 10;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // ---- Tabs (Noticias por defecto) ----
  const [tab, setTab] = useState<Tab>("noticias");

  // ---- Noticias / CRUD ----
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- Formulario de Noticia ----
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    titulo: string;
    resumen: string;
    contenido: string;
    publicada: boolean;
    tipo: TipoPublicacion;
  }>({
    titulo: "",
    resumen: "",
    contenido: "",
    publicada: true,
    tipo: "Noticia", // default
  });

  // Portada (single)
  const [portadaFile, setPortadaFile] = useState<File | null>(null);
  const [portadaPreview, setPortadaPreview] = useState<string>("");
  const [clearPortada, setClearPortada] = useState(false);

  // Adjuntos (múltiples)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingDocs, setExistingDocs] = useState<DocItem[]>([]);

  // Refs
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const portadaInputRef = useRef<HTMLInputElement>(null);
  const adjuntosInputRef = useRef<HTMLInputElement>(null);

  // ---- Filtro + paginado (cliente) ----
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState<TipoPublicacion | "Todos">("Todos");

  // Cargar noticias cuando la pestaña activa es "noticias"
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
    } finally {
      setLoading(false);
    }
  };

  const previewHtml = useMemo(() => {
    const raw = marked.parse(formData.contenido, {
      gfm: true,
      breaks: true,
    }) as string;
    return DOMPurify.sanitize(raw);
  }, [formData.contenido]);

  function wrapSelection(prefix: string, suffix = prefix) {
    const ta = textAreaRef.current;
    if (!ta) return;
    const { selectionStart, selectionEnd, value } = ta;
    const before = value.slice(0, selectionStart);
    const selected = value.slice(selectionStart, selectionEnd);
    const after = value.slice(selectionEnd);
    const next = `${before}${prefix}${selected || "texto"}${suffix}${after}`;
    setFormData((prev) => ({ ...prev, contenido: next }));
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(
        selectionStart + prefix.length,
        selectionStart + prefix.length + (selected || "texto").length
      );
    }, 0);
  }

  // -------- Portada (single) ----------
  const onPickPortada = () => portadaInputRef.current?.click();
  const onChangePortada: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] || null;
    if (!f) return;
    if (portadaPreview && portadaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(portadaPreview);
    }
    setPortadaFile(f);
    setClearPortada(false);
    const blobUrl = URL.createObjectURL(f);
    setPortadaPreview(blobUrl);
    if (portadaInputRef.current) portadaInputRef.current.value = "";
  };
  const onClearPortada = () => {
    if (portadaPreview && portadaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(portadaPreview);
    }
    setPortadaFile(null);
    setPortadaPreview("");
    setClearPortada(true);
  };

  // -------- Adjuntos (multi) ----------
  const onPickAdjuntos = () => adjuntosInputRef.current?.click();
  const onChangeAdjuntos: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPendingFiles((prev) => [...prev, ...files]);
    if (adjuntosInputRef.current) adjuntosInputRef.current.value = "";
  };
  const onRemovePendingAdjunto = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // -------- Documentos existentes (al editar) ----------
  // const fileBase = (p?: string) => {
  //   if (!p) return "";
  //   try {
  //     const u = new URL(p, window.location.origin);
  //     const s = u.pathname.split("/");
  //     return s[s.length - 1] || "";
  //   } catch {
  //     const s = String(p).split("/");
  //     return s[s.length - 1] || "";
  //   }
  // };

  const handleRemoveExistingDoc = async (docId: number | string) => {
    if (!editingId) return;
    const ok = confirm("¿Quitar este documento de la noticia?");
    if (!ok) return;
    try {
      await removeNewsDoc(editingId, docId);
      setExistingDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch (e) {
      console.error("No se pudo eliminar el documento:", e);
      alert("No se pudo eliminar el documento.");
    }
  };

  // const onPickFile = () => adjuntosInputRef.current?.click(); // alias para el botón principal "Agregar adjuntos"

  // -------- Crear / Actualizar ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        titulo: formData.titulo,
        resumen: formData.resumen,
        contenido: formData.contenido,
        publicada: formData.publicada,
        tipo: formData.tipo,
      };

      if (editingId) {
        await updateNews(editingId, payload, {
          portada: portadaFile || undefined,
          clearPortada,
          adjuntos: pendingFiles,
        });
      } else {
        await createNews(payload, {
          portada: portadaFile || undefined,
          adjuntos: pendingFiles,
        });
      }

      resetForm();
      await cargarNoticias();
    } catch (error) {
      console.error("Error al guardar noticia:", error);
      alert("Error al guardar la noticia");
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      titulo: "",
      resumen: "",
      contenido: "",
      publicada: true,
      tipo: "Noticia",
    });
    // limpiar portada
    if (portadaPreview && portadaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(portadaPreview);
    }
    setPortadaFile(null);
    setPortadaPreview("");
    setClearPortada(false);
    // limpiar adjuntos
    setPendingFiles([]);
    // limpiar docs existentes
    setExistingDocs([]);
  };

  const handleEdit = async (n: Noticia) => {
    setEditingId(n.id);
    setShowForm(true);
    setFormData({
      titulo: n.titulo,
      resumen: n.resumen,
      contenido: (n as any).contenido || "",
      publicada: (n as any).publicada ?? true,
      tipo: (n as any).tipo ?? "Noticia", // ✅
    });

    // Portada existente (string absoluto/relativo). No la pasamos como File,
    // solo mostramos preview; si el usuario sube una nueva, reemplazará.
    setPortadaFile(null);
    setClearPortada(false);
    setPortadaPreview((n as any)?.portada || "");

    setPendingFiles([]);

    try {
      const detail = await getNewsById(n.id);
      setExistingDocs(detail.documentos || []);
    } catch (e) {
      console.error("No se pudo cargar documentos de la noticia:", e);
      setExistingDocs([]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta noticia?")) return;
    try {
      await removeNews(id);
      await cargarNoticias();
    } catch (error) {
      console.error("Error al eliminar noticia:", error);
      alert("Error al eliminar la noticia");
    }
  };

  const handleLogout = async () => {
    try {
      await logout(); // 👉 llama a /auth/logout y limpia cookies + contexto + sessionStorage
    } finally {
      navigate("/panel/login", { replace: true }); // volvés al login unificado
    }
  };

  // Compartir
  const buildShare = (n: Noticia) => {
    const base = window.location.origin;
    const url = `${base}/noticias/${n.id}`;
    const text = `${n.titulo}`;
    const whatsapp = `https://wa.me/?text=${encodeURIComponent(
      `${text} – ${url}`
    )}`;
    return { url, text, whatsapp };
  };
  const onShareWhatsApp = (n: Noticia) => {
    const { whatsapp } = buildShare(n);
    window.open(whatsapp, "_blank");
  };

  // ---- Búsqueda + paginado (cliente) ----
  const filteredNoticias = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return noticias;
    return noticias.filter((n) => {
      const t = (n.titulo || "").toLowerCase();
      const r = (n.resumen || "").toLowerCase();
      return t.includes(term) || r.includes(term);
    });
  }, [noticias, q]);

  useEffect(() => {
    setPage(1);
  }, [q]);

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

          {/* Pestañas: Noticias / Publicidad de doctores */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${
                tab === "noticias" ? styles.active : ""
              }`}
              onClick={() => setTab("noticias")}
            >
              Publicaciones
            </button>
            <button
              className={`${styles.tab} ${
                tab === "promo" ? styles.active : ""
              }`}
              onClick={() => setTab("promo")}
            >
              Publicidad de doctores
            </button>
          </div>
        </div>

        <Button
          variant="default"
          size="medium"
          icon={<FiLogOut />}
          onClick={handleLogout}
        >
          Cerrar Sesión
        </Button>
      </header>

      <div className={styles.container}>
        {/* ---- TAB NOTICIAS ---- */}
        {tab === "noticias" && (
          <>
            {/* Barra de filtros + acción */}
            <div className={styles.filtersBar}>
              <div className={styles.searchGroup}>
                <input
                  type="search"
                  placeholder="Buscar por título o resumen…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className={styles.selectGroup}>
                <label className={styles.selectLabel}>Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className={styles.select}
                >
                  <option value="Todos">Todos</option>
                  <option value="Noticia">Noticia</option>
                  <option value="Blog">Blog</option>
                  <option value="Curso">Curso</option>
                </select>
              </div>

              <div className={styles.rightActions}>
                <Button
                  variant="primary"
                  size="medium"
                  icon={<FiPlus />}
                  onClick={() => {
                    const togglingToOpen = !showForm;
                    setShowForm(togglingToOpen);
                    if (togglingToOpen) {
                      // preparando un nuevo registro
                      setEditingId(null);
                      setFormData({
                        titulo: "",
                        resumen: "",
                        contenido: "",
                        publicada: true,
                        tipo: "Noticia",
                      });
                      // limpiar portada
                      if (
                        portadaPreview &&
                        portadaPreview.startsWith("blob:")
                      ) {
                        URL.revokeObjectURL(portadaPreview);
                      }
                      setPortadaFile(null);
                      setPortadaPreview("");
                      setClearPortada(false);
                      // limpiar adjuntos y docs
                      setPendingFiles([]);
                      setExistingDocs([]);
                    }
                  }}
                >
                  {showForm ? "Cancelar" : "Nuevo"}
                </Button>
              </div>
            </div>

            {/* Formulario */}
            {showForm && (
              <motion.div
                className={styles.form}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <form onSubmit={handleSubmit}>
                  <div className={styles.inputGroup}>
                    <label>Título</label>
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(e) =>
                        setFormData({ ...formData, titulo: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Resumen</label>
                    <textarea
                      value={formData.resumen}
                      onChange={(e) =>
                        setFormData({ ...formData, resumen: e.target.value })
                      }
                      rows={3}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <div className={styles.inlineBetween}>
                      <div className={styles.switchWrap}>
                        <label className={styles.switchLabel}>
                          <input
                            type="checkbox"
                            checked={formData.publicada}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                publicada: e.target.checked,
                              }))
                            }
                          />
                          <span>Publicada</span>
                        </label>
                      </div>
                      <label>Contenido (Markdown)</label>
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Tipo</label>
                      <select
                        value={formData.tipo}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            tipo: e.target.value as TipoPublicacion,
                          }))
                        }
                        className={styles.select}
                      >
                        <option value="Noticia">Noticia</option>
                        <option value="Blog">Blog</option>
                        <option value="Curso">Curso</option>
                      </select>
                      <p className={styles.helpText}>
                        Elegí si esta publicación es una Noticia, Blog o Curso.
                      </p>
                    </div>

                    <div className={styles.toolbar}>
                      <button type="button" onClick={() => wrapSelection("**")}>
                        Negrita
                      </button>
                      <button type="button" onClick={() => wrapSelection("*")}>
                        Cursiva
                      </button>
                      <button
                        type="button"
                        onClick={() => wrapSelection("## ", "")}
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        onClick={() => wrapSelection("- ", "")}
                      >
                        • Lista
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((p) => ({
                            ...p,
                            contenido:
                              p.contenido +
                              (p.contenido ? "\n" : "") +
                              "[texto](https://ejemplo.com)",
                          }))
                        }
                      >
                        Enlace
                      </button>
                      <button
                        type="button"
                        onClick={() => wrapSelection("> ", "")}
                      >
                        Cita
                      </button>
                    </div>

                    <textarea
                      ref={textAreaRef}
                      value={formData.contenido}
                      onChange={(e) =>
                        setFormData({ ...formData, contenido: e.target.value })
                      }
                      rows={12}
                      placeholder={`Usa Markdown:
## Subtítulo
Párrafo 1.

Párrafo 2 (línea en blanco entre párrafos).
- Item 1
- Item 2
**negrita**, *cursiva*, [link](https://...)`}
                      className={styles.textarea}
                      required
                    />

                    <div
                      className={styles.preview}
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </div>

                  {/* Portada */}
                  <div className={styles.inputGroup}>
                    <label>Portada (opcional)</label>
                    <div className={styles.imageRow}>
                      <Button
                        type="button"
                        size="medium"
                        variant="outline"
                        onClick={onPickPortada}
                      >
                        {portadaFile
                          ? "Cambiar portada"
                          : portadaPreview
                          ? "Reemplazar portada"
                          : "Subir portada"}
                      </Button>
                      {portadaPreview && (
                        <Button
                          type="button"
                          size="medium"
                          variant="outline"
                          onClick={onClearPortada}
                        >
                          Quitar portada
                        </Button>
                      )}
                      <input
                        ref={portadaInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={onChangePortada}
                      />
                    </div>

                    {portadaPreview && (
                      <div className={styles.previewMedia}>
                        <img src={portadaPreview} alt="Portada" />
                      </div>
                    )}
                  </div>

                  {/* Adjuntos múltiples */}
                  <div className={styles.inputGroup}>
                    <label>Adjuntos (imágenes o PDFs)</label>
                    <div className={styles.imageRow}>
                      <Button
                        type="button"
                        size="medium"
                        variant="outline"
                        onClick={onPickAdjuntos}
                      >
                        Agregar adjuntos
                      </Button>
                      <input
                        ref={adjuntosInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        hidden
                        onChange={onChangeAdjuntos}
                      />
                    </div>

                    {pendingFiles.length > 0 && (
                      <div className={styles.attachList}>
                        {pendingFiles.map((f, idx) => (
                          <div key={idx} className={styles.attachItem}>
                            <div className={styles.attachInfo}>
                              {(f.type.startsWith("image/") && "🖼️") ||
                                (f.type === "application/pdf" && "📄") ||
                                "📎"}{" "}
                              {f.name}
                            </div>
                            <button
                              type="button"
                              className={styles.removeBtn}
                              onClick={() => onRemovePendingAdjunto(idx)}
                            >
                              Quitar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Documentos ya guardados (cuando se edita) */}
                  {editingId && existingDocs.length > 0 && (
                    <div className={styles.inputGroup}>
                      <label>Documentos existentes</label>
                      <div className={styles.attachList}>
                        {existingDocs.map((d) => {
                          const isImage =
                            (d.content_type || "").startsWith("image/") ||
                            /\.(png|jpe?g|gif|webp|avif)$/i.test(d.path || "");
                          const isPdf =
                            (d.content_type || "").toLowerCase() ===
                              "application/pdf" || /\.pdf$/i.test(d.path || "");
                          return (
                            <div
                              key={String(d.id)}
                              className={styles.attachItem}
                            >
                              <div className={styles.attachInfo}>
                                {isImage ? "🖼️" : isPdf ? "📄" : "📎"}{" "}
                                <a
                                  href={d.path}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={d.original_name || d.filename}
                                >
                                  {d.original_name || d.filename}
                                </a>
                              </div>
                              <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => handleRemoveExistingDoc(d.id)}
                              >
                                Quitar
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="medium"
                    fullWidth={false}
                  >
                    {editingId ? "Actualizar" : "Publicar"}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* Listado + paginado */}
            <div className={styles.noticias}>
              <h2>Pubicaciones</h2>
              {loading ? (
                <p>Cargando...</p>
              ) : filteredNoticias.length === 0 ? (
                q ? (
                  <p>No hay noticias que coincidan con “{q}”.</p>
                ) : (
                  <p>No hay noticias publicadas</p>
                )
              ) : (
                <>
                  <div className={styles.list}>
                    {currentNoticias.map((n) => (
                      <motion.div
                        key={n.id}
                        className={styles.noticiaItem}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className={styles.noticiaContent}>
                          <h3>{n.titulo}</h3>
                          <p>{n.resumen}</p>
                          <span className={styles.badge}>
                            {(n as any).tipo ?? "Noticia"}
                          </span>
                        </div>
                        <div className={styles.noticiaActions}>
                          <button
                            onClick={() => onShareWhatsApp(n)}
                            title="Compartir por WhatsApp"
                          >
                            <FaWhatsapp />
                          </button>
                          <button onClick={() => handleEdit(n)} title="Editar">
                            <FiEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(n.id)}
                            title="Eliminar"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className={styles.pager}>
                    <div className={styles.pagerInfo}>
                      {filteredNoticias.length > 0
                        ? `Mostrando ${startIdx + 1}–${Math.min(
                            startIdx + PAGE_SIZE,
                            filteredNoticias.length
                          )} de ${filteredNoticias.length}`
                        : `Mostrando 0 de 0`}
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
                          className={`${styles.pagerBtn} ${
                            num === page ? styles.active : ""
                          }`}
                          onClick={() => setPage(num)}
                          aria-current={num === page ? "page" : undefined}
                        >
                          {num}
                        </button>
                      ))}

                      <button
                        className={styles.pagerBtn}
                        disabled={page === pageCount}
                        onClick={() =>
                          setPage((p) => Math.min(pageCount, p + 1))
                        }
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
                </>
              )}
            </div>
          </>
        )}

        {/* ---- TAB PROMO DOCTORES ---- */}
        {tab === "promo" && (
          <div className={styles.tabContent}>
            <AdminMedicosPromo />
          </div>
        )}
      </div>
    </div>
  );
}

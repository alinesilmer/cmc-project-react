import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiPlus, FiEdit, FiTrash2, FiLogOut } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import Button from "../../../components/UI/Button/Button";
import { api } from "../../../lib/api";
import type { Noticia, NoticiaCreate } from "../../../lib/api";
import { marked } from "marked";
import DOMPurify from "dompurify";
import styles from "./dashboard.module.scss";
import AdminMedicosPromo from "../MedicosPromo/MedicosPromo";

type Preview =
  | { kind: "none" }
  | { kind: "image"; url: string }
  | { kind: "pdf"; url: string };

export default function DashboardPage() {
  const navigate = useNavigate();
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NoticiaCreate>({
    titulo: "",
    resumen: "",
    contenido: "",
    imagen: "",
    archivo: "",
  });

  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Preview>({ kind: "none" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/admin/login");
    cargarNoticias();
    return () => {
      if (preview.kind !== "none" && preview.url.startsWith("blob:")) {
        URL.revokeObjectURL(preview.url);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarNoticias = async () => {
    try {
      const data = await api.obtenerNoticias();
      setNoticias(data);
    } catch (error) {
      console.error("Error al cargar noticias:", error);
    } finally {
      setLoading(false);
    }
  };

  const previewHtml = useMemo(() => {
    const raw = marked.parse(formData.contenido, { gfm: true, breaks: true }) as string;
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

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const localPreview = URL.createObjectURL(file);
      const { url, mimetype } = await api.subirArchivo(token, file);

      if (mimetype === "application/pdf" || file.type === "application/pdf") {
        setFormData((prev) => ({ ...prev, archivo: url, imagen: prev.imagen || "" }));
        setPreview({ kind: "pdf", url: localPreview });
      } else {
        setFormData((prev) => ({ ...prev, imagen: url, archivo: prev.archivo || "" }));
        setPreview({ kind: "image", url: localPreview });
      }
    } catch (err) {
      console.error("Error al subir archivo:", err);
      alert("No se pudo subir el archivo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const payload: NoticiaCreate = {
        titulo: formData.titulo,
        resumen: formData.resumen,
        contenido: formData.contenido,
        ...(formData.imagen ? { imagen: formData.imagen } : {}),
        ...(formData.archivo ? { archivo: formData.archivo } : {}),
      };

      if (editingId) await api.actualizarNoticia(token, editingId, payload);
      else await api.crearNoticia(token, payload);

      setShowForm(false);
      setEditingId(null);
      setFormData({ titulo: "", resumen: "", contenido: "", imagen: "", archivo: "" });
      if (preview.kind !== "none" && preview.url.startsWith("blob:")) {
        URL.revokeObjectURL(preview.url);
      }
      setPreview({ kind: "none" });
      cargarNoticias();
    } catch (error) {
      console.error("Error al guardar noticia:", error);
      alert("Error al guardar la noticia");
    }
  };

  const handleEdit = (n: Noticia) => {
    setEditingId(n.id);
    setFormData({
      titulo: n.titulo,
      resumen: n.resumen,
      contenido: n.contenido,
      imagen: n.imagen || "",
      archivo: n.archivo || "",
    });
    if (n.archivo) setPreview({ kind: "pdf", url: n.archivo });
    else if (n.imagen) setPreview({ kind: "image", url: n.imagen });
    else setPreview({ kind: "none" });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta noticia?")) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await api.eliminarNoticia(token, id);
      cargarNoticias();
    } catch (error) {
      console.error("Error al eliminar noticia:", error);
      alert("Error al eliminar la noticia");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/admin/login");
  };

  const buildShare = (n: Noticia) => {
    const base = window.location.origin;
    const url = `${base}/noticias/${n.id}`;
    const text = `${n.titulo}`;
    const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text} – ${url}`)}`;
    return { url, text, whatsapp };
  };

  const onShareWhatsApp = (n: Noticia) => {
    const { whatsapp } = buildShare(n);
    window.open(whatsapp, "_blank");
  };

  const onShareInstagram = async (n: Noticia) => {
    const { url, text } = buildShare(n);
    if (navigator.share) {
      try {
        await navigator.share({ title: n.titulo, text, url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      alert("Enlace copiado. Pégalo en Instagram.");
    } catch {
      window.open(url, "_blank");
    }
  };

  const downloadHref = () => formData.archivo || (preview.kind === "pdf" ? preview.url : "");

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1>Panel de Administración</h1>
        <Button variant="outline" size="large" icon={<FiLogOut />} onClick={handleLogout}>
          Cerrar Sesión
        </Button>
      </header>

      <div className={styles.container}>
        <div className={styles.actions}>
          <Button
            variant="primary"
            size="large"
            icon={<FiPlus />}
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({ titulo: "", resumen: "", contenido: "", imagen: "", archivo: "" });
              setPreview({ kind: "none" });
            }}
          >
            {showForm ? "Cancelar" : "Nueva Noticia"}
          </Button>
        </div>

        {showForm && (
          <motion.div className={styles.form} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
            <form onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label>Título</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Resumen</label>
                <textarea
                  value={formData.resumen}
                  onChange={(e) => setFormData({ ...formData, resumen: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Contenido (Markdown)</label>

                <div className={styles.toolbar}>
                  <button type="button" onClick={() => wrapSelection("**")}>Negrita</button>
                  <button type="button" onClick={() => wrapSelection("*")}>Cursiva</button>
                  <button type="button" onClick={() => wrapSelection("## ", "")}>H2</button>
                  <button type="button" onClick={() => wrapSelection("- ", "")}>• Lista</button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        contenido: p.contenido + (p.contenido ? "\n" : "") + "[texto](https://ejemplo.com)",
                      }))
                    }
                  >
                    Enlace
                  </button>
                  <button type="button" onClick={() => wrapSelection("> ", "")}>Cita</button>
                </div>

                <textarea
                  ref={textAreaRef}
                  value={formData.contenido}
                  onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
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

                <div className={styles.preview} dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>

              <div className={styles.inputGroup}>
                <label>Adjunto (imagen o PDF)</label>
                <div className={styles.imageRow}>
                  <input
                    type="text"
                    value={formData.archivo || formData.imagen || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.trim().toLowerCase().endsWith(".pdf")) {
                        setFormData({ ...formData, archivo: val, imagen: "" });
                        setPreview({ kind: "pdf", url: val });
                      } else {
                        setFormData({ ...formData, imagen: val, archivo: "" });
                        setPreview({ kind: "image", url: val });
                      }
                    }}
                    placeholder="/uploads/archivo.pdf o /uploads/imagen.jpg"
                  />
                  <Button type="button" size="large" variant="outline" onClick={onPickFile}>
                    {uploading ? "Subiendo..." : "Subir archivo"}
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*,application/pdf" hidden onChange={onFileChange} />
                </div>

                {preview.kind === "image" && (
                  <div className={styles.previewMedia}>
                    <img src={preview.url} alt="Vista previa" />
                  </div>
                )}

                {preview.kind === "pdf" && (
                  <div className={styles.previewMedia}>
                    <a href={downloadHref()} target="_blank" rel="noreferrer">Ver PDF</a>
                    {downloadHref() && (
                      <a href={downloadHref()} download className={styles.downloadBtn}>Descargar PDF</a>
                    )}
                  </div>
                )}
              </div>

              <Button type="submit" variant="primary" size="medium" fullWidth={false} disabled={uploading}>
                {editingId ? "Actualizar" : "Publicar"}
              </Button>
            </form>
          </motion.div>
        )}

        <div className={styles.noticias}>
          <h2>Noticias Publicadas</h2>
          {loading ? (
            <p>Cargando...</p>
          ) : noticias.length === 0 ? (
            <p>No hay noticias publicadas</p>
          ) : (
            <div className={styles.list}>
              {noticias.map((n) => (
                <motion.div key={n.id} className={styles.noticiaItem} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className={styles.noticiaContent}>
                    <h3>{n.titulo}</h3>
                    <p>{n.resumen}</p>
                  </div>
                  <div className={styles.noticiaActions}>
                    <button onClick={() => onShareWhatsApp(n)} title="Compartir por WhatsApp">
                      <FaWhatsapp />
                    </button>
                    <button onClick={() => handleEdit(n)} title="Editar">
                      <FiEdit />
                    </button>
                    <button onClick={() => handleDelete(n.id)} title="Eliminar">
                      <FiTrash2 />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        <AdminMedicosPromo/>
      </div>
    </div>
  );
}

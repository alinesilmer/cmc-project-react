
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Button from "../../../components/UI/Button/Button";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  createNews,
  updateNews,
  removeNewsDoc,
  getNewsById,
  type TipoPublicacion,
} from "../../../lib/news.client";
import styles from "./dashboard.module.scss";

type DocItem = {
  id: number | string;
  original_name?: string;
  filename: string;
  content_type?: string | null;
  size?: number | null;
  path: string;
  label?: string | null;
};

export type NewsFormProps = {
  editingId: string | null;
  initialValues?: {
    titulo: string;
    resumen: string;
    contenido: string;
    publicada: boolean;
    tipo: TipoPublicacion;
    portadaUrl?: string;
    badge?: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
};

export default function NewsForm({
  editingId,
  initialValues,
  onSuccess,
  onCancel,
}: NewsFormProps) {
  const [formData, setFormData] = useState({
    titulo: initialValues?.titulo ?? "",
    resumen: initialValues?.resumen ?? "",
    contenido: initialValues?.contenido ?? "",
    publicada: initialValues?.publicada ?? true,
    tipo: (initialValues?.tipo ?? "Noticia") as TipoPublicacion,
    badge: initialValues?.badge ?? "",
  });

  const [portadaFile, setPortadaFile] = useState<File | null>(null);
  const [portadaPreview, setPortadaPreview] = useState<string>(
    initialValues?.portadaUrl ?? ""
  );
  const [clearPortada, setClearPortada] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingDocs, setExistingDocs] = useState<DocItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const portadaInputRef = useRef<HTMLInputElement>(null);
  const adjuntosInputRef = useRef<HTMLInputElement>(null);

  // Load existing docs and badge when editing
  useEffect(() => {
    if (!editingId) return;
    getNewsById(editingId)
      .then((detail) => {
        setExistingDocs(detail.documentos ?? []);
        setFormData((prev) => ({ ...prev, badge: detail.badge ?? "" }));
      })
      .catch((e) => console.error("No se pudo cargar documentos:", e));
  }, [editingId]);

  const previewHtml = useMemo(() => {
    if (!showPreview) return "";
    try {
      const raw = marked.parse(formData.contenido, {
        gfm: true,
        breaks: true,
      }) as string;
      return DOMPurify.sanitize(raw);
    } catch {
      return formData.contenido
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
  }, [formData.contenido, showPreview]);

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

  const onPickPortada = () => portadaInputRef.current?.click();
  const onChangePortada: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] || null;
    if (!f) return;
    if (portadaPreview?.startsWith("blob:")) URL.revokeObjectURL(portadaPreview);
    setPortadaFile(f);
    setClearPortada(false);
    setPortadaPreview(URL.createObjectURL(f));
    if (portadaInputRef.current) portadaInputRef.current.value = "";
  };
  const onClearPortada = () => {
    if (portadaPreview?.startsWith("blob:")) URL.revokeObjectURL(portadaPreview);
    setPortadaFile(null);
    setPortadaPreview("");
    setClearPortada(true);
  };

  const onPickAdjuntos = () => adjuntosInputRef.current?.click();
  const onChangeAdjuntos: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPendingFiles((prev) => [...prev, ...files]);
    if (adjuntosInputRef.current) adjuntosInputRef.current.value = "";
  };
  const onRemovePending = (idx: number) =>
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleRemoveExistingDoc = async (docId: number | string) => {
    if (!editingId) return;
    if (!confirm("¿Quitar este documento de la publicación?")) return;
    try {
      await removeNewsDoc(editingId, docId);
      setExistingDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch (e) {
      console.error("No se pudo eliminar el documento:", e);
      setFormError("No se pudo eliminar el documento.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const payload = {
        titulo: formData.titulo,
        resumen: formData.resumen,
        contenido: formData.contenido,
        publicada: formData.publicada,
        tipo: formData.tipo,
        badge: formData.badge,
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
      onSuccess();
    } catch (error) {
      console.error("Error al guardar noticia:", error);
      setFormError("Error al guardar la publicación. Por favor, intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className={styles.form}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
    >
      <form onSubmit={handleSubmit}>
        {formError && (
          <div className={styles.formErrorBanner} role="alert">
            {formError}
            <button type="button" onClick={() => setFormError(null)} aria-label="Cerrar">
              ×
            </button>
          </div>
        )}

        {/* ── Título ── */}
        <div className={styles.inputGroup}>
          <label htmlFor="news-titulo">Título</label>
          <input
            id="news-titulo"
            type="text"
            value={formData.titulo}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            placeholder="Título de la publicación"
            required
          />
        </div>

        {/* ── Resumen ── */}
        <div className={styles.inputGroup}>
          <label htmlFor="news-resumen">Resumen</label>
          <textarea
            id="news-resumen"
            value={formData.resumen}
            onChange={(e) => setFormData({ ...formData, resumen: e.target.value })}
            rows={3}
            placeholder="Breve descripción que aparece en las tarjetas y vista previa"
            required
          />
        </div>

        {/* ── Tipo + Publicada ── */}
        <div className={styles.inputGroup}>
          <div className={styles.inlineBetween}>
            <div>
              <label htmlFor="news-tipo">Tipo</label>
              <select
                id="news-tipo"
                value={formData.tipo}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, tipo: e.target.value as TipoPublicacion }))
                }
                className={styles.select}
                style={{ marginTop: 4 }}
              >
                <option value="Noticia">Noticia</option>
                <option value="Curso">Curso</option>
              </select>
            </div>
            <div className={styles.switchWrap}>
              <label className={styles.switchLabel}>
                <input
                  type="checkbox"
                  checked={formData.publicada}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, publicada: e.target.checked }))
                  }
                />
                <span>Publicada</span>
              </label>
            </div>
          </div>
        </div>

        {/* ── Badge opcional ── */}
        <div className={styles.inputGroup}>
          <label htmlFor="news-badge">Etiqueta (opcional)</label>
          <input
            id="news-badge"
            type="text"
            list="badge-suggestions"
            value={formData.badge}
            onChange={(e) => setFormData((p) => ({ ...p, badge: e.target.value }))}
            placeholder="Ej: Normas Operativas"
            maxLength={60}
          />
          <datalist id="badge-suggestions">
            <option value="Normas Operativas" />
          </datalist>
        </div>

        {/* ── Contenido Markdown ── */}
        <div className={styles.inputGroup}>
          <div className={styles.inlineBetween}>
            <label htmlFor="news-contenido">Contenido (Markdown)</label>
            <Button
            variant="outline"
            size="small"
              type="button"
              onClick={() => setShowPreview((v) => !v)}
            >
              {showPreview ? "Ocultar vista previa" : "Vista previa"}
            </Button>
          </div>

          <div className={styles.toolbar}>
            <button type="button" onClick={() => wrapSelection("**")}>
              Negrita
            </button>
            <button type="button" onClick={() => wrapSelection("*")}>
              Cursiva
            </button>
            <button type="button" onClick={() => wrapSelection("## ", "")}>
              H2
            </button>
            <button type="button" onClick={() => wrapSelection("### ", "")}>
              H3
            </button>
            <button type="button" onClick={() => wrapSelection("- ", "")}>
              Lista
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
            <button type="button" onClick={() => wrapSelection("> ", "")}>
              Cita
            </button>
          </div>

          <textarea
            id="news-contenido"
            ref={textAreaRef}
            value={formData.contenido}
            onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
            rows={14}
            placeholder={`Usá Markdown:\n## Subtítulo\nPárrafo 1.\n\nPárrafo 2 (línea en blanco entre párrafos).\n- Item 1\n- Item 2\n**negrita**, *cursiva*, [link](https://...)`}
            className={styles.textarea}
            required
          />

          {showPreview && (
            <div
              className={styles.preview}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </div>

        {/* ── Portada ── */}
        <div className={styles.inputGroup}>
          <label>Portada (opcional)</label>
          <div className={styles.imageRow}>
            <Button type="button" size="medium" variant="secondary" onClick={onPickPortada}>
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
              <img src={portadaPreview} alt="Vista previa de portada" />
            </div>
          )}
        </div>

        {/* ── Adjuntos nuevos ── */}
        <div className={styles.inputGroup}>
          <label>Adjuntos (imágenes o PDFs)</label>
          <div className={styles.imageRow}>
            <Button
              type="button"
              size="medium"
              variant="secondary"
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
                    {f.type.startsWith("image/")
                      ? "🖼️"
                      : f.type === "application/pdf"
                      ? "📄"
                      : "📎"}{" "}
                    {f.name}
                  </div>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => onRemovePending(idx)}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Documentos existentes (edición) ── */}
        {editingId && existingDocs.length > 0 && (
          <div className={styles.inputGroup}>
            <label>Documentos existentes</label>
            <div className={styles.attachList}>
              {existingDocs.map((d) => {
                const isImage =
                  (d.content_type || "").startsWith("image/") ||
                  /\.(png|jpe?g|gif|webp|avif)$/i.test(d.path || "");
                const isPdf =
                  (d.content_type || "").toLowerCase() === "application/pdf" ||
                  /\.pdf$/i.test(d.path || "");
                return (
                  <div key={String(d.id)} className={styles.attachItem}>
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

        {/* ── Actions ── */}
        <div className={styles.formActions}>
          <Button
            type="submit"
            variant="primary"
            size="medium"
            disabled={submitting}
          >
            {submitting
              ? editingId
                ? "Guardando…"
                : "Publicando…"
              : editingId
              ? "Guardar cambios"
              : "Publicar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="medium"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

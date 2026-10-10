import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Camera,
  ChevronLeft,
  Save,
  X,
  FileText,
  Plus,
  HousePlus,
  Trash2,
  Info,
} from "lucide-react";
import {
  createObraSocial,
  updateObraSocial,
  getObraSocial,
  uploadDocumento,
  deleteDocumento,
} from "../obrasSociales.api";
import {
  EMPTY_FORM,
  CONDICION_IVA_LABELS,
  TIPO_DOCUMENTO_LABELS,
  PLAZO_OPTIONS,
  validateObraSocialForm,
  displayCuit,
} from "../obrasSociales.types";
import type {
  ObraSocialFormData,
  FormErrors,
  ObraSocialRef,
  TipoDocumento,
  Documento,
  ContactoEntry,
} from "../obrasSociales.types";
import { useQueryClient } from "@tanstack/react-query";
import { abrirAdjunto } from "@/app/shared/lib/archivos";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import AppSearchSelect from "../../../components/ui/AppSearchSelect/AppSearchSelect";
import { OBRAS_SOCIALES_KEY, useObrasSociales } from "../useObrasSociales";
import { useNotify } from "../../../hooks/useNotify";
import s from "./ObrasSocialesForm.module.scss";
import Modal from "../../../components/ui/Modal/Modal";

const TIPO_DOCUMENTOS: TipoDocumento[] = [
  "convenio",
  "normas",
  "valores_convenidos",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <span className={s.fieldError} role="alert">
      {msg}
    </span>
  );
}

// ─── Contacto list (emails / teléfonos) ──────────────────────────────────────

function ContactoList({
  entries,
  onChange,
  tipo,
  error,
}: {
  entries: ContactoEntry[];
  onChange: (entries: ContactoEntry[]) => void;
  tipo: "email" | "telefono";
  error?: string;
}) {
  const placeholderValor =
    tipo === "email" ? "Ej: auditoria@os.com.ar" : "Ej: +54 379 4123456";
  const placeholderEtiqueta =
    tipo === "email" ? "Ej: Auditoría" : "Ej: Pagos";
  const inputType = tipo === "email" ? "email" : "tel";

  const update = (i: number, field: keyof ContactoEntry, value: string) => {
    const next = entries.map((e, idx) =>
      idx === i ? { ...e, [field]: value } : e
    );
    onChange(next);
  };

  const remove = (i: number) => {
    onChange(entries.filter((_, idx) => idx !== i));
  };

  const add = () => {
    onChange([...entries, { valor: "", etiqueta: "" }]);
  };

  return (
    <div className={s.contactoList}>
      {entries.map((entry, i) => (
        <div key={i} className={s.contactoRow}>
          <input
            type="text"
            className={s.input}
            value={entry.etiqueta}
            onChange={(e) => update(i, "etiqueta", e.target.value)}
            placeholder={placeholderEtiqueta}
            maxLength={80}
            aria-label="Descripción"
          />
          <input
            type={inputType}
            className={s.input}
            value={entry.valor}
            onChange={(e) => update(i, "valor", e.target.value)}
            placeholder={placeholderValor}
            maxLength={tipo === "email" ? 200 : 50}
            aria-label={tipo === "email" ? "Email" : "Teléfono"}
          />
          {entries.length > 1 && (
            <button
              type="button"
              className={s.contactoRemoveBtn}
              onClick={() => remove(i)}
              aria-label="Eliminar"
              title="Eliminar"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}

      <button type="button" className={s.contactoAddBtn} onClick={add}>
        <Plus size={14} />
        {tipo === "email" ? "Agregar email" : "Agregar teléfono"}
      </button>

      {error && <span className={s.fieldError} role="alert">{error}</span>}
    </div>
  );
}

// ─── CUIT auto-format ─────────────────────────────────────────────────────────

function formatCUIT(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

// ─── File validation ──────────────────────────────────────────────────────────

// El backend valida por magic bytes contra una whitelist (app/common/uploads.py,
// perfil DOCUMENTOS): PDF e imágenes. Word queda afuera — aceptarlo acá sólo
// produce un 415 al subir.
const DOC_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff";

function validateDocFile(f: File): string | null {
  const allowed = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/tiff",
  ];
  if (!allowed.includes(f.type))
    return "Solo se aceptan PDF o imágenes (JPG, PNG, WEBP, TIFF).";
  if (f.size > 10 * 1024 * 1024)
    return "El archivo no puede superar los 10 MB.";
  return null;
}

// ─── Document row (fixed types) ───────────────────────────────────────────────

interface DocRowProps {
  obraId?: number;
  tipo: TipoDocumento;
  existing?: Documento;
  onUploaded: () => void;
  onQueue: (tipo: TipoDocumento, files: File[]) => void;
  onRemoveQueued: (tipo: TipoDocumento, index: number) => void;
  queued?: File[];
}

function DocRow({
  obraId,
  tipo,
  existing,
  onUploaded,
  onQueue,
  onRemoveQueued,
  queued,
}: DocRowProps) {
  const [deleting, setDeleting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const notify = useNotify();

  const clearInputs = () => {
    if (inputRef.current) inputRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const handleDelete = async () => {
    if (!obraId || !existing) return;
    setDeleting(true);
    setUploadError(null);
    try {
      await deleteDocumento(obraId, existing.id);
      onUploaded();
    } catch {
      setUploadError("No se pudo eliminar el documento.");
    } finally {
      setDeleting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files ?? []);
    if (!fileList.length) return;
    for (const f of fileList) {
      const err = validateDocFile(f);
      if (err) { setUploadError(err); return; }
    }
    setUploadError(null);
    // Alta y edición se comportan igual: lo elegido queda encolado y se sube al
    // guardar. Antes, en edición el archivo se quedaba en un estado local que el
    // submit no miraba, así que se perdía sin aviso.
    onQueue(tipo, fileList);
    clearInputs();
  };

  const removeFile = (index: number) => {
    onRemoveQueued(tipo, index);
    clearInputs();
  };

  return (
    <div className={s.docRow}>
      <div className={s.docHeader}>
        <span className={s.docTipo}>
          <FileText size={14} aria-hidden="true" />
          {TIPO_DOCUMENTO_LABELS[tipo]}
        </span>
        {existing && <span className={s.docActiveBadge}>Archivo activo</span>}
      </div>

      {existing && (
        <div className={s.existingFileRow}>
          <button
            type="button"
            className={s.docFileLink}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", textAlign: "left" }}
            onClick={() => abrirAdjunto(existing.url).catch((e) => notify.error(e.message))}
          >
            {TIPO_DOCUMENTO_LABELS[tipo]}
          </button>
          <button
            type="button"
            className={s.docHistoryBtn}
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Eliminar documento"
            title="Eliminar documento"
          >
            <Trash2 size={13} />
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      )}

      <div className={s.uploadArea}>
        <div className={s.uploadInputRow}>
          <input
            ref={inputRef}
            type="file"
            accept={DOC_ACCEPT}
            multiple
            onChange={handleFileChange}
            className={s.fileInput}
            aria-label={`Seleccionar archivo para ${TIPO_DOCUMENTO_LABELS[tipo]}`}
          />
          <label className={s.cameraBtn}>
            <Camera size={14} aria-hidden="true" />
            Tomar foto
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </label>
        </div>

        {queued && queued.length > 0 && (
          <div className={s.queuedFileList}>
            {queued.map((f, i) => (
              <div key={i} className={s.queuedFile}>
                <span className={s.queuedFileName}>{f.name}</span>
                <span className={s.queuedNote}>Se subirá al guardar</span>
                <button
                  type="button"
                  className={s.contactoRemoveBtn}
                  onClick={() => removeFile(i)}
                  aria-label="Quitar archivo"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {uploadError && (
          <span className={s.fieldError} role="alert">{uploadError}</span>
        )}
      </div>
    </div>
  );
}

// ─── Otros documents — dynamic list ──────────────────────────────────────────

interface OtroEntry {
  tempId: string;
  nombreCustom: string;
  file?: File;
  existing?: Documento;
  uploadError?: string;
}

interface OtrosDocListProps {
  obraId?: number;
  existingDocs: Documento[];
  onReload: () => void;
  onQueueChange: (entries: Array<{ nombreCustom: string; file: File }>) => void;
}

function OtrosDocList({ obraId, existingDocs, onReload, onQueueChange }: OtrosDocListProps) {
  const [entries, setEntries] = useState<OtroEntry[]>(() =>
    existingDocs.map((d) => ({
      tempId: String(d.id),
      nombreCustom: d.nombre_custom ?? "",
      existing: d,
    }))
  );
  const notify = useNotify();

  // Al recargar los documentos del servidor se conservan las filas con archivo
  // pendiente: si no, borrar un documento existente te vaciaba la cola visible.
  useEffect(() => {
    setEntries((prev) => [
      ...existingDocs.map((d) => ({
        tempId: String(d.id),
        nombreCustom: d.nombre_custom ?? "",
        existing: d,
      })),
      ...prev.filter((e) => !e.existing && e.file),
    ]);
  }, [existingDocs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sin el nombre escrito el archivo igual se sube: cae el nombre del archivo.
  // Filtrar por `nombreCustom` no vacío hacía que un adjunto sin nombre
  // desapareciera al guardar, sin aviso.
  const notifyQueue = (updated: OtroEntry[]) => {
    onQueueChange(
      updated
        .filter((e) => e.file)
        .map((e) => ({
          nombreCustom: e.nombreCustom.trim() || e.file!.name,
          file: e.file!,
        }))
    );
  };

  const updateEntry = (tempId: string, patch: Partial<OtroEntry>) => {
    setEntries((prev) => {
      const next = prev.map((e) => (e.tempId === tempId ? { ...e, ...patch } : e));
      notifyQueue(next);
      return next;
    });
  };

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), nombreCustom: "" },
    ]);
  };

  const removeEntry = (tempId: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.tempId !== tempId);
      notifyQueue(next);
      return next;
    });
  };

  const handleDeleteExisting = async (entry: OtroEntry) => {
    if (!obraId || !entry.existing) return;
    try {
      await deleteDocumento(obraId, entry.existing.id);
      onReload();
    } catch {
      updateEntry(entry.tempId, { uploadError: "No se pudo eliminar el documento." });
    }
  };

  const handleFileChange = (tempId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files ?? []);
    if (!fileList.length) return;

    for (const f of fileList) {
      const err = validateDocFile(f);
      if (err) { updateEntry(tempId, { uploadError: err }); return; }
    }

    // First file goes to the current entry
    updateEntry(tempId, { file: fileList[0], uploadError: undefined });

    // Each additional file becomes a new entry
    if (fileList.length > 1) {
      setEntries((prev) => {
        const newEntries: OtroEntry[] = fileList.slice(1).map((f) => ({
          tempId: crypto.randomUUID(),
          nombreCustom: "",
          file: f,
        }));
        const next = [...prev, ...newEntries];
        notifyQueue(next);
        return next;
      });
    }
  };

  return (
    <div className={s.otrosDocList}>
      {entries.map((entry) => (
        <div key={entry.tempId} className={s.docRow}>
          <div className={s.docHeader}>
            <span className={s.docTipo}>
              <FileText size={14} aria-hidden="true" />
              Documento personalizado
            </span>
            {entry.existing && <span className={s.docActiveBadge}>Archivo activo</span>}
            {!entry.existing && (
              <button
                type="button"
                className={s.docHistoryBtn}
                onClick={() => removeEntry(entry.tempId)}
                aria-label="Eliminar entrada"
              >
                <X size={13} /> Quitar
              </button>
            )}
            {entry.existing && obraId && (
              <button
                type="button"
                className={s.docHistoryBtn}
                onClick={() => handleDeleteExisting(entry)}
                aria-label="Eliminar documento"
                title="Eliminar documento del servidor"
              >
                <Trash2 size={13} /> Eliminar
              </button>
            )}
          </div>

          <input
            type="text"
            className={s.nombreCustomInput}
            placeholder="Nombre del documento"
            value={entry.nombreCustom}
            onChange={(e) => updateEntry(entry.tempId, { nombreCustom: e.target.value })}
            maxLength={120}
            aria-label="Nombre del documento personalizado"
            readOnly={Boolean(entry.existing)}
          />

          {entry.existing && (
            <button
              type="button"
              className={s.docFileLink}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", textAlign: "left" }}
              onClick={() =>
                abrirAdjunto(entry.existing!.url).catch((e) => notify.error(e.message))
              }
            >
              {entry.nombreCustom || "Ver archivo"}
            </button>
          )}

          <div className={s.uploadArea}>
            <div className={s.uploadInputRow}>
              <input
                type="file"
                accept={DOC_ACCEPT}
                className={s.fileInput}
                onChange={(e) => handleFileChange(entry.tempId, e)}
                aria-label={`Seleccionar archivo para ${entry.nombreCustom || "documento personalizado"}`}
              />
              <label className={s.cameraBtn}>
                <Camera size={14} aria-hidden="true" />
                Tomar foto
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => handleFileChange(entry.tempId, e)}
                />
              </label>
            </div>

            {entry.file && (
              <div className={s.queuedFile}>
                <span className={s.queuedFileName}>{entry.file.name}</span>
                <span className={s.queuedNote}>Se subirá al guardar</span>
              </div>
            )}

            {entry.uploadError && (
              <span className={s.fieldError} role="alert">{entry.uploadError}</span>
            )}
          </div>
        </div>
      ))}

      <button type="button" className={s.contactoAddBtn} onClick={addEntry}>
        <Plus size={14} />
        Agregar documento personalizado
      </button>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function ObrasSocialesForm() {
  const navigate = useNavigate();
  const notify = useNotify();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const obraId = id ? Number(id) : undefined;

  const [form, setForm] = useState<ObraSocialFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  // Solo en el alta: el back crea la OS y además siembra sus galenos y todo su
  // nomenclador NN, lo que tarda varios segundos.
  const [creando, setCreando] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | undefined>(obraId);

  // Obra social cabecera: solo si la que se crea es una derivada. `principalRef` guarda la
  // que ya tenía al editar (puede estar de baja y no figurar en el listado).
  const [principalRef, setPrincipalRef] = useState<ObraSocialRef | null>(null);
  const osQuery = useObrasSociales();
  const queryClient = useQueryClient();

  // Documentos
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [reloadDocsTrigger, setReloadDocsTrigger] = useState(0);
  const [pendingFixed, setPendingFixed] = useState<Map<TipoDocumento, File[]>>(new Map());
  const [pendingOtros, setPendingOtros] = useState<Array<{ nombreCustom: string; file: File }>>([]);

  // ── Load existing data (edit mode) ──────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !obraId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await getObraSocial(obraId);

        const plazoRaw = String(data.plazo_vencimiento ?? "");
        const plazoField: ObraSocialFormData["plazo_vencimiento"] =
          plazoRaw === "30" || plazoRaw === "45" || plazoRaw === "60"
            ? (plazoRaw as "30" | "45" | "60")
            : plazoRaw
            ? "otro"
            : "";

        const dir = data.direccion?.[0];
        const dfTipo: ObraSocialFormData["df_tipo"] =
          dir?.codigo_postal === "3400" ? "corrientes_capital" : dir ? "viaja" : "";

        setForm({
          nro_obra_social: String(data.nro_obra_social),
          nombre: data.nombre,
          cuit: displayCuit(data.cuit),
          direccion_real: data.direccion_real ?? "",
          condicion_iva: data.condicion_iva ?? "",
          df_tipo: dfTipo,
          df_provincia: dir?.provincia ?? "",
          df_localidad: dir?.localidad ?? "",
          df_direccion: dir?.direccion ?? "",
          df_codigo_postal: dir?.codigo_postal ?? "",
          df_horario: dir?.horario ?? "",
          plazo_vencimiento: plazoField,
          plazo_custom: plazoField === "otro" ? plazoRaw : "",
          fecha_alta_convenio: data.fecha_alta_convenio?.slice(0, 10) ?? "",
          emails: data.emails?.length ? data.emails : [{ valor: "", etiqueta: "" }],
          telefonos: data.telefonos?.length ? data.telefonos : [{ valor: "", etiqueta: "" }],
          obra_social_principal_id: data.obra_social_principal
            ? String(data.obra_social_principal.id)
            : "",
          replicar_galenos: false,
          replicar_nomencladores: false,
          replicar_valores: false,
          dia_corte: String(data.dia_corte ?? 20),
        });

        if (data.obra_social_principal) {
          setPrincipalRef(data.obra_social_principal);
        }
        setDocumentos(data.documentos ?? []);
      } catch {
        setServerError("No se pudo cargar la obra social.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, obraId, reloadDocsTrigger]);

  // ── Field helpers ────────────────────────────────────────────────────────────
  const set = (field: keyof ObraSocialFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ── Obra social cabecera ─────────────────────────────────────────────────────
  // Solo se puede elegir una cabecera: activa y que no sea ella misma derivada de otra.
  const cabeceraId = form.obra_social_principal_id ? Number(form.obra_social_principal_id) : null;
  const cabeceraOptions = (() => {
    const opts = (osQuery.data ?? [])
      .filter((o) => o.activo && !o.obra_social_principal_id && o.id !== obraId)
      .map((o) => ({ id: o.id, label: o.denominacion }));
    if (principalRef && !opts.some((o) => o.id === principalRef.id)) {
      opts.unshift({ id: principalRef.id, label: principalRef.denominacion });
    }
    return opts;
  })();
  const cabeceraElegida = cabeceraOptions.find((o) => o.id === cabeceraId) ?? null;

  const elegirCabecera = (val: string | number | null) => {
    setForm((prev) => ({
      ...prev,
      obra_social_principal_id: val == null ? "" : String(val),
      // Sin cabecera no hay nada que replicar.
      ...(val == null
        ? { replicar_galenos: false, replicar_nomencladores: false, replicar_valores: false }
        : {}),
    }));
  };

  // Los valores se apoyan en los galenos y en los códigos: al tildarlos se tildan los otros dos.
  const tildarReplica = (campo: "galenos" | "nomencladores" | "valores", on: boolean) => {
    setForm((prev) => ({
      ...prev,
      ...(campo === "valores" && on
        ? { replicar_galenos: true, replicar_nomencladores: true, replicar_valores: true }
        : { [`replicar_${campo}`]: on }),
    }));
  };

  // ── Documentos pendientes ───────────────────────────────────────────────────
  // Sube todo lo encolado y avisa por toast lo que falló. Antes esto era un
  // `Promise.allSettled` sin mirar el resultado: un 415 del backend (por
  // ejemplo, un .docx, que no acepta) terminaba en un alta "exitosa" sin
  // documentos y sin ningún mensaje.
  const subirPendientes = async (destinoId: number) => {
    const tareas: Array<{ nombre: string; run: () => Promise<unknown> }> = [];

    pendingFixed.forEach((fileArr, tipo) => {
      fileArr.forEach((file) =>
        tareas.push({
          nombre: file.name,
          run: () => uploadDocumento(destinoId, tipo, file),
        })
      );
    });
    pendingOtros.forEach((entry) => {
      tareas.push({
        nombre: entry.file.name,
        run: () =>
          uploadDocumento(destinoId, "otros", entry.file, entry.nombreCustom),
      });
    });

    if (!tareas.length) return;

    const resultados = await Promise.allSettled(tareas.map((t) => t.run()));
    const fallaron = tareas
      .filter((_, i) => resultados[i].status === "rejected")
      .map((t) => t.nombre);

    if (fallaron.length) {
      notify.error(
        fallaron.length === 1
          ? "No se pudo subir un documento"
          : `No se pudieron subir ${fallaron.length} documentos`,
        fallaron.join(", "),
        { duration: 8000 }
      );
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateObraSocialForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      document
        .getElementById(`field-${firstKey}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);
    setServerError(null);
    try {
      const payload = { ...form };

      if (isEdit && obraId) {
        await updateObraSocial(obraId, payload);
        await subirPendientes(obraId);
        queryClient.invalidateQueries({ queryKey: OBRAS_SOCIALES_KEY });
        navigate(`/panel/convenios/obras-sociales/${obraId}`);
      } else {
        setCreando(true);
        const created = await createObraSocial(payload);
        setSavedId(created.id);
        await subirPendientes(created.id);
        queryClient.invalidateQueries({ queryKey: OBRAS_SOCIALES_KEY });
        // Si se replicó de la cabecera, el detalle muestra qué se copió y qué no.
        navigate(`/panel/convenios/obras-sociales/${created.id}`, {
          state: created.replicacion ? { replicacion: created.replicacion } : undefined,
        });
      }
    } catch (err) {
      setServerError(
        mensajeDeError(
          err,
          "Ocurrió un error al guardar. Verificá los datos e intentá nuevamente."
        )
      );
    } finally {
      setSaving(false);
      setCreando(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={s.loadingPage}>
        <span className={s.spinner} aria-hidden="true" />
        <p>Cargando datos…</p>
      </div>
    );
  }

  return (
    <div className={s.container}>
      {/* Page header */}
      <div className={s.pageHeader}>
        <button
          type="button"
          className={s.backBtn}
          onClick={() => navigate("/panel/convenios/obras-sociales")}
        >
          <ChevronLeft size={18} /> Volver al listado
        </button>
        <div className={s.pageTitle}>
          <HousePlus size={24} className={s.pageTitleIcon} aria-hidden="true" />
          <h1>{isEdit ? "Editar Obra Social" : "Alta de Obra Social"}</h1>
        </div>
      </div>

      {serverError && (
        <div className={s.errorBanner} role="alert">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className={s.form}>
        {/* ── Sección 1: Datos de la obra social ── */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>Datos de la Obra Social</h2>
          <div className={s.grid2}>
            {/* Número */}
            <div className={s.field} id="field-nro_obra_social">
              <label className={s.label} htmlFor="nro_obra_social">
                Número de Obra Social <span className={s.required}>*</span>
              </label>
              <input
                id="nro_obra_social"
                type="text"
                inputMode="numeric"
                className={`${s.input} ${errors.nro_obra_social ? s.inputError : ""}`}
                value={form.nro_obra_social}
                onChange={(e) => set("nro_obra_social", e.target.value)}
                placeholder="Ej: 901"
                maxLength={10}
              />
              <FieldError msg={errors.nro_obra_social} />
              <span className={s.hint}>
                La denominación se forma: Nº + Nombre
              </span>
            </div>

            {/* Nombre */}
            <div className={s.field} id="field-nombre">
              <label className={s.label} htmlFor="nombre">
                Nombre <span className={s.required}>*</span>
              </label>
              <input
                id="nombre"
                type="text"
                className={`${s.input} ${errors.nombre ? s.inputError : ""}`}
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                placeholder="Ej: IOSCOR"
                maxLength={255}
              />
              <FieldError msg={errors.nombre} />
              {form.nro_obra_social && form.nombre && (
                <span className={s.preview}>
                  Denominación: {form.nro_obra_social} — {form.nombre}
                </span>
              )}
            </div>

            {/* CUIT */}
            <div className={s.field} id="field-cuit">
              <label className={s.label} htmlFor="cuit">
                CUIT
              </label>
              <input
                id="cuit"
                type="text"
                inputMode="numeric"
                className={`${s.input} ${errors.cuit ? s.inputError : ""}`}
                value={form.cuit}
                onChange={(e) => set("cuit", formatCUIT(e.target.value))}
                placeholder="Ej: 30123456789"
                maxLength={13}
              />
              <FieldError msg={errors.cuit} />
            </div>

            {/* Dirección real */}
            <div className={s.field} id="field-direccion_real">
              <label className={s.label} htmlFor="direccion_real">
                Dirección Real Oficial
              </label>
              <input
                id="direccion_real"
                type="text"
                className={`${s.input} ${errors.direccion_real ? s.inputError : ""}`}
                value={form.direccion_real}
                onChange={(e) => set("direccion_real", e.target.value)}
                placeholder="Calle, número, ciudad"
                maxLength={200}
              />
              <FieldError msg={errors.direccion_real} />
            </div>

            {/* Condición IVA */}
            <div className={s.field} id="field-condicion_iva">
              <label className={s.label} htmlFor="condicion_iva">
                Condición de IVA
              </label>
              <select
                id="condicion_iva"
                className={`${s.select} ${errors.condicion_iva ? s.inputError : ""}`}
                value={form.condicion_iva}
                onChange={(e) => set("condicion_iva", e.target.value)}
              >
                <option value="">— Seleccioná —</option>
                {Object.entries(CONDICION_IVA_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <FieldError msg={errors.condicion_iva} />
            </div>
          </div>
        </section>

        {/* ── Sección 2: Dirección de facturación ── */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>Dirección de Envío de Facturación</h2>

          <div className={s.field} id="field-df_tipo">
            <span className={s.label}>Tipo de envío</span>
            <div className={s.radioGroup}>
              <label className={s.radioLabel}>
                <input
                  type="radio"
                  name="df_tipo"
                  value="corrientes_capital"
                  checked={form.df_tipo === "corrientes_capital"}
                  onChange={() => {
                    setForm((f) => ({
                      ...f,
                      df_tipo: "corrientes_capital",
                      df_provincia: "",
                      df_localidad: "",
                      df_codigo_postal: "3400",
                    }));
                    if (errors.df_tipo)
                      setErrors((prev) => ({ ...prev, df_tipo: undefined }));
                  }}
                  className={s.radioInput}
                />
                Corrientes Capital
              </label>

              <label className={s.radioLabel}>
                <input
                  type="radio"
                  name="df_tipo"
                  value="viaja"
                  checked={form.df_tipo === "viaja"}
                  onChange={() => {
                    setForm((f) => ({
                      ...f,
                      df_tipo: "viaja",
                      df_provincia: "",
                      df_localidad: "",
                      df_codigo_postal: "",
                    }));
                    if (errors.df_tipo)
                      setErrors((prev) => ({ ...prev, df_tipo: undefined }));
                  }}
                  className={s.radioInput}
                />
                Viaja
              </label>
            </div>
          </div>

          {form.df_tipo && (
            <div className={s.grid2}>
              {form.df_tipo === "viaja" && (
                <>
                  <div className={s.field}>
                    <label className={s.label} htmlFor="df_provincia">
                      Provincia
                    </label>
                    <input
                      id="df_provincia"
                      type="text"
                      className={s.input}
                      value={form.df_provincia}
                      onChange={(e) => set("df_provincia", e.target.value)}
                      placeholder="Ej: Buenos Aires"
                      maxLength={100}
                    />
                  </div>

                  <div className={s.field}>
                    <label className={s.label} htmlFor="df_localidad">
                      Localidad
                    </label>
                    <input
                      id="df_localidad"
                      type="text"
                      className={s.input}
                      value={form.df_localidad}
                      onChange={(e) => set("df_localidad", e.target.value)}
                      placeholder="Ej: San Martín"
                      maxLength={100}
                    />
                  </div>
                </>
              )}

              <div className={s.field}>
                <label className={s.label} htmlFor="df_direccion">
                  Dirección
                </label>
                <input
                  id="df_direccion"
                  type="text"
                  className={s.input}
                  value={form.df_direccion}
                  onChange={(e) => set("df_direccion", e.target.value)}
                  placeholder="Calle y número"
                  maxLength={200}
                />
              </div>

              <div className={s.field}>
                <label className={s.label} htmlFor="df_codigo_postal">
                  Código Postal
                </label>
                <input
                  id="df_codigo_postal"
                  type="text"
                  inputMode="numeric"
                  className={`${s.input} ${form.df_tipo === "corrientes_capital" ? s.inputReadonly : ""}`}
                  value={form.df_tipo === "corrientes_capital" ? "3400" : form.df_codigo_postal}
                  onChange={(e) =>
                    form.df_tipo === "viaja" && set("df_codigo_postal", e.target.value)
                  }
                  readOnly={form.df_tipo === "corrientes_capital"}
                  placeholder="Ej: 1650"
                  maxLength={10}
                />
                {form.df_tipo === "corrientes_capital" && (
                  <span className={s.hint}>Código postal fijo de Corrientes Capital.</span>
                )}
              </div>

              <div className={`${s.field} ${s.fullWidth}`}>
                <label className={s.label} htmlFor="df_horario">
                  Horario de recepción
                </label>
                <input
                  id="df_horario"
                  type="text"
                  className={s.input}
                  value={form.df_horario}
                  onChange={(e) => set("df_horario", e.target.value)}
                  placeholder="Ej: Lunes a viernes 8–16 hs"
                  maxLength={150}
                />
              </div>
            </div>
          )}
        </section>

        {/* ── Sección 3: Facturación y contacto ── */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>Facturación y Contacto</h2>
          <div className={s.grid2}>
            {/* Plazo vencimiento */}
            <div className={s.field} id="field-plazo_vencimiento">
              <label className={s.label} htmlFor="plazo_vencimiento">
                Plazo de vencimiento de facturas
              </label>
              <select
                id="plazo_vencimiento"
                className={`${s.select} ${errors.plazo_vencimiento ? s.inputError : ""}`}
                value={form.plazo_vencimiento}
                onChange={(e) => set("plazo_vencimiento", e.target.value)}
              >
                <option value="">— Seleccioná —</option>
                {PLAZO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <FieldError msg={errors.plazo_vencimiento} />
            </div>

            {form.plazo_vencimiento === "otro" && (
              <div className={s.field} id="field-plazo_custom">
                <label className={s.label} htmlFor="plazo_custom">
                  Plazo personalizado (días){" "}
                  <span className={s.required}>*</span>
                </label>
                <input
                  id="plazo_custom"
                  type="text"
                  inputMode="numeric"
                  className={`${s.input} ${errors.plazo_custom ? s.inputError : ""}`}
                  value={form.plazo_custom}
                  onChange={(e) => set("plazo_custom", e.target.value)}
                  placeholder="Ej: 90"
                  maxLength={5}
                />
                <FieldError msg={errors.plazo_custom} />
              </div>
            )}

            {/* Fecha alta convenio */}
            <div className={s.field} id="field-fecha_alta_convenio">
              <label className={s.label} htmlFor="fecha_alta_convenio">
                Fecha de Alta de Convenio
              </label>
              <input
                id="fecha_alta_convenio"
                type="date"
                className={`${s.input} ${errors.fecha_alta_convenio ? s.inputError : ""}`}
                value={form.fecha_alta_convenio}
                onChange={(e) => set("fecha_alta_convenio", e.target.value)}
              />
              <FieldError msg={errors.fecha_alta_convenio} />
            </div>

            {/* Emails */}
            <div className={`${s.field} ${s.fullWidth}`} id="field-emails">
              <span className={s.label}>Emails</span>
              <ContactoList
                tipo="email"
                entries={form.emails}
                onChange={(entries) => {
                  setForm((f) => ({ ...f, emails: entries }));
                  if (errors.emails)
                    setErrors((prev) => ({ ...prev, emails: undefined }));
                }}
                error={errors.emails}
              />
            </div>

            {/* Teléfonos */}
            <div className={`${s.field} ${s.fullWidth}`} id="field-telefonos">
              <span className={s.label}>Teléfonos</span>
              <ContactoList
                tipo="telefono"
                entries={form.telefonos}
                onChange={(entries) => {
                  setForm((f) => ({ ...f, telefonos: entries }));
                  if (errors.telefonos)
                    setErrors((prev) => ({ ...prev, telefonos: undefined }));
                }}
                error={errors.telefonos}
              />
            </div>

            {/* Día de corte del período */}
            <div className={`${s.field} ${s.fieldNarrow}`} id="field-dia_corte">
              <label className={s.label} htmlFor="dia_corte">
                Día de corte del período
              </label>
              <input
                id="dia_corte"
                type="number"
                min={1}
                max={28}
                className={`${s.input} ${errors.dia_corte ? s.inputError : ""}`}
                value={form.dia_corte}
                onChange={(e) => set("dia_corte", e.target.value)}
              />
              <FieldError msg={errors.dia_corte} />
              <span className={s.hint}>
                1 = mes completo (del 1 al último día). 20 = del 20 al 20 del mes siguiente.
              </span>
            </div>
          </div>
        </section>

        {/* ── Sección 4: Relaciones ── */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>Relaciones entre Obras Sociales</h2>

          <div className={s.callout} role="note">
            <Info size={18} className={s.calloutIcon} aria-hidden="true" />
            <p>
              <strong>Es opcional.</strong> Una obra social es <strong>única / cabecera</strong> o es{" "}
              <strong>derivada</strong> de otra. Completá la obra social cabecera{" "}
              <strong>solo si la que estás creando es una derivada</strong>. Si es única o cabecera,
              dejalo vacío.
            </p>
          </div>

          <div className={`${s.field} ${s.fieldWide}`} id="field-obra_social_principal_id">
            <label className={s.label}>Obra Social Cabecera</label>
            <AppSearchSelect
              options={cabeceraOptions}
              value={cabeceraId}
              loading={osQuery.isLoading}
              disabled={osQuery.isLoading}
              onChange={elegirCabecera}
              initialInputValue={principalRef?.denominacion}
            />
            <span className={s.hint}>
              Escribí el número o el nombre para buscarla. Una derivada se agrupa con su cabecera en
              el padrón de médicos y comparte con ella las opciones de replicar.
            </span>
          </div>

          {/* Replicar de la cabecera: solo en el alta */}
          {!isEdit && cabeceraElegida && (
            <fieldset className={s.replicar}>
              <legend className={s.replicarTitulo}>
                Replicar desde {cabeceraElegida.label}
              </legend>
              <p className={s.hint}>
                Opcional. Se copia solo lo vigente hoy de la cabecera, sin historial. Lo que no
                marques queda como en cualquier obra social nueva (galenos base y nomenclador NN
                en $0).
              </p>

              <label className={s.replicarItem}>
                <input
                  type="checkbox"
                  checked={form.replicar_galenos}
                  onChange={(e) => tildarReplica("galenos", e.target.checked)}
                />
                <span>
                  <strong>Galenos</strong>
                  <small>Los galenos vigentes de la cabecera, con sus precios, niveles y unidades.</small>
                </span>
              </label>

              <label className={s.replicarItem}>
                <input
                  type="checkbox"
                  checked={form.replicar_nomencladores}
                  onChange={(e) => tildarReplica("nomencladores", e.target.checked)}
                />
                <span>
                  <strong>Nomencladores</strong>
                  <small>
                    Los códigos dados de alta en la cabecera, con quién factura cada uno (sin
                    precio), y los nomencladores nivelados que tenga aplicados. Los nivelados
                    necesitan los galenos de la nueva obra social.
                  </small>
                </span>
              </label>

              <label className={s.replicarItem}>
                <input
                  type="checkbox"
                  checked={form.replicar_valores}
                  onChange={(e) => tildarReplica("valores", e.target.checked)}
                />
                <span>
                  <strong>Valores</strong>
                  <small>
                    Los precios vigentes de la cabecera. Dependen de los galenos y de los códigos,
                    por eso al marcarlos se marcan también esos dos. Si los destildás, los precios
                    que dependan de ellos se omiten.
                  </small>
                </span>
              </label>
            </fieldset>
          )}
        </section>

        {/* ── Sección 5: Documentos ── */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>Documentos</h2>
          <div className={s.docGrid}>
            {TIPO_DOCUMENTOS.map((tipo) => {
              const existing = documentos.find((d) => d.tipo === tipo);
              return (
                <DocRow
                  key={tipo}
                  tipo={tipo}
                  obraId={savedId}
                  existing={existing}
                  onUploaded={() => setReloadDocsTrigger((n) => n + 1)}
                  onQueue={(t, files) => {
                    setPendingFixed((prev) => {
                      const next = new Map(prev);
                      if (files.length) next.set(t, [...(prev.get(t) ?? []), ...files]);
                      else next.delete(t);
                      return next;
                    });
                  }}
                  onRemoveQueued={(t, index) => {
                    setPendingFixed((prev) => {
                      const next = new Map(prev);
                      const restantes = (prev.get(t) ?? []).filter((_, i) => i !== index);
                      if (restantes.length) next.set(t, restantes);
                      else next.delete(t);
                      return next;
                    });
                  }}
                  queued={pendingFixed.get(tipo)}
                />
              );
            })}
            <OtrosDocList
              obraId={savedId}
              existingDocs={documentos.filter((d) => d.tipo === "otros")}
              onReload={() => setReloadDocsTrigger((n) => n + 1)}
              onQueueChange={setPendingOtros}
            />
          </div>
        </section>

        {/* ── Footer actions ── */}
        <div className={s.formFooter}>
          <button
            type="button"
            className={s.btnSecondary}
            onClick={() => navigate("/panel/convenios/obras-sociales")}
            disabled={saving}
          >
            Cancelar
          </button>
          <button type="submit" className={s.btnPrimary} disabled={saving}>
            <Save size={16} />
            {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar obra social"}
          </button>
        </div>
      </form>

      <Modal
        isOpen={creando}
        onClose={() => {}}
        title="Registrando obra social"
        size="small"
        showCloseButton={false}
      >
        <div className={s.creandoBox} role="status" aria-live="polite">
          <span className={s.creandoSpinner} aria-hidden="true" />
          <p className={s.creandoTitulo}>Creando la obra social</p>
          <p className={s.creandoTexto}>
            {form.replicar_galenos || form.replicar_nomencladores || form.replicar_valores
              ? "Se están copiando de la cabecera lo que marcaste y generando el nomenclador NN. Puede tardar varios minutos si copiás valores; no cierres esta ventana."
              : "Se están generando los galenos y los valores del Nomenclador Nacional. Puede tardar unos segundos; no cierres esta ventana."}
          </p>
        </div>
      </Modal>
    </div>
  );
}

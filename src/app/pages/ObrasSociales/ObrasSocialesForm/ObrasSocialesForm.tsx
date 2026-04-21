import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Save,
  Upload,
  X,
  FileText,
  Search,
  Plus,
  HousePlus,
  Trash2,
} from "lucide-react";
import {
  createObraSocial,
  updateObraSocial,
  getObraSocial,
  searchObrasSociales,
  uploadDocumento,
  deleteDocumento,
  setObraSocialPrincipal,
} from "../obrasSociales.api";
import {
  EMPTY_FORM,
  CONDICION_IVA_LABELS,
  TIPO_DOCUMENTO_LABELS,
  PLAZO_OPTIONS,
  validateObraSocialForm,
} from "../obrasSociales.types";
import type {
  ObraSocialFormData,
  FormErrors,
  ObraSocialRef,
  TipoDocumento,
  Documento,
  ContactoEntry,
} from "../obrasSociales.types";
import s from "./ObrasSocialesForm.module.scss";

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

// ─── Asociadas selector ───────────────────────────────────────────────────────

function AsociadasSelector({
  selected,
  onChange,
  excludeId,
}: {
  selected: ObraSocialRef[];
  onChange: (refs: ObraSocialRef[]) => void;
  excludeId?: number;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ObraSocialRef[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!q.trim()) {
        setResults([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const res = await searchObrasSociales(q, excludeId);
          setResults(
            res.filter((r) => !selected.some((s) => s.id === r.id))
          );
        } catch {
          /* silent */
        } finally {
          setSearching(false);
        }
      }, 300);
    },
    [excludeId, selected]
  );

  useEffect(() => {
    search(query);
  }, [query, search]);

  const add = (ref: ObraSocialRef) => {
    onChange([...selected, ref]);
    setQuery("");
    setResults([]);
  };

  const remove = (id: number) => onChange(selected.filter((r) => r.id !== id));

  return (
    <div className={s.asociadasWrap}>
      {selected.length > 0 && (
        <ul className={s.tagList} aria-label="Obras sociales asociadas seleccionadas">
          {selected.map((ref) => (
            <li key={ref.id} className={s.tag}>
              <span>{ref.denominacion}</span>
              <button
                type="button"
                className={s.tagRemove}
                onClick={() => remove(ref.id)}
                aria-label={`Quitar ${ref.nombre}`}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={s.searchWrapInline}>
        <Search size={14} className={s.searchIcon} aria-hidden="true" />
        <input
          type="search"
          className={s.searchInput}
          placeholder="Buscar obra social para asociar…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar obra social para asociar"
          autoComplete="off"
        />
      </div>

      {(searching || results.length > 0) && (
        <ul className={s.searchDropdown} role="listbox" aria-label="Resultados">
          {searching && (
            <li className={s.searchDropdownItem} aria-disabled="true">
              Buscando…
            </li>
          )}
          {!searching &&
            results.map((ref) => (
              <li key={ref.id} className={s.searchDropdownItem}>
                <button
                  type="button"
                  onClick={() => add(ref)}
                  className={s.searchDropdownBtn}
                  role="option"
                >
                  <Plus size={13} />
                  <span>{ref.denominacion}</span>
                </button>
              </li>
            ))}
          {!searching && results.length === 0 && query.trim() && (
            <li className={s.searchDropdownItem} aria-disabled="true">
              Sin resultados.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ─── File validation ──────────────────────────────────────────────────────────

function validateDocFile(f: File): string | null {
  if (
    !["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(f.type)
  )
    return "Solo se aceptan archivos PDF o Word (.pdf, .doc, .docx).";
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
  onQueue: (tipo: TipoDocumento, file: File | null) => void;
  queued?: File;
}

function DocRow({ obraId, tipo, existing, onUploaded, onQueue, queued }: DocRowProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file || !obraId) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadDocumento(obraId, tipo, file);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded();
    } catch {
      setUploadError("No se pudo subir el archivo. Intentá de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateDocFile(f);
    if (err) { setUploadError(err); return; }
    setUploadError(null);
    if (obraId) {
      setFile(f);
    } else {
      onQueue(tipo, f);
    }
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
        <a
          href={existing.url}
          target="_blank"
          rel="noopener noreferrer"
          className={s.docFileLink}
        >
          {TIPO_DOCUMENTO_LABELS[tipo]}
        </a>
      )}

      <div className={s.uploadArea}>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          className={s.fileInput}
          aria-label={`Seleccionar archivo para ${TIPO_DOCUMENTO_LABELS[tipo]}`}
        />

        {!obraId && queued && (
          <div className={s.queuedFile}>
            <span className={s.queuedFileName}>{queued.name}</span>
            <span className={s.queuedNote}>Se subirá al guardar</span>
            <button
              type="button"
              className={s.contactoRemoveBtn}
              onClick={() => {
                if (inputRef.current) inputRef.current.value = "";
                onQueue(tipo, null);
              }}
              aria-label="Quitar archivo"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {obraId && file && (
          <>
            <div className={s.queuedFile}>
              <span className={s.queuedFileName}>{file.name}</span>
              <button
                type="button"
                className={s.contactoRemoveBtn}
                onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }}
                aria-label="Quitar archivo"
              >
                <X size={14} />
              </button>
            </div>
            <button
              type="button"
              className={s.uploadBtn}
              onClick={handleUpload}
              disabled={uploading}
            >
              <Upload size={14} />
              {uploading ? "Subiendo…" : existing ? "Reemplazar archivo" : "Subir archivo"}
            </button>
          </>
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
  uploading?: boolean;
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

  useEffect(() => {
    setEntries(
      existingDocs.map((d) => ({
        tempId: String(d.id),
        nombreCustom: d.nombre_custom ?? "",
        existing: d,
      }))
    );
  }, [existingDocs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const notifyQueue = (updated: OtroEntry[]) => {
    if (!obraId) {
      onQueueChange(
        updated
          .filter((e) => e.file && e.nombreCustom.trim())
          .map((e) => ({ nombreCustom: e.nombreCustom.trim(), file: e.file! }))
      );
    }
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
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateDocFile(f);
    if (err) { updateEntry(tempId, { uploadError: err }); return; }
    updateEntry(tempId, { file: f, uploadError: undefined });
  };

  const handleUpload = async (tempId: string) => {
    const entry = entries.find((e) => e.tempId === tempId);
    if (!entry || !entry.file || !obraId || !entry.nombreCustom.trim()) return;
    updateEntry(tempId, { uploading: true, uploadError: undefined });
    try {
      await uploadDocumento(obraId, "otros", entry.file, entry.nombreCustom.trim());
      updateEntry(tempId, { uploading: false, file: undefined });
      onReload();
    } catch {
      updateEntry(tempId, { uploading: false, uploadError: "No se pudo subir el archivo." });
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
            placeholder="Nombre del documento *"
            value={entry.nombreCustom}
            onChange={(e) => updateEntry(entry.tempId, { nombreCustom: e.target.value })}
            maxLength={120}
            aria-label="Nombre del documento personalizado"
            readOnly={Boolean(entry.existing)}
          />

          {entry.existing && (
            <a
              href={entry.existing.url}
              target="_blank"
              rel="noopener noreferrer"
              className={s.docFileLink}
            >
              {entry.nombreCustom || "Ver archivo"}
            </a>
          )}

          <div className={s.uploadArea}>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className={s.fileInput}
              onChange={(e) => handleFileChange(entry.tempId, e)}
              aria-label={`Seleccionar archivo para ${entry.nombreCustom || "documento personalizado"}`}
            />

            {!obraId && entry.file && (
              <div className={s.queuedFile}>
                <span className={s.queuedFileName}>{entry.file.name}</span>
                <span className={s.queuedNote}>Se subirá al guardar</span>
              </div>
            )}

            {obraId && entry.file && (
              <>
                <div className={s.queuedFile}>
                  <span className={s.queuedFileName}>{entry.file.name}</span>
                </div>
                <button
                  type="button"
                  className={s.uploadBtn}
                  onClick={() => handleUpload(entry.tempId)}
                  disabled={entry.uploading || !entry.nombreCustom.trim()}
                >
                  <Upload size={14} />
                  {entry.uploading ? "Subiendo…" : entry.existing ? "Reemplazar archivo" : "Subir archivo"}
                </button>
              </>
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
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const obraId = id ? Number(id) : undefined;

  const [form, setForm] = useState<ObraSocialFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | undefined>(obraId);

  // Relacionadas
  const [principalRef, setPrincipalRef] = useState<ObraSocialRef | null>(null);
  const [principalQuery, setPrincipalQuery] = useState("");
  const [principalResults, setPrincipalResults] = useState<ObraSocialRef[]>([]);
  const [searchingPrincipal, setSearchingPrincipal] = useState(false);
  const principalDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [asociadasRefs, setAsociadasRefs] = useState<ObraSocialRef[]>([]);
  const [originalAsociadasRefs, setOriginalAsociadasRefs] = useState<ObraSocialRef[]>([]);

  // Documentos
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [reloadDocsTrigger, setReloadDocsTrigger] = useState(0);
  const [pendingFixed, setPendingFixed] = useState<Map<TipoDocumento, File>>(new Map());
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
          cuit: data.cuit ?? "",
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
          asociadas_ids: data.asociadas?.map((a) => a.id) ?? [],
        });

        if (data.obra_social_principal) {
          setPrincipalRef(data.obra_social_principal);
        }
        const loadedAsociadas = data.asociadas ?? [];
        setAsociadasRefs(loadedAsociadas);
        setOriginalAsociadasRefs(loadedAsociadas);
        setDocumentos(data.documentos ?? []);
      } catch {
        setServerError("No se pudo cargar la obra social.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, obraId, reloadDocsTrigger]);

  // ── Principal search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (principalDebounce.current) clearTimeout(principalDebounce.current);
    if (!principalQuery.trim()) {
      setPrincipalResults([]);
      return;
    }
    principalDebounce.current = setTimeout(async () => {
      setSearchingPrincipal(true);
      try {
        const res = await searchObrasSociales(principalQuery, obraId);
        setPrincipalResults(res);
      } catch {
        /* silent */
      } finally {
        setSearchingPrincipal(false);
      }
    }, 300);
  }, [principalQuery, obraId]);

  // ── Field helpers ────────────────────────────────────────────────────────────
  const set = (field: keyof ObraSocialFormData, value: string | number[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
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
      payload.obra_social_principal_id = principalRef
        ? String(principalRef.id)
        : "";

      // Compute asociadas diff to PATCH each child individually
      const originalIds = new Set(originalAsociadasRefs.map((r) => r.id));
      const currentIds = new Set(asociadasRefs.map((r) => r.id));
      const toAdd = asociadasRefs.filter((r) => !originalIds.has(r.id));
      const toRemove = originalAsociadasRefs.filter((r) => !currentIds.has(r.id));

      if (isEdit && obraId) {
        await updateObraSocial(obraId, payload);
        await Promise.allSettled([
          ...toAdd.map((r) => setObraSocialPrincipal(r.id, obraId)),
          ...toRemove.map((r) => setObraSocialPrincipal(r.id, null)),
        ]);
        navigate(`/panel/convenios/obras-sociales/${obraId}`);
      } else {
        const created = await createObraSocial(payload);
        const uploads: Promise<unknown>[] = [];
        pendingFixed.forEach((file, tipo) => {
          uploads.push(uploadDocumento(created.id, tipo, file));
        });
        pendingOtros.forEach((entry) => {
          uploads.push(uploadDocumento(created.id, "otros", entry.file, entry.nombreCustom));
        });
        // Link all selected asociadas to the newly created OS
        toAdd.forEach((r) => {
          uploads.push(setObraSocialPrincipal(r.id, created.id));
        });
        await Promise.allSettled(uploads);
        setSavedId(created.id);
        navigate(`/panel/convenios/obras-sociales/${created.id}`);
      }
    } catch {
      setServerError(
        "Ocurrió un error al guardar. Verificá los datos e intentá nuevamente."
      );
    } finally {
      setSaving(false);
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
                maxLength={45}
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
                onChange={(e) => set("cuit", e.target.value)}
                placeholder="Ej: 30-12345678-9"
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
          </div>
        </section>

        {/* ── Sección 4: Relaciones ── */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>Relaciones entre Obras Sociales</h2>
          <div className={s.grid2}>
            {/* Obra social principal */}
            <div className={s.field}>
              <label className={s.label}>Obra Social Principal</label>
              {principalRef ? (
                <div className={s.principalSelected}>
                  <span className={s.tag}>
                    {principalRef.denominacion}
                    <button
                      type="button"
                      className={s.tagRemove}
                      onClick={() => {
                        setPrincipalRef(null);
                        setForm((f) => ({
                          ...f,
                          obra_social_principal_id: "",
                        }));
                      }}
                      aria-label="Quitar obra social principal"
                    >
                      <X size={12} />
                    </button>
                  </span>
                </div>
              ) : (
                <div className={s.searchWrapInline}>
                  <Search
                    size={14}
                    className={s.searchIcon}
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    className={s.searchInput}
                    placeholder="Buscar obra social principal…"
                    value={principalQuery}
                    onChange={(e) => setPrincipalQuery(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              )}

              {!principalRef &&
                (searchingPrincipal || principalResults.length > 0) && (
                  <ul className={s.searchDropdown} role="listbox">
                    {searchingPrincipal && (
                      <li className={s.searchDropdownItem}>Buscando…</li>
                    )}
                    {!searchingPrincipal &&
                      principalResults.map((ref) => (
                        <li key={ref.id} className={s.searchDropdownItem}>
                          <button
                            type="button"
                            className={s.searchDropdownBtn}
                            onClick={() => {
                              setPrincipalRef(ref);
                              setForm((f) => ({
                                ...f,
                                obra_social_principal_id: String(ref.id),
                              }));
                              setPrincipalQuery("");
                              setPrincipalResults([]);
                            }}
                          >
                            <Plus size={13} />
                            {ref.denominacion}
                          </button>
                        </li>
                      ))}
                    {!searchingPrincipal &&
                      principalResults.length === 0 &&
                      principalQuery.trim() && (
                        <li className={s.searchDropdownItem}>
                          Sin resultados.
                        </li>
                      )}
                  </ul>
                )}
            </div>

            {/* Obras sociales asociadas */}
            <div className={s.field}>
              <label className={s.label}>Obras Sociales Asociadas</label>
              <AsociadasSelector
                selected={asociadasRefs}
                onChange={(refs) => {
                  setAsociadasRefs(refs);
                  setForm((f) => ({
                    ...f,
                    asociadas_ids: refs.map((r) => r.id),
                  }));
                }}
                excludeId={obraId}
              />
            </div>
          </div>
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
                  onQueue={(t, file) => {
                    setPendingFixed((prev) => {
                      const next = new Map(prev);
                      if (file) next.set(t, file);
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
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardPlus, Pencil, Plus, Search } from "lucide-react";
import ActionModal from "../../components/molecules/ActionModal/ActionModal";
import {
  getEspecialidades,
  createEspecialidad,
  updateEspecialidad,
} from "./especialidades.api";
import {
  EMPTY_ESPECIALIDAD_FORM,
  validateEspecialidadForm,
  formToPayload,
  especialidadToForm,
} from "./especialidades.types";
import type {
  Especialidad,
  EspecialidadFormData,
  EspecialidadFormErrors,
} from "./especialidades.types";
import s from "./EspecialidadesPage.module.scss";
import Button from "../../components/atoms/Button/Button";

// ─── Field error helper ───────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <span className={s.fieldError} role="alert">
      {msg}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EspecialidadesPage() {
  // List state
  const [items, setItems] = useState<Especialidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Especialidad | null>(null);
  const [formData, setFormData] = useState<EspecialidadFormData>(EMPTY_ESPECIALIDAD_FORM);
  const [formErrors, setFormErrors] = useState<EspecialidadFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // ── Load list ────────────────────────────────────────────────────────────────
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    let cancelled = false;

    setLoading(true);
    setLoadError(null);

    getEspecialidades()
      .then((data) => {
        if (!cancelled)
          setItems(data.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(
            err?.response?.data?.detail ?? err?.message ?? "No se pudieron cargar las especialidades."
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, []);

  // ── Client-side search ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.nombre.toLowerCase().includes(q) ||
        String(it.id).includes(q) ||
        String(it.id_colegio_espe).includes(q)
    );
  }, [items, searchTerm]);

  // ── Open modal helpers ───────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setFormData(EMPTY_ESPECIALIDAD_FORM);
    setFormErrors({});
    setSaveError(null);
    setModalOpen(true);
  };

  const openEdit = (item: Especialidad) => {
    setEditing(item);
    setFormData(especialidadToForm(item));
    setFormErrors({});
    setSaveError(null);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  // ── Form field setter ────────────────────────────────────────────────────────
  const setField = (field: keyof EspecialidadFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field])
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ── Submit (called by ActionModal's onConfirm) ───────────────────────────────
  const handleSave = async () => {
    const errs = validateEspecialidadForm(formData);
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      throw new Error("validation_error"); // keeps modal open
    }

    setSaveError(null);
    const payload = formToPayload(formData);

    try {
      if (editing) {
        const updated = await updateEspecialidad(editing.id, payload);
        setItems((prev) =>
          prev
            .map((it) => (it.id === updated.id ? updated : it))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
        );
      } else {
        const created = await createEspecialidad(payload);
        setItems((prev) =>
          [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
        );
      }
      // On success ActionModal closes automatically
    } catch (err: any) {
      setSaveError(
        err?.response?.data?.detail ?? err?.message ?? "Error al guardar. Intentá nuevamente."
      );
      throw err; // re-throw → ActionModal stays open
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={s.container}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <ClipboardPlus size={32} className={s.headerIcon} aria-hidden="true" />
          <div>
            <h1 className={s.title}>Especialidades</h1>
            <p className={s.subtitle}>
              {loading ? "Cargando…" : `${items.length} especialidad${items.length !== 1 ? "es" : ""} registrada${items.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <div className={s.headerActions}>
          <Button variant="secondary" size="sm" onClick={openCreate}>
            <Plus size={16} />
            Nueva especialidad
          </Button>
        </div>
      </div>

      {/* Load error */}
      {loadError && (
        <div className={s.errorBanner} role="alert">
          {loadError}
        </div>
      )}

      {/* Search */}
      <div className={s.searchRow}>
        <div className={s.searchWrap}>
          <Search size={16} className={s.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={s.searchInput}
            placeholder="Buscar por nombre, ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar especialidades"
          />
        </div>
      </div>

      {/* Table */}
      <div className={s.tableWrapper}>
        {loading ? (
          <div className={s.loadingState}>
            <span className={s.spinner} aria-hidden="true" />
            <p>Cargando especialidades…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={s.emptyState}>
            <ClipboardPlus size={40} className={s.emptyIcon} aria-hidden="true" />
            <p>
              {searchTerm.trim()
                ? "No se encontraron especialidades con ese criterio."
                : "No hay especialidades registradas aún."}
            </p>
          </div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>ID Colegio</th>
                <th>Nombre</th>
                <th className={s.actionsCol}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className={s.idCell}>{item.id}</td>
                  <td className={s.idCell}>{item.id_colegio_espe}</td>
                  <td className={s.nameCell}>{item.nombre}</td>
                  <td className={s.actionsCol}>
                    <div className={s.actions}>
                      <button
                        type="button"
                        className={s.iconBtn}
                        onClick={() => openEdit(item)}
                        title="Editar"
                        aria-label={`Editar ${item.nombre}`}
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit modal */}
      <ActionModal
        open={modalOpen}
        title={editing ? `Editar: ${editing.nombre}` : "Nueva Especialidad"}
        size="sm"
        onClose={closeModal}
        onConfirm={handleSave}
        confirmText={editing ? "Guardar cambios" : "Crear especialidad"}
        cancelText="Cancelar"
      >
        <div className={s.modalBody}>
          {/* ID — read-only, shown in edit mode only */}
          {editing && (
            <div className={s.field}>
              <span className={s.label}>ID</span>
              <input
                type="text"
                className={`${s.input} ${s.inputReadonly}`}
                value={editing.id}
                readOnly
                aria-label="ID (solo lectura)"
              />
              <span className={s.fieldHint}>Asignado por el sistema, no editable.</span>
            </div>
          )}

          {/* ID Colegio */}
          <div className={s.field}>
            <label className={s.label} htmlFor="modal-id-colegio">
              ID Colegio <span className={s.required}>*</span>
            </label>
            <input
              id="modal-id-colegio"
              type="text"
              inputMode="numeric"
              className={`${s.input} ${formErrors.id_colegio_espe ? s.inputError : ""}`}
              value={formData.id_colegio_espe}
              onChange={(e) => setField("id_colegio_espe", e.target.value)}
              placeholder="Ej: 10"
              maxLength={10}
              autoComplete="off"
            />
            <FieldError msg={formErrors.id_colegio_espe} />
          </div>

          {/* Nombre */}
          <div className={s.field}>
            <label className={s.label} htmlFor="modal-nombre">
              Nombre <span className={s.required}>*</span>
            </label>
            <input
              id="modal-nombre"
              type="text"
              className={`${s.input} ${formErrors.nombre ? s.inputError : ""}`}
              value={formData.nombre}
              onChange={(e) => setField("nombre", e.target.value)}
              placeholder="Ej: CARDIOLOGIA"
              maxLength={200}
              autoComplete="off"
            />
            <FieldError msg={formErrors.nombre} />
          </div>

          {/* API save error */}
          {saveError && (
            <div className={s.saveError} role="alert">
              {saveError}
            </div>
          )}
        </div>
      </ActionModal>
    </div>
  );
}

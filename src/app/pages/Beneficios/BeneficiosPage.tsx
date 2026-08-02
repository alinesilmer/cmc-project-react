import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Gift,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import ActionModal from "../../components/molecules/ActionModal/ActionModal";
import Button from "../../components/atoms/Button/Button";
import {
  createBeneficio,
  deleteBeneficio,
  getBeneficios,
  updateBeneficio,
} from "./beneficios.api";
import {
  CATEGORIAS_BENEFICIO,
  COLOR_PRESETS,
  EMPTY_BENEFICIO_FORM,
  beneficioToForm,
  estaVencido,
  formToPayload,
  formatFecha,
  validateBeneficioForm,
} from "./beneficios.types";
import type {
  Beneficio,
  BeneficioFormData,
  BeneficioFormErrors,
} from "./beneficios.types";
import s from "./BeneficiosPage.module.scss";

const PAGE_SIZE = 20;

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <span className={s.fieldError} role="alert">
      {msg}
    </span>
  );
}

export default function BeneficiosPage() {
  // List state
  const [items, setItems] = useState<Beneficio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [page, setPage] = useState(1);

  // Create / edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Beneficio | null>(null);
  const [formData, setFormData] = useState<BeneficioFormData>(EMPTY_BENEFICIO_FORM);
  const [formErrors, setFormErrors] = useState<BeneficioFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete modal
  const [deleting, setDeleting] = useState<Beneficio | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Load list ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    getBeneficios({ limit: 200 })
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(
            err?.response?.data?.detail ??
              err?.message ??
              "No se pudieron cargar los beneficios."
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Client-side search + filter ────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((it) => {
      if (categoriaFilter && it.categoria !== categoriaFilter) return false;
      if (!q) return true;
      return (
        it.titulo.toLowerCase().includes(q) ||
        (it.ubicacion ?? "").toLowerCase().includes(q) ||
        (it.descuento ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, searchTerm, categoriaFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoriaFilter]);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setFormData(EMPTY_BENEFICIO_FORM);
    setFormErrors({});
    setSaveError(null);
    setModalOpen(true);
  };

  const openEdit = (item: Beneficio) => {
    setEditing(item);
    setFormData(beneficioToForm(item));
    setFormErrors({});
    setSaveError(null);
    setModalOpen(true);
  };

  const setField = <K extends keyof BeneficioFormData>(
    field: K,
    value: BeneficioFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field])
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const errs = validateBeneficioForm(formData);
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      throw new Error("validation_error"); // mantiene el modal abierto
    }

    setSaveError(null);
    const payload = formToPayload(formData);

    try {
      if (editing) {
        const updated = await updateBeneficio(editing.id, payload);
        setItems((prev) =>
          prev.map((it) => (it.id === updated.id ? updated : it))
        );
      } else {
        const created = await createBeneficio(payload);
        setItems((prev) => [...prev, created]);
      }
    } catch (err: any) {
      setSaveError(
        err?.response?.data?.detail ??
          err?.message ??
          "Error al guardar. Intentá nuevamente."
      );
      throw err;
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);
    try {
      await deleteBeneficio(deleting.id);
      setItems((prev) => prev.filter((it) => it.id !== deleting.id));
    } catch (err: any) {
      setDeleteError(
        err?.response?.data?.detail ??
          err?.message ??
          "No se pudo eliminar el beneficio."
      );
      throw err;
    }
  };

  const activos = items.filter((it) => it.activo).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.container}>
      <div className={s.header}>
        <div className={s.headerLeft}>
          <Gift size={32} className={s.headerIcon} aria-hidden="true" />
          <div>
            <h1 className={s.title}>Beneficios</h1>
            <p className={s.subtitle}>
              {loading
                ? "Cargando…"
                : `${items.length} beneficio${items.length !== 1 ? "s" : ""} · ${activos} activo${activos !== 1 ? "s" : ""} visible${activos !== 1 ? "s" : ""} en la app`}
            </p>
          </div>
        </div>
        <div className={s.headerActions}>
          <Button variant="secondary" size="sm" onClick={openCreate}>
            <Plus size={16} />
            Nuevo beneficio
          </Button>
        </div>
      </div>

      {loadError && (
        <div className={s.errorBanner} role="alert">
          {loadError}
        </div>
      )}

      <div className={s.searchRow}>
        <div className={s.searchWrap}>
          <Search size={16} className={s.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={s.searchInput}
            placeholder="Buscar por título, ubicación, descuento…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar beneficios"
          />
        </div>
        <select
          className={s.filterSelect}
          value={categoriaFilter}
          onChange={(e) => setCategoriaFilter(e.target.value)}
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS_BENEFICIO.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className={s.tableWrapper}>
        {loading ? (
          <div className={s.loadingState}>
            <span className={s.spinner} aria-hidden="true" />
            <p>Cargando beneficios…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={s.emptyState}>
            <Gift size={40} className={s.emptyIcon} aria-hidden="true" />
            <p>
              {searchTerm.trim() || categoriaFilter
                ? "No se encontraron beneficios con ese criterio."
                : "No hay beneficios cargados aún."}
            </p>
          </div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Título</th>
                <th>Categoría</th>
                <th>Descuento</th>
                <th>Ubicación</th>
                <th>Vigencia</th>
                <th>Estado</th>
                <th className={s.actionsCol}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className={s.nameCell}>
                      <span
                        className={s.colorBar}
                        style={{
                          backgroundColor: item.color ?? "transparent",
                          borderColor: item.color ? item.color : undefined,
                        }}
                        aria-hidden="true"
                        title={item.color ? `Acento ${item.color}` : "Sin color"}
                      />
                      <span className={s.nameText}>
                        <span className={s.itemTitle}>{item.titulo}</span>
                        <span className={s.itemDesc}>{item.descripcion}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={s.categoryChip}>{item.categoria}</span>
                  </td>
                  <td className={s.discountCell}>{item.descuento ?? "—"}</td>
                  <td className={s.mutedCell}>{item.ubicacion ?? "—"}</td>
                  <td className={s.mutedCell}>
                    {formatFecha(item.vigencia_hasta)}
                    {item.activo && estaVencido(item) && (
                      <span className={s.expiredHint} title="Sigue visible en la app: desactivalo para ocultarlo">
                        vencido
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`${s.badge} ${item.activo ? s.badgeOn : s.badgeOff}`}
                    >
                      {item.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className={s.actionsCol}>
                    <div className={s.actions}>
                      <button
                        type="button"
                        className={s.iconBtn}
                        onClick={() => openEdit(item)}
                        title="Editar"
                        aria-label={`Editar ${item.titulo}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className={`${s.iconBtn} ${s.iconBtnDanger}`}
                        onClick={() => {
                          setDeleteError(null);
                          setDeleting(item);
                        }}
                        title="Eliminar"
                        aria-label={`Eliminar ${item.titulo}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className={s.pagination} role="navigation" aria-label="Paginación">
          <button
            className={s.pageBtn}
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className={s.pageInfo}>
            Página {page} de {totalPages}
          </span>
          <button
            className={s.pageBtn}
            onClick={() => setPage((p) => p + 1)}
            disabled={page === totalPages}
            aria-label="Página siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Create / edit */}
      <ActionModal
        open={modalOpen}
        title={editing ? `Editar: ${editing.titulo}` : "Nuevo beneficio"}
        size="sm"
        onClose={() => setModalOpen(false)}
        onConfirm={handleSave}
        confirmText={editing ? "Guardar cambios" : "Crear beneficio"}
        cancelText="Cancelar"
      >
        <div className={s.modalBody}>
          <div className={s.field}>
            <label className={s.label} htmlFor="ben-titulo">
              Título <span className={s.required}>*</span>
            </label>
            <input
              id="ben-titulo"
              type="text"
              className={`${s.input} ${formErrors.titulo ? s.inputError : ""}`}
              value={formData.titulo}
              onChange={(e) => setField("titulo", e.target.value)}
              placeholder="Ej: Gimnasio Central"
              maxLength={160}
              autoComplete="off"
            />
            <FieldError msg={formErrors.titulo} />
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="ben-descripcion">
              Descripción <span className={s.required}>*</span>
            </label>
            <textarea
              id="ben-descripcion"
              className={`${s.textarea} ${formErrors.descripcion ? s.inputError : ""}`}
              value={formData.descripcion}
              onChange={(e) => setField("descripcion", e.target.value)}
              placeholder="Qué incluye el beneficio y cómo se accede"
              rows={3}
              maxLength={4000}
            />
            <FieldError msg={formErrors.descripcion} />
          </div>

          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.label} htmlFor="ben-categoria">
                Categoría <span className={s.required}>*</span>
              </label>
              <select
                id="ben-categoria"
                className={`${s.input} ${formErrors.categoria ? s.inputError : ""}`}
                value={formData.categoria}
                onChange={(e) => setField("categoria", e.target.value)}
              >
                <option value="">Elegir…</option>
                {CATEGORIAS_BENEFICIO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <FieldError msg={formErrors.categoria} />
            </div>

            <div className={s.field}>
              <label className={s.label} htmlFor="ben-descuento">
                Descuento
              </label>
              <input
                id="ben-descuento"
                type="text"
                className={`${s.input} ${formErrors.descuento ? s.inputError : ""}`}
                value={formData.descuento}
                onChange={(e) => setField("descuento", e.target.value)}
                placeholder="Ej: 20%, 2x1, Tarifa socio"
                maxLength={60}
                autoComplete="off"
              />
              <FieldError msg={formErrors.descuento} />
            </div>
          </div>

          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.label} htmlFor="ben-ubicacion">
                Ubicación
              </label>
              <input
                id="ben-ubicacion"
                type="text"
                className={`${s.input} ${formErrors.ubicacion ? s.inputError : ""}`}
                value={formData.ubicacion}
                onChange={(e) => setField("ubicacion", e.target.value)}
                placeholder="Ej: Corrientes Capital"
                maxLength={200}
                autoComplete="off"
              />
              <FieldError msg={formErrors.ubicacion} />
            </div>

            <div className={s.field}>
              <label className={s.label} htmlFor="ben-vigencia">
                Vigente hasta
              </label>
              <input
                id="ben-vigencia"
                type="date"
                className={`${s.input} ${formErrors.vigencia_hasta ? s.inputError : ""}`}
                value={formData.vigencia_hasta}
                onChange={(e) => setField("vigencia_hasta", e.target.value)}
              />
              <FieldError msg={formErrors.vigencia_hasta} />
            </div>
          </div>

          <div className={s.field}>
            <span className={s.label}>Color de la tarjeta</span>
            <div className={s.swatchRow} role="group" aria-label="Color de la tarjeta">
              <button
                type="button"
                className={`${s.swatchNone} ${!formData.color ? s.swatchActive : ""}`}
                onClick={() => setField("color", "")}
                title="Sin color"
                aria-pressed={!formData.color}
              >
                Sin color
              </button>
              {COLOR_PRESETS.map((c) => {
                const selected =
                  formData.color.toUpperCase() === c.value.toUpperCase();
                return (
                  <button
                    key={c.value}
                    type="button"
                    className={`${s.swatch} ${selected ? s.swatchActive : ""}`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setField("color", c.value)}
                    title={c.label}
                    aria-label={c.label}
                    aria-pressed={selected}
                  />
                );
              })}
            </div>
            <span className={s.fieldHint}>
              Acento del beneficio en la app — para destacarlo.
            </span>
          </div>

          <label className={s.checkboxRow} htmlFor="ben-activo">
            <input
              id="ben-activo"
              type="checkbox"
              checked={formData.activo}
              onChange={(e) => setField("activo", e.target.checked)}
            />
            <span>
              Activo
              <span className={s.fieldHint}>
                {" "}
                — sólo los activos se ven en la app de socios
              </span>
            </span>
          </label>

          {saveError && (
            <div className={s.saveError} role="alert">
              {saveError}
            </div>
          )}
        </div>
      </ActionModal>

      {/* Delete confirm */}
      <ActionModal
        open={Boolean(deleting)}
        title="Eliminar beneficio"
        size="xs"
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        confirmText="Eliminar"
        cancelText="Cancelar"
      >
        <div className={s.modalBody}>
          <p className={s.confirmText}>
            ¿Eliminar <strong>{deleting?.titulo}</strong>? Esta acción no se puede
            deshacer. Si sólo querés sacarlo de la app, editalo y desmarcá
            «Activo».
          </p>
          {deleteError && (
            <div className={s.saveError} role="alert">
              {deleteError}
            </div>
          )}
        </div>
      </ActionModal>
    </div>
  );
}

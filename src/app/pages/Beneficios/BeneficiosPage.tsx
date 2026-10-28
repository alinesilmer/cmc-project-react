import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Gift,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { saveAs } from "@/app/shared/lib/fileSaver";
import escudoCMC from "../../assets/escudoCMC.png";
import ActionModal from "@/app/components/ui/ActionModal/ActionModal";
import Button from "@/app/components/ui/Button/Button";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
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
  formToPayload,
  validateBeneficioForm,
} from "./beneficios.types";
import type {
  Beneficio,
  BeneficioFormData,
  BeneficioFormErrors,
} from "./beneficios.types";
import { generarRevistaPdf } from "./revistaPdf";
import s from "./BeneficiosPage.module.scss";
import { hoyISO } from "@/app/shared/lib/fechas";
import { detalleDeError } from "@/app/shared/lib/httpErrors";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Franja from "@/app/components/layout/Franja/Franja";
import FieldError from "@/app/components/ui/FieldError/FieldError";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Paginador from "@/app/components/ui/Paginador/Paginador";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

// Múltiplo de tres: la grilla de cupones va de a tres por fila.
const PAGE_SIZE = 18;
const BENEFICIOS_KEY = ["beneficios", "gestion"] as const;

/** «20%» → 20% / descuento; «2x1 martes» → 2x1 / martes: lo grande va en el talón. */
function partirDescuento(descuento: string | null) {
  const texto = descuento?.trim();
  if (!texto) return null;
  const corte = texto.search(/\s/);
  if (corte < 0) return { grande: texto, chico: texto.endsWith("%") ? "descuento" : "" };
  return { grande: texto.slice(0, corte), chico: texto.slice(corte + 1).trim() };
}

export default function BeneficiosPage() {
  // List state
  const queryClient = useQueryClient();
  const consulta = useQuery({
    queryKey: BENEFICIOS_KEY,
    queryFn: () => getBeneficios({ limit: 200 }),
  });
  const items = useMemo(() => consulta.data ?? [], [consulta.data]);
  const loading = consulta.isPending;
  const [revistaError, setRevistaError] = useState<string | null>(null);
  const loadError =
    revistaError ??
    (consulta.isError
      ? detalleDeError(consulta.error, "No se pudieron cargar los beneficios.")
      : null);
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

  /** Corrige la caché al instante y vuelve a pedir el listado. */
  const actualizarLista = (cambio: (prev: Beneficio[]) => Beneficio[]) => {
    queryClient.setQueryData<Beneficio[]>(BENEFICIOS_KEY, (prev) => prev && cambio(prev));
    void queryClient.invalidateQueries({ queryKey: BENEFICIOS_KEY });
    void queryClient.invalidateQueries({ queryKey: ["beneficios-vigentes"] });
    void queryClient.invalidateQueries({ queryKey: ["web", "beneficios-vigentes"] });
  };

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

  // ── Revista ────────────────────────────────────────────────────────────────
  // Se genera con TODOS los beneficios activos, no con el filtro de pantalla: la revista es material institucional, no un recorte de la búsqueda actual.
  const [generandoRevista, setGenerandoRevista] = useState(false);

  const handleRevista = async () => {
    setGenerandoRevista(true);
    setRevistaError(null);
    try {
      const logo = new URL(escudoCMC, window.location.origin).href;
      const blob = await generarRevistaPdf(items, logo);
      const fecha = hoyISO();
      saveAs(blob, `red-de-beneficios-${fecha}.pdf`);
    } catch (e) {
      console.error(e);
      setRevistaError("No se pudo generar la revista. Intentá de nuevo.");
    } finally {
      setGenerandoRevista(false);
    }
  };

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
        actualizarLista((prev) =>
          prev.map((it) => (it.id === updated.id ? updated : it))
        );
      } else {
        const created = await createBeneficio(payload);
        actualizarLista((prev) => [...prev, created]);
      }
    } catch (err) {
      setSaveError(detalleDeError(err, "Error al guardar. Intentá nuevamente."));
      throw err;
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);
    try {
      await deleteBeneficio(deleting.id);
      const borradoId = deleting.id;
      actualizarLista((prev) => prev.filter((it) => it.id !== borradoId));
    } catch (err) {
      setDeleteError(detalleDeError(err, "No se pudo eliminar el beneficio."));
      throw err;
    }
  };

  const activos = items.filter((it) => it.activo).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Franja suelta titulo="Beneficios" icono={Gift} />
      <div className={s.container}>
        {loadError && (
          <div className={s.errorBanner} role="alert">
            {loadError}
          </div>
        )}

        <div className={s.barra}>
          <SearchField
            placeholder="Buscar beneficio…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm("")}
            ariaLabel="Buscar beneficios"
          />
          <div className={s.acciones}>
            <BotonDescarga
              formato="pdf"
              onClick={handleRevista}
              disabled={activos === 0}
              cargando={generandoRevista}
            >
              Revista
            </BotonDescarga>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus size={18} aria-hidden="true" />}
              onClick={openCreate}
            >
              Nuevo
            </Button>
          </div>
        </div>

        <div className={s.rubros} role="group" aria-label="Categoría">
          {["", ...CATEGORIAS_BENEFICIO].map((c) => (
            <BotonPlano
              key={c || "todos"}
              type="button"
              aria-pressed={categoriaFilter === c}
              className={`${s.rubro} ${categoriaFilter === c ? s.rubroOn : ""}`}
              onClick={() => setCategoriaFilter(c)}
            >
              {c || "Todos"}
            </BotonPlano>
          ))}
        </div>

        {loading ? (
          <div className={s.loadingState}>
            <Cargando size={32} tono="marca" aria-hidden="true" />
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
          <div className={s.cupones}>
            {paginated.map((item) => {
              const dto = partirDescuento(item.descuento);
              return (
                <article
                  key={item.id}
                  className={`${s.cupon} ${item.activo ? "" : s.off}`}
                >
                  {/* El talón lleva el color elegido, igual que la tarjeta en la app del socio. */}
                  <div
                    className={`${s.talon} ${item.color ? "" : s.talonSinColor}`}
                    style={item.color ? { backgroundColor: item.color } : undefined}
                  >
                    {dto ? (
                      <>
                        <b className={s.talonGrande}>{dto.grande}</b>
                        {dto.chico && <small className={s.talonChico}>{dto.chico}</small>}
                      </>
                    ) : (
                      <Gift size={40} aria-hidden="true" />
                    )}
                  </div>

                  <div className={s.cuerpo}>
                    <span className={s.rubroCupon}>{item.categoria}</span>
                    <h3 className={s.cuponTitulo} title={item.descripcion}>
                      {item.titulo}
                    </h3>
                    {item.ubicacion && (
                      <span className={s.lugar}>
                        <MapPin size={15} aria-hidden="true" />
                        {item.ubicacion}
                      </span>
                    )}
                    <div className={s.abajo}>
                      <span className={`${s.chip} ${item.activo ? s.chipOk : s.chipNo}`}>
                        {item.activo ? "Activo" : "Inactivo"}
                      </span>
                      <BotonPlano
                        type="button"
                        className={s.iconBtn}
                        onClick={() => openEdit(item)}
                        title="Editar"
                        aria-label={`Editar ${item.titulo}`}
                      >
                        <Pencil size={16} />
                      </BotonPlano>
                      <BotonPlano
                        type="button"
                        className={`${s.iconBtn} ${s.iconBtnDanger}`}
                        onClick={() => {
                          setDeleteError(null);
                          setDeleting(item);
                        }}
                        title="Eliminar"
                        aria-label={`Eliminar ${item.titulo}`}
                      >
                        <Trash2 size={16} />
                      </BotonPlano>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <Paginador pagina={page} totalPaginas={totalPages} onCambiar={setPage} />
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
                  placeholder="Ej: 20%, 2x1 martes"
                  maxLength={60}
                  autoComplete="off"
                />
                <FieldError msg={formErrors.descuento} />
              </div>
            </div>

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
              <span className={s.label}>Color del talón</span>
              <div className={s.swatchRow} role="group" aria-label="Color del talón">
                <BotonPlano
                  type="button"
                  className={`${s.swatchNone} ${!formData.color ? s.swatchActive : ""}`}
                  onClick={() => setField("color", "")}
                  title="Sin color"
                  aria-pressed={!formData.color}
                >
                  Sin color
                </BotonPlano>
                {COLOR_PRESETS.map((c) => {
                  const selected =
                    formData.color.toUpperCase() === c.value.toUpperCase();
                  return (
                    <BotonPlano
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
            </div>

            <label className={s.checkboxRow} htmlFor="ben-activo">
              <input
                id="ben-activo"
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => setField("activo", e.target.checked)}
              />
              <span>Activo</span>
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
    </>
  );
}

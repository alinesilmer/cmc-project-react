import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Save, HousePlus, Info } from "lucide-react";
import {
  createObraSocial,
  updateObraSocial,
  getObraSocial,
  uploadDocumento,
} from "../obrasSociales.api";
import { OBRAS_SOCIALES_KEY, useObrasSociales } from "../useObrasSociales";
import {
  EMPTY_FORM,
  PAQUETE_LABELS,
  leerPlataforma,
  CONDICION_IVA_LABELS,
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
} from "../obrasSociales.types";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import { useNotify } from "@/app/hooks/useNotify";
import s from "./ObrasSocialesForm.module.scss";
import Modal from "@/app/components/ui/Modal/Modal";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import BackButton from "@/app/components/ui/BackButton/BackButton";
import Button from "@/app/components/ui/Button/Button";
import Franja from "@/app/components/layout/Franja/Franja";
import FieldError from "@/app/components/ui/FieldError/FieldError";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import { ContactoList } from "./ContactoList";
import { TIPO_DOCUMENTOS, formatCUIT } from "./documentos.helpers";
import { DocRow } from "./DocRow";
import { OtrosDocList } from "./OtrosDocList";

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
  // Solo en el alta: el back crea la OS y además siembra sus galenos y todo su nomenclador NN, lo que tarda varios segundos.
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
          leerPlataforma(dir?.direccion) !== undefined
            ? "plataforma"
            : dir?.codigo_postal === "3400"
            ? "corrientes_capital"
            : dir
            ? "viaja"
            : "";

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
          df_paquete: leerPlataforma(dir?.direccion) ?? "",
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
          documentacion_digital: !!data.documentacion_digital,
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
  // Sube todo lo encolado y avisa por toast lo que falló.
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
        navigate(`/panel/convenios/obras-sociales/${obraId}`);
      } else {
        setCreando(true);
        const created = await createObraSocial(payload);
        setSavedId(created.id);
        await subirPendientes(created.id);
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
      // En el `finally` porque un alta puede fallar a mitad de camino (los adjuntos) con la obra social ya creada.
      queryClient.removeQueries({ queryKey: [...OBRAS_SOCIALES_KEY, "detalle"] });
      void queryClient.invalidateQueries({ queryKey: OBRAS_SOCIALES_KEY });
      setSaving(false);
      setCreando(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={s.loadingPage}>
        <Cargando size={32} tono="marca" aria-hidden="true" />
        <p>Cargando…</p>
      </div>
    );
  }

  return (
    <div className={s.container}>
      <Franja titulo={isEdit ? "Editar obra social" : "Nueva obra social"} icono={HousePlus} />

      <div>
        <BackButton label="Obras sociales" to="/panel/convenios/obras-sociales" />
      </div>

      {serverError && (
        <div className={s.errorBanner} role="alert">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className={s.form}>
        {/* ── Sección 1: Datos de la obra social ── */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <span className={s.paso} aria-hidden="true">1</span>
            Datos
          </h2>
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
          <h2 className={s.sectionTitle}>
            <span className={s.paso} aria-hidden="true">2</span>
            Envío de facturas
          </h2>

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

              <label className={s.radioLabel}>
                <input
                  type="radio"
                  name="df_tipo"
                  value="plataforma"
                  checked={form.df_tipo === "plataforma"}
                  onChange={() => {
                    setForm((f) => ({
                      ...f,
                      df_tipo: "plataforma",
                      df_provincia: "",
                      df_localidad: "",
                      df_direccion: "",
                      df_codigo_postal: "",
                      df_horario: "",
                      df_paquete: "",
                    }));
                    if (errors.df_tipo)
                      setErrors((prev) => ({ ...prev, df_tipo: undefined }));
                  }}
                  className={s.radioInput}
                />
                Se sube por plataforma
              </label>
            </div>
          </div>

          {form.df_tipo === "plataforma" && (
            <div className={s.grid2}>
              <div className={s.field} id="field-df_paquete">
                <span className={s.label}>Paquete</span>
                <div className={s.radioGroup}>
                  {(Object.keys(PAQUETE_LABELS) as Array<keyof typeof PAQUETE_LABELS>).map((p) => (
                    <label key={p} className={s.radioLabel}>
                      <input
                        type="radio"
                        name="df_paquete"
                        value={p}
                        checked={form.df_paquete === p}
                        onChange={() => set("df_paquete", p)}
                        className={s.radioInput}
                      />
                      {PAQUETE_LABELS[p]}
                    </label>
                  ))}
                </div>
              </div>

              <div className={`${s.field} ${s.fullWidth}`}>
                <label className={s.label} htmlFor="df_horario">
                  Detalle
                </label>
                <input
                  id="df_horario"
                  type="text"
                  className={s.input}
                  value={form.df_horario}
                  onChange={(e) => set("df_horario", e.target.value)}
                  placeholder="Ej: portal, usuario, qué incluye el paquete"
                  maxLength={150}
                />
              </div>
            </div>
          )}

          {form.df_tipo && form.df_tipo !== "plataforma" && (
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
          <h2 className={s.sectionTitle}>
            <span className={s.paso} aria-hidden="true">3</span>
            Facturación y contacto
          </h2>
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
              <CampoFecha
                value={form.fecha_alta_convenio}
                onChange={(valor) => set("fecha_alta_convenio", valor)}
                id="fecha_alta_convenio"
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
          <h2 className={s.sectionTitle}>
            <span className={s.paso} aria-hidden="true">4</span>
            Relaciones
          </h2>

          <div className={s.callout} role="note">
            <Info size={18} className={s.calloutIcon} aria-hidden="true" />
            <p>
              <strong>Opcional.</strong> Elegí la cabecera solo si esta obra social es una derivada.
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
            <span className={s.hint}>Se agrupa con su cabecera en el padrón de médicos.</span>
          </div>

          {/* Replicar de la cabecera: solo en el alta */}
          {!isEdit && cabeceraElegida && (
            <fieldset className={s.replicar}>
              <legend className={s.replicarTitulo}>
                Replicar desde {cabeceraElegida.label}
              </legend>
              <p className={s.hint}>Opcional. Se copia solo lo vigente, sin historial.</p>

              <label className={s.replicarItem}>
                <input
                  type="checkbox"
                  checked={form.replicar_galenos}
                  onChange={(e) => tildarReplica("galenos", e.target.checked)}
                />
                <span>
                  <strong>Galenos</strong>
                  <small>Con sus precios, niveles y unidades.</small>
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
                  <small>Códigos dados de alta (sin precio) y nomencladores nivelados. Los nivelados necesitan los galenos.</small>
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
                  <small>Precios vigentes. Marca también galenos y nomencladores, de los que dependen.</small>
                </span>
              </label>
            </fieldset>
          )}
        </section>

        {/* ── Sección 5: Documentación digital ── */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <span className={s.paso} aria-hidden="true">5</span>
            Documentación Digital
          </h2>
          <label className={s.replicarItem}>
            <input
              type="checkbox"
              checked={form.documentacion_digital}
              onChange={(e) => set("documentacion_digital", e.target.checked)}
            />
            <span>
              <strong>Habilitada</strong>
              <small>Los códigos que llevan documentación se marcan en «Códigos por obra social».</small>
            </span>
          </label>
        </section>

        {/* ── Sección 6: Documentos ── */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <span className={s.paso} aria-hidden="true">6</span>
            Documentos
          </h2>
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
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => navigate("/panel/convenios/obras-sociales")}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            submit
            variant="primary"
            size="lg"
            disabled={saving}
            leftIcon={<Save size={18} aria-hidden="true" />}
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
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
          <Cargando size={44} tono="marca" aria-hidden="true" />
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

import { useEffect, useMemo, useState } from "react";
import { Bell, EyeOff, Info, Megaphone, Send, Smartphone, Users } from "lucide-react";

import ActionModal from "../../components/molecules/ActionModal/ActionModal";
import Button from "../../components/atoms/Button/Button";
import { createAviso, getAvisos, updateAviso } from "./avisos.api";
import {
  EMPTY_AVISO_FORM,
  MENSAJE_MAX,
  TIPOS_AVISO,
  TITULO_MAX,
  formatFechaHora,
  validateAvisoForm,
} from "./avisos.types";
import type { Aviso, AvisoFormData, AvisoFormErrors } from "./avisos.types";
import s from "./AvisosPage.module.scss";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <span className={s.fieldError} role="alert">
      {msg}
    </span>
  );
}

export default function AvisosPage() {
  const [formData, setFormData] = useState<AvisoFormData>(EMPTY_AVISO_FORM);
  const [formErrors, setFormErrors] = useState<AvisoFormErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentOk, setSentOk] = useState<string | null>(null);

  const [enviados, setEnviados] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Aviso que se está bajando del app (PATCH activo=false)
  const [retirando, setRetirando] = useState<Aviso | null>(null);
  const [retiroError, setRetiroError] = useState<string | null>(null);

  // ── Historial ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    getAvisos({ limit: 100 })
      .then((data) => {
        if (!cancelled) setEnviados(data);
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(
            err?.response?.data?.detail ??
              err?.message ??
              "No se pudieron cargar los avisos."
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setField = <K extends keyof AvisoFormData>(
    field: K,
    value: AvisoFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field])
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    setSentOk(null);
    setSendError(null);
  };

  const tituloLen = formData.titulo.trim().length;
  const mensajeLen = formData.mensaje.trim().length;

  const puedeEnviar = useMemo(
    () => Object.keys(validateAvisoForm(formData)).length === 0,
    [formData]
  );

  const abrirConfirmacion = () => {
    const errs = validateAvisoForm(formData);
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }
    setConfirmOpen(true);
  };

  const handleEnviar = async () => {
    setSendError(null);
    try {
      const creado = await createAviso({
        titulo: formData.titulo.trim(),
        mensaje: formData.mensaje.trim(),
        tipo: formData.tipo,
      });
      setEnviados((prev) => [creado, ...prev]);
      setFormData(EMPTY_AVISO_FORM);
      setFormErrors({});
      setSentOk(creado.titulo);
    } catch (err: any) {
      setSendError(
        err?.response?.data?.detail ??
          err?.message ??
          "No se pudo publicar el aviso. Intentá nuevamente."
      );
      throw err; // mantiene el modal abierto
    }
  };

  const handleRetirar = async () => {
    if (!retirando) return;
    setRetiroError(null);
    try {
      const actualizado = await updateAviso(retirando.id, { activo: false });
      setEnviados((prev) =>
        prev.map((a) => (a.id === actualizado.id ? actualizado : a))
      );
    } catch (err: any) {
      setRetiroError(
        err?.response?.data?.detail ??
          err?.message ??
          "No se pudo bajar el aviso."
      );
      throw err;
    }
  };

  const activos = enviados.filter((a) => a.activo).length;

  const previewTitulo = formData.titulo.trim() || "Título del aviso";
  const previewMensaje =
    formData.mensaje.trim() ||
    "Acá va el texto que van a leer los socios en la notificación.";

  return (
    <div className={s.container}>
      <div className={s.header}>
        <div className={s.headerLeft}>
          <Megaphone size={32} className={s.headerIcon} aria-hidden="true" />
          <div>
            <h1 className={s.title}>Avisos</h1>
            <p className={s.subtitle}>
              {loading
                ? "Cargando…"
                : `${enviados.length} aviso${enviados.length !== 1 ? "s" : ""} · ${activos} visible${activos !== 1 ? "s" : ""} en la app`}
            </p>
          </div>
        </div>
      </div>

      {/* El aviso se publica de verdad, pero el teléfono no vibra todavía: sin
          esto, «Publicar aviso» promete una push que no sale. Sacar el cartel
          cuando exista el despacho real (ver docstring de modules/avisos). */}
      <div className={s.demoBanner} role="status">
        <Info size={18} aria-hidden="true" />
        <span>
          El aviso queda <strong>visible en la app</strong> apenas se publica,
          pero la <strong>notificación push</strong> que despierta el teléfono
          todavía no está implementada: falta el registro de dispositivos y las
          credenciales del proveedor. Por ahora el socio lo ve al abrir la app.
        </span>
      </div>

      {loadError && (
        <div className={s.errorBanner} role="alert">
          {loadError}
        </div>
      )}

      <div className={s.layout}>
        {/* ── Composición ──────────────────────────────────────────────── */}
        <section className={s.card} aria-label="Nuevo aviso">
          <h2 className={s.cardTitle}>
            <Send size={18} aria-hidden="true" />
            Nuevo aviso
          </h2>

          <div className={s.field}>
            <label className={s.label} htmlFor="aviso-titulo">
              Título <span className={s.required}>*</span>
            </label>
            <input
              id="aviso-titulo"
              type="text"
              className={`${s.input} ${formErrors.titulo ? s.inputError : ""}`}
              value={formData.titulo}
              onChange={(e) => setField("titulo", e.target.value)}
              placeholder="Ej: Nueva sede de atención en Capital"
              maxLength={TITULO_MAX}
              autoComplete="off"
            />
            <div className={s.fieldFoot}>
              <FieldError msg={formErrors.titulo} />
              <span
                className={`${s.counter} ${tituloLen > TITULO_MAX ? s.counterOver : ""}`}
              >
                {tituloLen}/{TITULO_MAX}
              </span>
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="aviso-mensaje">
              Mensaje <span className={s.required}>*</span>
            </label>
            <textarea
              id="aviso-mensaje"
              className={`${s.textarea} ${formErrors.mensaje ? s.inputError : ""}`}
              value={formData.mensaje}
              onChange={(e) => setField("mensaje", e.target.value)}
              placeholder="Texto que van a ver los socios en la notificación"
              rows={4}
              maxLength={MENSAJE_MAX}
            />
            <div className={s.fieldFoot}>
              <FieldError msg={formErrors.mensaje} />
              <span
                className={`${s.counter} ${mensajeLen > MENSAJE_MAX ? s.counterOver : ""}`}
              >
                {mensajeLen}/{MENSAJE_MAX}
              </span>
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="aviso-tipo">
              Tipo <span className={s.required}>*</span>
            </label>
            <select
              id="aviso-tipo"
              className={`${s.input} ${formErrors.tipo ? s.inputError : ""}`}
              value={formData.tipo}
              onChange={(e) => setField("tipo", e.target.value)}
            >
              {TIPOS_AVISO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className={s.fieldHint}>
              Define el ícono y el color con el que la app muestra el aviso.
            </span>
            <FieldError msg={formErrors.tipo} />
          </div>

          <div className={s.audience}>
            <Users size={16} aria-hidden="true" />
            <span>
              Destinatarios: <strong>todos los socios</strong> con la app
              instalada.
            </span>
          </div>

          {sentOk && (
            <div className={s.successBanner} role="status">
              Aviso «{sentOk}» publicado — ya lo ven los socios en la app.
            </div>
          )}

          {sendError && (
            <div className={s.saveError} role="alert">
              {sendError}
            </div>
          )}

          <div className={s.formActions}>
            <Button
              variant="primary"
              size="sm"
              onClick={abrirConfirmacion}
              disabled={!puedeEnviar}
            >
              <Send size={16} />
              Publicar aviso
            </Button>
          </div>
        </section>

        {/* ── Vista previa ─────────────────────────────────────────────── */}
        <section className={s.card} aria-label="Vista previa">
          <h2 className={s.cardTitle}>
            <Smartphone size={18} aria-hidden="true" />
            Vista previa
          </h2>

          <p className={s.previewHint}>
            Así se ve la notificación en el teléfono del socio.
          </p>

          <div className={s.phone}>
            <div className={s.phoneNotch} aria-hidden="true" />
            <div className={s.push}>
              <div className={s.pushIcon} aria-hidden="true">
                <Bell size={16} />
              </div>
              <div className={s.pushBody}>
                <div className={s.pushMeta}>
                  <span className={s.pushApp}>CMC Socios</span>
                  <span className={s.pushTime}>ahora</span>
                </div>
                <p className={s.pushTitle}>{previewTitulo}</p>
                <p className={s.pushText}>{previewMensaje}</p>
              </div>
            </div>
            <span className={s.pushTipo}>{formData.tipo}</span>
          </div>
        </section>
      </div>

      {/* ── Historial ──────────────────────────────────────────────────── */}
      <section aria-label="Avisos publicados">
        <h2 className={s.sectionTitle}>Avisos publicados</h2>

        <div className={s.tableWrapper}>
          {loading ? (
            <div className={s.loadingState}>
              <span className={s.spinner} aria-hidden="true" />
              <p>Cargando avisos…</p>
            </div>
          ) : enviados.length === 0 ? (
            <div className={s.emptyState}>
              <Megaphone size={40} className={s.emptyIcon} aria-hidden="true" />
              <p>Todavía no se publicó ningún aviso.</p>
            </div>
          ) : (
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Publicado</th>
                  <th>Título</th>
                  <th>Mensaje</th>
                  <th>Tipo</th>
                  <th>Publicó</th>
                  <th>Push</th>
                  <th>Estado</th>
                  <th className={s.actionsCol}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {enviados.map((a) => (
                  <tr key={a.id}>
                    <td className={s.mutedCell}>
                      {formatFechaHora(a.publicado_at)}
                    </td>
                    <td className={s.itemTitle}>{a.titulo}</td>
                    <td className={s.itemDesc}>{a.mensaje}</td>
                    <td>
                      <span className={s.tipoChip}>{a.tipo}</span>
                    </td>
                    <td className={s.mutedCell}>
                      {a.enviado_por_nombre ?? "—"}
                    </td>
                    <td className={s.mutedCell}>
                      <span
                        className={`${s.badge} ${a.push_estado === "enviado" ? s.badgeOn : s.badgeOff}`}
                        title={
                          a.push_error ??
                          (a.push_estado === "pendiente"
                            ? "El despacho de push todavía no está implementado"
                            : undefined)
                        }
                      >
                        {a.push_estado}
                      </span>
                      {a.destinatarios != null && ` · ${a.destinatarios}`}
                    </td>
                    <td>
                      <span
                        className={`${s.badge} ${a.activo ? s.badgeOn : s.badgeOff}`}
                      >
                        {a.activo ? "Visible" : "Bajado"}
                      </span>
                    </td>
                    <td className={s.actionsCol}>
                      <div className={s.actions}>
                        {a.activo && (
                          <button
                            type="button"
                            className={s.iconBtn}
                            onClick={() => {
                              setRetiroError(null);
                              setRetirando(a);
                            }}
                            title="Bajar de la app"
                            aria-label={`Bajar de la app: ${a.titulo}`}
                          >
                            <EyeOff size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <ActionModal
        open={confirmOpen}
        title="Publicar aviso para todos los socios"
        size="xs"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleEnviar}
        confirmText="Publicar"
        cancelText="Cancelar"
      >
        <div className={s.modalBody}>
          <p className={s.confirmText}>
            El aviso va a quedar visible para <strong>todos los socios</strong>{" "}
            en la app.
          </p>
          <div className={s.confirmPreview}>
            <span className={s.confirmPreviewTitle}>
              {formData.titulo.trim()}
            </span>
            <span className={s.confirmPreviewText}>
              {formData.mensaje.trim()}
            </span>
          </div>
          <p className={s.confirmNote}>
            Si te equivocás podés bajarlo después desde el historial, pero
            mientras esté publicado los socios lo ven.
          </p>
          {sendError && (
            <div className={s.saveError} role="alert">
              {sendError}
            </div>
          )}
        </div>
      </ActionModal>

      <ActionModal
        open={Boolean(retirando)}
        title="Bajar aviso de la app"
        size="xs"
        onClose={() => setRetirando(null)}
        onConfirm={handleRetirar}
        confirmText="Bajar"
        cancelText="Cancelar"
      >
        <div className={s.modalBody}>
          <p className={s.confirmText}>
            ¿Bajar <strong>{retirando?.titulo}</strong> de la app? Deja de
            aparecerles a los socios pero queda en este historial.
          </p>
          {retiroError && (
            <div className={s.saveError} role="alert">
              {retiroError}
            </div>
          )}
        </div>
      </ActionModal>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  Building2,
  EyeOff,
  Gift,
  Megaphone,
  Send,
  Star,
  type LucideIcon,
} from "lucide-react";

import ActionModal from "@/app/components/ui/ActionModal/ActionModal";
import Button from "@/app/components/ui/Button/Button";
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
import { detalleDeError } from "@/app/shared/lib/httpErrors";
import Franja from "@/app/components/layout/Franja/Franja";
import FieldError from "@/app/components/ui/FieldError/FieldError";

const AVISOS_KEY = ["avisos", "historial"] as const;

// Cada tipo con su ícono y su color, en el redactor y en la cartelera.
const TIPO_ESTILO: Record<string, { Icono: LucideIcon; clase: string }> = {
  General: { Icono: Bell, clase: s.tipoGeneral },
  Institucional: { Icono: Building2, clase: s.tipoInstitucional },
  Novedades: { Icono: Star, clase: s.tipoNovedades },
  Beneficios: { Icono: Gift, clase: s.tipoBeneficios },
  Urgente: { Icono: AlertTriangle, clase: s.tipoUrgente },
};

const estiloDe = (tipo: string) => TIPO_ESTILO[tipo] ?? TIPO_ESTILO.General;

export default function AvisosPage() {
  const [formData, setFormData] = useState<AvisoFormData>(EMPTY_AVISO_FORM);
  const [formErrors, setFormErrors] = useState<AvisoFormErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentOk, setSentOk] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const consulta = useQuery({
    queryKey: AVISOS_KEY,
    queryFn: () => getAvisos({ limit: 100 }),
  });
  const enviados = consulta.data ?? [];
  const loading = consulta.isPending;
  const loadError = consulta.isError
    ? detalleDeError(consulta.error, "No se pudieron cargar los avisos.")
    : null;

  // Aviso que se está bajando del app (PATCH activo=false)
  const [retirando, setRetirando] = useState<Aviso | null>(null);
  const [retiroError, setRetiroError] = useState<string | null>(null);

  /** Corrige el historial en caché al instante y lo vuelve a pedir. */
  const actualizarHistorial = (cambio: (prev: Aviso[]) => Aviso[]) => {
    queryClient.setQueryData<Aviso[]>(AVISOS_KEY, (prev) => prev && cambio(prev));
    void queryClient.invalidateQueries({ queryKey: AVISOS_KEY });
  };

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
      actualizarHistorial((prev) => [creado, ...prev]);
      setFormData(EMPTY_AVISO_FORM);
      setFormErrors({});
      setSentOk(creado.titulo);
    } catch (err) {
      setSendError(
        detalleDeError(err, "No se pudo publicar el aviso. Intentá nuevamente.")
      );
      throw err; // mantiene el modal abierto
    }
  };

  const handleRetirar = async () => {
    if (!retirando) return;
    setRetiroError(null);
    try {
      const actualizado = await updateAviso(retirando.id, { activo: false });
      actualizarHistorial((prev) =>
        prev.map((a) => (a.id === actualizado.id ? actualizado : a))
      );
    } catch (err) {
      setRetiroError(detalleDeError(err, "No se pudo bajar el aviso."));
      throw err;
    }
  };

  return (
    <>
      <Franja suelta titulo="Avisos" icono={Megaphone} />
      <div className={s.container}>
        {loadError && (
          <div className={s.errorBanner} role="alert">
            {loadError}
          </div>
        )}

        {/* ── Redactor: se escribe como un mensaje ── */}
        <section className={s.redactor} aria-label="Nuevo aviso">
          <div className={s.redactorTitulo}>
            <input
              id="aviso-titulo"
              type="text"
              className={s.tituloIn}
              value={formData.titulo}
              onChange={(e) => setField("titulo", e.target.value)}
              placeholder="Título del aviso"
              aria-label="Título"
              aria-invalid={Boolean(formErrors.titulo)}
              maxLength={TITULO_MAX}
              autoComplete="off"
            />
            <span className={s.counter}>
              {tituloLen} / {TITULO_MAX}
            </span>
          </div>
          {formErrors.titulo && (
            <div className={s.redactorError}>
              <FieldError msg={formErrors.titulo} />
            </div>
          )}

          <textarea
            id="aviso-mensaje"
            className={s.mensajeIn}
            value={formData.mensaje}
            onChange={(e) => setField("mensaje", e.target.value)}
            placeholder="Lo que va a leer el socio"
            aria-label="Mensaje"
            aria-invalid={Boolean(formErrors.mensaje)}
            rows={3}
            maxLength={MENSAJE_MAX}
          />
          {formErrors.mensaje && (
            <div className={s.redactorError}>
              <FieldError msg={formErrors.mensaje} />
            </div>
          )}

          <div className={s.bajo}>
            <div className={s.tipos} role="radiogroup" aria-label="Tipo">
              {TIPOS_AVISO.map((t) => {
                const { Icono } = estiloDe(t);
                const elegido = formData.tipo === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={elegido}
                    className={`${s.tipo} ${elegido ? s.tipoOn : ""}`}
                    onClick={() => setField("tipo", t)}
                  >
                    <Icono size={16} aria-hidden="true" />
                    {t}
                  </button>
                );
              })}
            </div>
            <span className={s.counter}>
              {mensajeLen} / {MENSAJE_MAX}
            </span>
            <div className={s.publicar}>
              <Button
                variant="primary"
                size="md"
                leftIcon={<Send size={18} aria-hidden="true" />}
                onClick={abrirConfirmacion}
                disabled={!puedeEnviar}
              >
                Publicar
              </Button>
            </div>
          </div>
        </section>

        {sentOk && (
          <div className={s.successBanner} role="status">
            Aviso «{sentOk}» publicado.
          </div>
        )}

        {/* ── Cartelera de publicados ── */}
        <section aria-label="Avisos publicados">
          <h2 className={s.sub}>
            Publicados
            {/* Sin despacho real de push todavía: que nadie espere que vibre el teléfono. */}
            <span className={s.sinPush}>
              <AlertTriangle size={15} aria-hidden="true" />
              Sin push: se ve al abrir la app
            </span>
          </h2>

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
            <div className={s.cartelera}>
              {enviados.map((a) => {
                const { Icono, clase } = estiloDe(a.tipo);
                return (
                  <article
                    key={a.id}
                    className={`${s.aviso} ${clase} ${a.activo ? "" : s.bajado}`}
                  >
                    <span className={s.avisoIcono} title={a.tipo}>
                      <Icono size={24} aria-hidden="true" />
                    </span>
                    <h3 className={s.avisoTitulo}>{a.titulo}</h3>
                    {a.activo ? (
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
                        <EyeOff size={17} />
                      </button>
                    ) : (
                      <span />
                    )}
                    <p className={s.avisoTexto}>{a.mensaje}</p>
                    <div className={s.meta}>
                      <span className={`${s.chip} ${a.activo ? s.chipOk : s.chipNo}`}>
                        {a.activo ? "Visible" : "Bajado"}
                      </span>
                      {a.push_estado === "error" && (
                        <span className={`${s.chip} ${s.chipNo}`} title={a.push_error ?? undefined}>
                          Push con error
                        </span>
                      )}
                      <span>
                        {formatFechaHora(a.publicado_at)}
                        {a.enviado_por_nombre && ` · ${a.enviado_por_nombre}`}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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
              Si te equivocás podés bajarlo después, pero mientras esté
              publicado los socios lo ven.
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
              aparecerles a los socios pero queda en la lista.
            </p>
            {retiroError && (
              <div className={s.saveError} role="alert">
                {retiroError}
              </div>
            )}
          </div>
        </ActionModal>
      </div>
    </>
  );
}

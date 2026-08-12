import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Inbox,
  X,
} from "lucide-react";

import ActionModal from "../../components/molecules/ActionModal/ActionModal";
import {
  approveSolicitudCambio,
  getSolicitudesCambio,
  rejectSolicitudCambio,
} from "./solicitudesCambio.api";
import {
  ESTADO_LABELS,
  campoLabel,
  formatFechaHora,
} from "./solicitudesCambio.types";
import type {
  EstadoSolicitudCambio,
  SolicitudCambio,
  SolicitudCambioCounts,
} from "./solicitudesCambio.types";
import s from "./SolicitudesCambioPage.module.scss";

const PAGE_SIZE = 20;

const EMPTY_COUNTS: SolicitudCambioCounts = {
  total: 0,
  pendiente: 0,
  aprobada: 0,
  rechazada: 0,
};

type Tab = EstadoSolicitudCambio | "todas";

const TABS: { key: Tab; label: string }[] = [
  { key: "pendiente", label: "Pendientes" },
  { key: "aprobada", label: "Aprobadas" },
  { key: "rechazada", label: "Rechazadas" },
  { key: "todas", label: "Todas" },
];

export default function SolicitudesCambioPage() {
  const [items, setItems] = useState<SolicitudCambio[]>([]);
  const [counts, setCounts] = useState<SolicitudCambioCounts>(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<Tab>("pendiente");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Acción en curso (para deshabilitar los botones de esa fila)
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal de rechazo
  const [rejecting, setRejecting] = useState<SolicitudCambio | null>(null);
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setLoadError(null);
      try {
        const data = await getSolicitudesCambio({
          estado: tab === "todas" ? undefined : tab,
          skip: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        });
        setItems(data.items);
        setCounts(data.counts);
        setTotal(data.total);
      } catch (err: any) {
        setLoadError(
          err?.response?.data?.detail ??
            err?.message ??
            "No se pudieron cargar las solicitudes."
        );
      } finally {
        setLoading(false);
      }
    },
    [tab, page]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Aprobar ────────────────────────────────────────────────────────────────
  const handleApprove = async (item: SolicitudCambio) => {
    setActionError(null);
    setBusyId(item.id);
    try {
      await approveSolicitudCambio(item.id);
      await load({ silent: true });
    } catch (err: any) {
      setActionError(
        err?.response?.data?.detail ??
          err?.message ??
          "No se pudo aprobar la solicitud."
      );
    } finally {
      setBusyId(null);
    }
  };

  // ── Rechazar (pide motivo) ─────────────────────────────────────────────────
  const openReject = (item: SolicitudCambio) => {
    setRejecting(item);
    setMotivo("");
    setMotivoError(null);
  };

  const handleReject = async () => {
    if (!rejecting) return;
    const texto = motivo.trim();
    if (!texto) {
      setMotivoError("Escribí el motivo del rechazo.");
      throw new Error("validation_error"); // mantiene el modal abierto
    }
    setMotivoError(null);
    try {
      await rejectSolicitudCambio(rejecting.id, texto);
      await load({ silent: true });
    } catch (err: any) {
      setMotivoError(
        err?.response?.data?.detail ??
          err?.message ??
          "No se pudo rechazar la solicitud."
      );
      throw err;
    }
  };

  const countFor = (key: Tab) => (key === "todas" ? counts.total : counts[key]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.container}>
      <div className={s.header}>
        <div className={s.headerLeft}>
          <Inbox size={32} className={s.headerIcon} aria-hidden="true" />
          <div>
            <h1 className={s.title}>Solicitudes de cambio</h1>
            <p className={s.subtitle}>
              Reclamos de corrección de datos enviados por los médicos desde la
              app. Aprobar no modifica la ficha: el cambio se aplica a mano.
            </p>
          </div>
        </div>
      </div>

      {loadError && (
        <div className={s.errorBanner} role="alert">
          {loadError}
        </div>
      )}
      {actionError && (
        <div className={s.errorBanner} role="alert">
          {actionError}
        </div>
      )}

      {/* Tabs con badges */}
      <div className={s.tabs} role="tablist" aria-label="Filtrar por estado">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`${s.tab} ${tab === t.key ? s.tabActive : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span
              className={`${s.tabBadge} ${
                t.key === "pendiente" && counts.pendiente > 0
                  ? s.tabBadgeAlert
                  : ""
              }`}
            >
              {countFor(t.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className={s.list}>
        {loading ? (
          <div className={s.loadingState}>
            <span className={s.spinner} aria-hidden="true" />
            <p>Cargando solicitudes…</p>
          </div>
        ) : items.length === 0 ? (
          <div className={s.emptyState}>
            <Inbox size={40} className={s.emptyIcon} aria-hidden="true" />
            <p>
              {tab === "pendiente"
                ? "No hay solicitudes pendientes. Todo al día."
                : "No hay solicitudes con ese estado."}
            </p>
          </div>
        ) : (
          items.map((item) => (
            <article key={item.id} className={s.card}>
              <div className={s.cardHead}>
                <div className={s.doctor}>
                  <span className={s.doctorName}>
                    {item.medico_nombre ?? "Médico sin registro"}
                  </span>
                  <span className={s.doctorMeta}>
                    N° socio {item.nro_socio} · {formatFechaHora(item.created_at)}
                  </span>
                </div>
                <div className={s.cardHeadRight}>
                  <span className={s.campoChip}>{campoLabel(item.campo)}</span>
                  <span className={`${s.badge} ${s[`badge_${item.estado}`]}`}>
                    {ESTADO_LABELS[item.estado]}
                  </span>
                </div>
              </div>

              {/* Formulario completo: se listan TODOS los campos del pedido.
                  Es lo que se va a escribir en el legajo al aprobar, así que
                  mostrar sólo el primero (como hacía el diseño de un campo por
                  solicitud) sería aprobar a ciegas. */}
              {item.cambios && Object.keys(item.cambios).length > 0 ? (
                <div className={s.cambiosLista}>
                  {Object.entries(item.cambios).map(([campo, v]) => (
                    <div key={campo} className={s.values}>
                      <span className={s.campoChip}>{campoLabel(campo)}</span>
                      <div className={s.valueBox}>
                        <span className={s.valueLabel}>Valor actual</span>
                        <span className={s.valueCurrent}>
                          {v?.actual?.trim() || "—"}
                        </span>
                      </div>
                      <ArrowRight
                        size={18}
                        className={s.valueArrow}
                        aria-hidden="true"
                      />
                      <div className={s.valueBox}>
                        <span className={s.valueLabel}>Valor propuesto</span>
                        <span className={s.valueProposed}>
                          {v?.propuesto?.trim() || "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {item.estado === "pendiente" && (
                    <p className={s.avisoAplica}>
                      Al aprobar, estos cambios se aplican automáticamente al
                      legajo del socio.
                    </p>
                  )}
                </div>
              ) : (
                <div className={s.values}>
                  <div className={s.valueBox}>
                    <span className={s.valueLabel}>Valor actual</span>
                    <span className={s.valueCurrent}>
                      {item.valor_actual ?? "—"}
                    </span>
                  </div>
                  <ArrowRight
                    size={18}
                    className={s.valueArrow}
                    aria-hidden="true"
                  />
                  <div className={s.valueBox}>
                    <span className={s.valueLabel}>Valor propuesto</span>
                    <span className={s.valueProposed}>
                      {item.valor_propuesto ?? "—"}
                    </span>
                  </div>
                </div>
              )}

              <p className={s.message}>{item.mensaje}</p>

              {item.estado === "pendiente" ? (
                <div className={s.cardActions}>
                  <button
                    type="button"
                    className={`${s.actionBtn} ${s.approveBtn}`}
                    onClick={() => handleApprove(item)}
                    disabled={busyId === item.id}
                  >
                    <Check size={15} />
                    {busyId === item.id ? "Procesando…" : "Aceptar"}
                  </button>
                  <button
                    type="button"
                    className={`${s.actionBtn} ${s.rejectBtn}`}
                    onClick={() => openReject(item)}
                    disabled={busyId === item.id}
                  >
                    <X size={15} />
                    Rechazar
                  </button>
                </div>
              ) : (
                <div className={s.resolution}>
                  <span className={s.resolutionMeta}>
                    {ESTADO_LABELS[item.estado]} el{" "}
                    {formatFechaHora(item.revisado_at)}
                    {item.revisado_por_nombre
                      ? ` por ${item.revisado_por_nombre}`
                      : ""}
                  </span>
                  {item.respuesta_admin && (
                    <span className={s.resolutionText}>
                      «{item.respuesta_admin}»
                    </span>
                  )}
                </div>
              )}
            </article>
          ))
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

      {/* Modal de rechazo */}
      <ActionModal
        open={Boolean(rejecting)}
        title="Rechazar solicitud"
        size="sm"
        onClose={() => setRejecting(null)}
        onConfirm={handleReject}
        confirmText="Rechazar"
        cancelText="Cancelar"
      >
        <div className={s.modalBody}>
          <p className={s.confirmText}>
            Solicitud de <strong>{rejecting?.medico_nombre ?? "—"}</strong> sobre{" "}
            <strong>{rejecting ? campoLabel(rejecting.campo) : ""}</strong>.
          </p>
          <div className={s.field}>
            <label className={s.label} htmlFor="motivo-rechazo">
              Motivo <span className={s.required}>*</span>
            </label>
            <textarea
              id="motivo-rechazo"
              className={`${s.textarea} ${motivoError ? s.inputError : ""}`}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por qué se rechaza (lo verá el médico)"
              rows={3}
              maxLength={2000}
            />
            {motivoError && (
              <span className={s.fieldError} role="alert">
                {motivoError}
              </span>
            )}
          </div>
        </div>
      </ActionModal>
    </div>
  );
}

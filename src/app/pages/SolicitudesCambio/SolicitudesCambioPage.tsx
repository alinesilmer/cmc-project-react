import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  CircleCheck,
  CircleX,
  Clock,
  Inbox,
  ListChecks,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import ActionModal from "@/app/components/ui/ActionModal/ActionModal";
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
import { detalleDeError } from "@/app/shared/lib/httpErrors";
import Franja, { Solapa } from "@/app/components/layout/Franja/Franja";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Paginador from "@/app/components/ui/Paginador/Paginador";

const PAGE_SIZE = 20;
const SOLICITUDES_KEY = ["solicitudes-cambio", "gestion"] as const;

const EMPTY_COUNTS: SolicitudCambioCounts = {
  total: 0,
  pendiente: 0,
  aprobada: 0,
  rechazada: 0,
};

type Tab = EstadoSolicitudCambio | "todas";

const TABS: { key: Tab; label: string; Icono: LucideIcon }[] = [
  { key: "pendiente", label: "Pendientes", Icono: Clock },
  { key: "aprobada", label: "Aprobadas", Icono: CircleCheck },
  { key: "rechazada", label: "Rechazadas", Icono: CircleX },
  { key: "todas", label: "Todas", Icono: ListChecks },
];

export default function SolicitudesCambioPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("pendiente");
  const [page, setPage] = useState(1);

  const consulta = useQuery({
    queryKey: [...SOLICITUDES_KEY, tab, page],
    queryFn: () =>
      getSolicitudesCambio({
        estado: tab === "todas" ? undefined : tab,
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
    // Al cambiar de pestaña o de página se conserva lo anterior sólo para que los contadores no parpadeen en cero; la lista muestra «Cargando».
    placeholderData: (prev) => prev,
  });
  const items = consulta.data?.items ?? [];
  const counts = consulta.data?.counts ?? EMPTY_COUNTS;
  const total = consulta.data?.total ?? 0;
  const loading = consulta.isPending || consulta.isPlaceholderData;
  const loadError = consulta.isError
    ? detalleDeError(consulta.error, "No se pudieron cargar las solicitudes.")
    : null;

  /** Tras aprobar o rechazar cambian la página visible y los contadores de todas las pestañas. */
  const recargar = () => queryClient.invalidateQueries({ queryKey: SOLICITUDES_KEY });

  // Acción en curso (para deshabilitar los botones de esa fila)
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal de rechazo
  const [rejecting, setRejecting] = useState<SolicitudCambio | null>(null);
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);

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
      await recargar();
    } catch (err) {
      setActionError(
        detalleDeError(err, "No se pudo aprobar la solicitud.")
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
      await recargar();
    } catch (err) {
      setMotivoError(
        detalleDeError(err, "No se pudo rechazar la solicitud.")
      );
      throw err;
    }
  };

  const countFor = (key: Tab) => (key === "todas" ? counts.total : counts[key]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Franja suelta titulo="Solicitudes de cambio" icono={Inbox}>
        {TABS.map(({ key, label, Icono }) => (
          <Solapa key={key} activa={tab === key} onClick={() => setTab(key)} cuenta={countFor(key)}>
            <Icono size={18} aria-hidden="true" /> {label}
          </Solapa>
        ))}
      </Franja>
      <div className={s.container}>
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

        {/* Lista */}
        <div className={s.list}>
          {loading ? (
            <div className={s.loadingState}>
              <Cargando size={32} tono="marca" aria-hidden="true" />
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

                {/* Formulario completo: se listan TODOS los campos del pedido. */}
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
          <Paginador pagina={page} totalPaginas={totalPages} onCambiar={setPage} />
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
    </>
  );
}

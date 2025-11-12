"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
// import type { Application } from "../../../types/types";
import styles from "./ApplicationDetail.module.scss";
import SuccessModal from "../SuccessModal/SuccessModal";
import { getJSON, postJSON } from "../../../lib/http";
import BackButton from "../../../components/atoms/BackButton/BackButton";


export type SolicitudListItem = {
  id: number;
  medico_id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: "nueva" | "pendiente" | "aprobada" | "rechazada";
  submitted_date: string; // ISO
  member_type?: string | null;
  join_date?: string | null;
  observations?: string | null;
  rejection_reason?: string | null;
};

type SolicitudDetail = SolicitudListItem & {
  documento?: string | null;
  provincia?: string | null;
  localidad?: string | null;
  categoria?: string | null;
};

async function fetchSolicitudById(id: number) {
  return getJSON<SolicitudDetail>(`/api/solicitudes/${id}`);
}

async function approveSolicitud(id: number, payload: { observaciones?: string; nro_socio?: number }) {
  return postJSON<{ ok: boolean; nro_socio: number }>(`/api/solicitudes/${id}/approve`, payload);
}

async function rejectSolicitud(id: number, payload: { observaciones?: string }) {
  return postJSON<{ ok: boolean }>(`/api/solicitudes/${id}/reject`, payload);
}


// const sendRejectionEmailMock = (
//   email: string,
//   name: string,
//   reason: string
// ) => {
//   console.log(`[EMAIL MOCK] Rechazo a ${email} (${name}) — ${reason}`);
// };

const ApplicationDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [sol, setSol] = useState<SolicitudDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [nroSocio, setNroSocio] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");
  const [rejectObs, setRejectObs] = useState<string>("");

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const sid = Number(id || 0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchSolicitudById(sid);
        if (!alive) return;
        setSol(data);
        setObservaciones(data.observations || "");
      } catch (e) {
        console.error(e);
        alert("No se pudo cargar la solicitud.");
        navigate("/solicitudes");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [sid, navigate]);

  const onApprove = async () => {
    if (!sol) return;
    try {
      setSending(true);
      const payload: { observaciones?: string; nro_socio?: number } = {};
      if (observaciones?.trim()) payload.observaciones = observaciones.trim();
      if (nroSocio.trim()) {
        const n = Number(nroSocio);
        if (!Number.isFinite(n) || n <= 0) {
          alert("Nro de socio inválido");
          setSending(false);
          return;
        }
        payload.nro_socio = n;
      }
      await approveSolicitud(sid, payload);
      setIsSuccess(true); // muestra modal y luego volver
    } catch (e) {
      console.error(e);
      alert("No se pudo aprobar la solicitud.");
    } finally {
      setSending(false);
    }
  };

  const onReject = async () => {
    if (!sol) return;
    if (!rejectObs.trim()) {
      alert("Ingresá el motivo/observaciones del rechazo.");
      return;
    }
    try {
      setSending(true);
      await rejectSolicitud(sid, { observaciones: rejectObs.trim() });
      alert("Solicitud rechazada y correo enviado.");
      navigate("/solicitudes");
    } catch (e) {
      console.error(e);
      alert("No se pudo rechazar la solicitud.");
    } finally {
      setSending(false);
      setIsRejectOpen(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Cargando…</div>
      </div>
    );
  }

  if (!sol) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h2>Solicitud no encontrada</h2>
          <BackButton />
          
        </div>
      </div>
    );
  }

  // util para badge css
  const statusClass =
    styles[
      `badge${
        sol.status.charAt(0).toUpperCase() + sol.status.slice(1)
      }` as keyof typeof styles
    ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <BackButton />
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <h1 className={styles.title}>Detalle de Solicitud</h1>

          {/* info solicitante */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Información del Solicitante</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Nombre:</span>
                <span className={styles.value}>{sol.name}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Email:</span>
                <span className={styles.value}>{sol.email || "-"}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Teléfono:</span>
                <span className={styles.value}>{sol.phone || "-"}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Documento:</span>
                <span className={styles.value}>{sol.documento || "-"}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Fecha de Solicitud:</span>
                <span className={styles.value}>
                  {new Date(sol.submitted_date).toLocaleDateString("es-AR")}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Estado:</span>
                <span className={`${styles.badge} ${statusClass}`}>
                  {sol.status.charAt(0).toUpperCase() + sol.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* acciones solo si pendiente/nueva */}
          {(sol.status === "nueva" || sol.status === "pendiente") && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Acciones</h2>
              <div className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Nro. de Socio (opcional)
                  </label>
                  <input
                    type="text"
                    value={nroSocio}
                    onChange={(e) => setNroSocio(e.target.value)}
                    placeholder="Dejar vacío para auto-asignar"
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Observaciones</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={3}
                    className={styles.formTextarea}
                    placeholder="Notas internas que se guardarán en la solicitud"
                  />
                </div>

                <div className={styles.actions}>
                  <button
                    onClick={onApprove}
                    disabled={sending}
                    className={`${styles.button} ${styles.buttonPrimary}`}
                  >
                    {sending ? "Procesando..." : "Aprobar y Notificar"}
                  </button>

                  <button
                    onClick={() => setIsRejectOpen(true)}
                    className={`${styles.button} ${styles.buttonDanger}`}
                  >
                    Rechazar Solicitud
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* info adicional para estados finales */}
          {(sol.status === "aprobada" || sol.status === "rechazada") && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Información Adicional</h2>
              <div className={styles.infoGrid}>
                {sol.member_type && (
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Tipo de Socio:</span>
                    <span className={styles.value}>{sol.member_type}</span>
                  </div>
                )}
                {sol.join_date && (
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Fecha de Ingreso:</span>
                    <span className={styles.value}>
                      {new Date(sol.join_date).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                )}
                {sol.observations && (
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Observaciones:</span>
                    <span className={styles.value}>{sol.observations}</span>
                  </div>
                )}
                {sol.rejection_reason && (
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Motivo de Rechazo:</span>
                    <span className={styles.value}>{sol.rejection_reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Rechazo */}
      {isRejectOpen && (
        <div className={styles.modal} onClick={() => setIsRejectOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Rechazar Solicitud</h2>
            <p className={styles.modalDescription}>
              Indicá el motivo/observaciones del rechazo (se enviará por correo).
            </p>
            <textarea
              value={rejectObs}
              onChange={(e) => setRejectObs(e.target.value)}
              rows={4}
              className={styles.formTextarea}
              placeholder="Motivo del rechazo…"
              autoFocus
            />
            <div className={styles.modalActions}>
              <button
                onClick={() => setIsRejectOpen(false)}
                className={`${styles.button} ${styles.buttonSecondary}`}
              >
                Cancelar
              </button>
              <button
                onClick={onReject}
                className={`${styles.button} ${styles.buttonDanger}`}
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal éxito */}
      <SuccessModal
        open={isSuccess}
        onClose={() => {
          setIsSuccess(false);
          navigate("/solicitudes");
        }}
        name={sol.name}
      />
    </div>
  );
};

export default ApplicationDetail;
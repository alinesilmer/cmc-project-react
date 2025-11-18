"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
// import type { Application } from "../../../types/types";
import styles from "./ApplicationDetail.module.scss";
import SuccessModal from "../SuccessModal/SuccessModal";
import { getJSON, postJSON } from "../../../lib/http";
import BackButton from "../../../components/atoms/BackButton/BackButton";

function toAbsUrl(u?: string | null): string | null {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u; // ya es absoluta
  const path = u.startsWith("/") ? u : `/${u}`;
  return `${window.location.origin}${path}`;
}

function normalizeAttachUrls<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = { ...obj };
  for (const [k, v] of Object.entries(out)) {
    if (k.startsWith("attach_") && typeof v === "string") {
      out[k] = toAbsUrl(v);
    }
  }
  // también especialidades[].adjunto_url
  if (Array.isArray(out.especialidades)) {
    out.especialidades = out.especialidades.map((e: any) => ({
      ...e,
      adjunto_url: toAbsUrl(e?.adjunto_url ?? null),
    }));
  }
  return out as T;
}

type EspecialidadForSolicitud = {
  id_colegio?: number | null;
  n_resolucion?: string | null;
  fecha_resolucion?: string | null;
  adjunto?: string | null; // lo crudo (por si te sirve)
  adjunto_url?: string | null; // lo que vamos a usar en el botón "Ver"
  id_colegio_label?: string | null;
};

type MedicoDetailForSolicitud = {
  id: number;
  nombre: string;
  nombre_?: string | null;
  apellido?: string | null;

  // personales
  sexo?: string | null;
  tipo_doc?: string | null;
  documento?: string | null;
  cuit?: string | null;
  fecha_nac?: string | null;
  provincia?: string | null;
  localidad?: string | null;
  domicilio_particular?: string | null;
  tele_particular?: string | null;
  celular_particular?: string | null;
  codigo_postal?: string | null;

  // profesionales
  titulo?: string | null;
  fecha_recibido?: string | null;
  fecha_matricula?: string | null;
  nro_resolucion?: string | null;
  fecha_resolucion?: string | null;
  categoria?: string | null;
  matricula_prov?: string | null;
  matricula_nac?: string | null;
  especialidades?: EspecialidadForSolicitud[];

  // impositivos
  condicion_impositiva?: string | null;
  anssal?: number | null;
  vencimiento_anssal?: string | null;
  malapraxis?: string | null;
  vencimiento_malapraxis?: string | null;
  cobertura?: number | null;
  vencimiento_cobertura?: string | null;
  cbu?: string | null;
  observacion?: string | null;

  // adjuntos (ya vienen como URL relativa del back)
  attach_titulo?: string | null;
  attach_matricula_prov?: string | null;
  attach_matricula_nac?: string | null;
  attach_resolucion?: string | null;
  attach_habilitacion_municipal?: string | null;
  attach_cuit?: string | null;
  attach_condicion_impositiva?: string | null;
  attach_anssal?: string | null;
  attach_malapraxis?: string | null;
  attach_cbu?: string | null;
  attach_dni?: string | null;
};

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

async function approveSolicitud(
  id: number,
  payload: { observaciones?: string; nro_socio?: number }
) {
  return postJSON<{ ok: boolean; nro_socio: number }>(
    `/api/solicitudes/${id}/approve`,
    payload
  );
}

async function rejectSolicitud(
  id: number,
  payload: { observaciones?: string }
) {
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

  const [medico, setMedico] = useState<MedicoDetailForSolicitud | null>(null);
  const [medicoLoading, setMedicoLoading] = useState(false);
  const [medicoError, setMedicoError] = useState<string | null>(null);

  const sid = Number(id || 0);

  useEffect(() => {
    if (!sol?.medico_id) return;

    let alive = true;
    (async () => {
      try {
        setMedicoLoading(true);
        setMedicoError(null);
        const data = await getJSON<MedicoDetailForSolicitud>(
          `/api/medicos/${sol.medico_id}`
        );
        if (!alive) return;
        setMedico(normalizeAttachUrls(data));
      } catch (e: any) {
        console.error(e);
        if (alive) {
          setMedicoError("No se pudieron cargar los datos del médico.");
        }
      } finally {
        if (alive) setMedicoLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [sol?.medico_id]);

  useEffect(() => {
    if (!sid) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const data = await fetchSolicitudById(sid);
        if (!alive) return;
        setSol(data);
      } catch (e) {
        console.error(e);
        // si querés, podés mostrar un toast/error acá
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [sid]);

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
      navigate("/panel/solicitudes");
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
          <div className={styles.card__header}>
            <h1 className={styles.title}>Detalle de Solicitud</h1>
            <span className={`${styles.badge} ${statusClass}`}>
              {sol.status.charAt(0).toUpperCase() + sol.status.slice(1)}
            </span>
          </div>

          {/* info solicitante */}
          <div className={styles.section}>
            {/* <h2 className={styles.sectionTitle}>Información del Solicitante</h2> */}
            {/* <div className={styles.infoGrid}>
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
            </div> */}

            {/* ========= AGREGO SOLO DESDE ACÁ (sin tocar nada más) ========= */}
            {Boolean(sol.medico_id) && (
              <div style={{ marginTop: 24 }}>
                {/* <h3 className={styles.subTitle}>Datos del Médico</h3> */}

                {medicoLoading && (
                  <p className={styles.muted}>Cargando datos del médico…</p>
                )}
                {medicoError && <p className={styles.error}>{medicoError}</p>}

                {medico && !medicoLoading && !medicoError && (
                  <>
                    {/* ---- Datos personales ---- */}
                    <h4 className={styles.subTitle}>Datos personales</h4>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Nombre (registro):</span>
                        <span className={styles.value}>
                          {medico.nombre || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Nombre:</span>
                        <span className={styles.value}>
                          {medico.nombre_ || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Apellido:</span>
                        <span className={styles.value}>
                          {medico.apellido || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Sexo:</span>
                        <span className={styles.value}>
                          {medico.sexo || "-"}
                        </span>
                      </div>
                      {/* <div className={styles.infoItem}>
                        <span className={styles.label}>Tipo doc.:</span>
                        <span className={styles.value}>
                          {medico.tipo_doc || "-"}
                        </span>
                      </div> */}
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Documento:</span>
                        <span className={styles.value}>
                          {medico.documento || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>CUIT:</span>
                        <span className={styles.value}>
                          {medico.cuit || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>
                          Fecha de nacimiento:
                        </span>
                        <span className={styles.value}>
                          {medico.fecha_nac || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Provincia:</span>
                        <span className={styles.value}>
                          {medico.provincia || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Localidad:</span>
                        <span className={styles.value}>
                          {medico.localidad || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>
                          Domicilio particular:
                        </span>
                        <span className={styles.value}>
                          {medico.domicilio_particular || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Tel. particular:</span>
                        <span className={styles.value}>
                          {medico.tele_particular || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>
                          Celular particular:
                        </span>
                        <span className={styles.value}>
                          {medico.celular_particular || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Código Postal:</span>
                        <span className={styles.value}>
                          {medico.codigo_postal || "-"}
                        </span>
                      </div>
                    </div>

                    {/* ---- Datos profesionales ---- */}
                    <h4 className={styles.subTitle}>Datos profesionales</h4>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Título:</span>
                        <span className={styles.value}>
                          {medico.titulo || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Fecha recibido:</span>
                        <span className={styles.value}>
                          {medico.fecha_recibido || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Matrícula Prov.:</span>
                        <span className={styles.value}>
                          {medico.matricula_prov ?? "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Matrícula Nac.:</span>
                        <span className={styles.value}>
                          {medico.matricula_nac ?? "-"}
                        </span>
                      </div>
                      {(sol.status === "aprobada" ||
                        sol.status === "rechazada") && (
                        <>
                          {sol.member_type && (
                            <div className={styles.infoItem}>
                              <span className={styles.label}>
                                Tipo de Socio:
                              </span>
                              <span className={styles.value}>
                                {sol.member_type}
                              </span>
                            </div>
                          )}
                          {sol.join_date && (
                            <div className={styles.infoItem}>
                              <span className={styles.label}>
                                Fecha de Ingreso:
                              </span>
                              <span className={styles.value}>
                                {new Date(sol.join_date).toLocaleDateString(
                                  "es-AR"
                                )}
                              </span>
                            </div>
                          )}
                          {sol.observations && (
                            <div className={styles.infoItem}>
                              <span className={styles.label}>
                                Observaciones:
                              </span>
                              <span className={styles.value}>
                                {sol.observations}
                              </span>
                            </div>
                          )}
                          {sol.rejection_reason && (
                            <div className={styles.infoItem}>
                              <span className={styles.label}>
                                Motivo de Rechazo:
                              </span>
                              <span className={styles.value}>
                                {sol.rejection_reason}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {/* <div className={styles.infoItem}>
                        <span className={styles.label}>Categoría:</span>
                        <span className={styles.value}>
                          {medico.categoria || "-"}
                        </span>
                      </div> */}
                    </div>

                    {/* ---- Datos impositivos ---- */}
                    <h4 className={styles.subTitle}>Datos impositivos</h4>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>
                          Condición impositiva:
                        </span>
                        <span className={styles.value}>
                          {medico.condicion_impositiva || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>ANSSAL:</span>
                        <span className={styles.value}>
                          {medico.anssal ?? "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Venc. ANSSAL:</span>
                        <span className={styles.value}>
                          {medico.vencimiento_anssal || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Mala praxis:</span>
                        <span className={styles.value}>
                          {medico.malapraxis || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Venc. Mala praxis:</span>
                        <span className={styles.value}>
                          {medico.vencimiento_malapraxis || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Cobertura:</span>
                        <span className={styles.value}>
                          {medico.cobertura ?? "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Venc. Cobertura:</span>
                        <span className={styles.value}>
                          {medico.vencimiento_cobertura || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>CBU:</span>
                        <span className={styles.value}>
                          {medico.cbu || "-"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>Observación:</span>
                        <span className={styles.value}>
                          {medico.observacion || "-"}
                        </span>
                      </div>
                    </div>

                    {/* ---- Adjuntos ---- */}
                    <h4 className={styles.subTitle}>Adjuntos</h4>
                    <div className={styles.infoGrid}>
                      {medico.attach_titulo && (
                        <div className={styles.infoItem}>
                          <span className={styles.label}>Título adjunto:</span>
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={() =>
                              window.open(
                                medico.attach_titulo!,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            Ver
                          </button>
                        </div>
                      )}
                      {medico.attach_matricula_prov && (
                        <div className={styles.infoItem}>
                          <span className={styles.label}>
                            Matrícula Prov. adjunta:
                          </span>
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={() =>
                              window.open(
                                medico.attach_matricula_prov!,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            Ver
                          </button>
                        </div>
                      )}
                      {medico.attach_matricula_nac && (
                        <div className={styles.infoItem}>
                          <span className={styles.label}>
                            Matrícula Nac. adjunta:
                          </span>
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={() =>
                              window.open(
                                medico.attach_matricula_nac!,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            Ver
                          </button>
                        </div>
                      )}
                      {medico.attach_resolucion && (
                        <div className={styles.infoItem}>
                          <span className={styles.label}>
                            Resolución adjunta:
                          </span>
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={() =>
                              window.open(
                                medico.attach_resolucion!,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            Ver
                          </button>
                        </div>
                      )}
                      {medico.attach_habilitacion_municipal && (
                        <div className={styles.infoItem}>
                          <span className={styles.label}>
                            Habilitación municipal adjunta:
                          </span>
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={() =>
                              window.open(
                                medico.attach_habilitacion_municipal!,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            Ver
                          </button>
                        </div>
                      )}
                      {medico.attach_dni && (
                        <div className={styles.infoItem}>
                          <span className={styles.label}>
                            Adjunto documento:
                          </span>
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={() =>
                              window.open(
                                medico.attach_dni!,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            Ver
                          </button>
                        </div>
                      )}
                      {medico.attach_cuit && (
                        <div className={styles.infoItem}>
                          <span className={styles.label}>CUIT adjunto:</span>
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={() =>
                              window.open(
                                medico.attach_cuit!,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            Ver
                          </button>
                        </div>
                      )}
                      {medico.attach_condicion_impositiva && (
                        <div className={styles.infoItem}>
                          <span className={styles.label}>
                            Condición impositiva adjunta:
                          </span>
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={() =>
                              window.open(
                                medico.attach_condicion_impositiva!,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            Ver
                          </button>
                        </div>
                      )}
                      {medico.attach_anssal && (
                        <div className={styles.infoItem}>
                          <span className={styles.label}>ANSSAL adjunto:</span>
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={() =>
                              window.open(
                                medico.attach_anssal!,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            Ver
                          </button>
                        </div>
                      )}
                      {medico.attach_malapraxis && (
                        <div className={styles.infoItem}>
                          <span className={styles.label}>
                            Mala praxis adjunta:
                          </span>
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={() =>
                              window.open(
                                medico.attach_malapraxis!,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            Ver
                          </button>
                        </div>
                      )}
                      {medico.attach_cbu && (
                        <div className={styles.infoItem}>
                          <span className={styles.label}>CBU adjunto:</span>
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={() =>
                              window.open(
                                medico.attach_cbu!,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            Ver
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
                {medico?.especialidades && medico.especialidades.length > 0 && (
                  <>
                    <h4 className={styles.subTitle}>Especialidades</h4>
                    <div className={styles.infoGrid}>
                      {medico.especialidades.map((esp, idx) => (
                        <div
                          key={idx}
                          className={styles.infoItem}
                          style={{ gridColumn: "1 / -1" }}
                        >
                          <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                              <span className={styles.label}>
                                Especialidad:
                              </span>
                              <span className={styles.value}>
                                {esp.id_colegio_label ?? "-"}
                              </span>
                            </div>
                            <div className={styles.infoItem}>
                              <span className={styles.label}>
                                N° Resolución:
                              </span>
                              <span className={styles.value}>
                                {esp.n_resolucion || "-"}
                              </span>
                            </div>
                            <div className={styles.infoItem}>
                              <span className={styles.label}>
                                Fecha Resolución:
                              </span>
                              <span className={styles.value}>
                                {esp.fecha_resolucion || "-"}
                              </span>
                            </div>

                            <div className={styles.infoItem}>
                              <span className={styles.label}>Adjunto:</span>
                              {esp.adjunto_url ? (
                                <button
                                  type="button"
                                  className={styles.buttonSecondary}
                                  onClick={() =>
                                    window.open(
                                      esp.adjunto_url!,
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                >
                                  Ver
                                </button>
                              ) : (
                                <span className={styles.value}>—</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {/* ========= HASTA ACÁ ========= */}
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
        </div>
      </div>

      {/* Modal Rechazo */}
      {isRejectOpen && (
        <div className={styles.modal} onClick={() => setIsRejectOpen(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.modalTitle}>Rechazar Solicitud</h2>
            <p className={styles.modalDescription}>
              Indicá el motivo/observaciones del rechazo (se enviará por
              correo).
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
        title="Solicitud aprovada con exito"
        message="Se envió un mail al socio notificando la aprobación y los próximos pasos"
        onClose={() => {
          setIsSuccess(false);
          navigate("/panel/solicitudes");
        }}
        name={sol.name}
      />
    </div>
  );
};

export default ApplicationDetail;

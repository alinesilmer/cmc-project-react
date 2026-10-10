import { useEffect, useState } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Building2, ChevronLeft, Pencil, FileText, Mail, Phone, MapPin,
  CalendarDays, Receipt, Link2, Users, Hash, Copy, Check, Trash2, CircleCheck, TriangleAlert,
} from "lucide-react";
import { getObraSocial, deleteObraSocial } from "../obrasSociales.api";
import type { ObraSocial, Documento, ReplicacionAltaOut } from "../obrasSociales.types";
import {
  CONDICION_IVA_LABELS,
  PASO_REPLICACION_LABELS,
  TIPO_DOCUMENTO_LABELS,
  displayCuit,
} from "../obrasSociales.types";
import { OBRAS_SOCIALES_KEY } from "../useObrasSociales";
import ConfirmModal from "@/app/components/ui/ConfirmModal/ConfirmModal";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import HistorialValores from "./HistorialValores";
// «Pagos» deshabilitado a pedido del Colegio — el backend no registra su
// router (ver app/api/routes.py y el docstring de ObraSocialPago en la API).
// El componente PagosObraSocial (con su api y types) se borró; para reactivar
// la pestaña, recuperarlo del historial de git.
import { abrirAdjunto } from "@/app/shared/lib/archivos";
import { formatFechaLarga } from "@/app/shared/lib/fechas";
import { useNotify } from "../../../hooks/useNotify";
import { usePermisos } from "../../../auth/usePermisos";
import s from "./ObrasSocialesDetalle.module.scss";

type ActiveTab = "datos" | "documentos" | "historial";

// `formatFechaLarga` y no `new Date(iso).toLocaleDateString()`: la fecha de alta
// de convenio es una fecha de calendario y el parser nativo la lee como UTC,
// mostrando el día anterior. Ver src/app/lib/fechas.ts.
const formatFecha = formatFechaLarga;

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      /* Sin permiso de portapapeles: el valor igual está a la vista. */
    }
  };

  return (
    <button
      type="button"
      className={`${s.copyBtn} ${copiado ? s.copyBtnDone : ""}`}
      onClick={copiar}
      title={copiado ? "Copiado" : `Copiar ${label.toLowerCase()}`}
      aria-label={copiado ? "Copiado" : `Copiar ${label.toLowerCase()}`}
    >
      {copiado ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

// `copy`: lo que va al portapapeles cuando difiere de lo que se muestra —el CUIT
// se ve con guiones pero se copia en crudo, que es como lo piden los portales—.
// `copy={null}` desactiva el botón en las filas que no sirven para pegar afuera.
function InfoRow({ icon: Icon, label, value, copy }: { icon: React.ElementType; label: string; value?: string | null; copy?: string | null }) {
  const copiable = copy === undefined ? value : copy;
  return (
    <div className={s.infoRow}>
      <span className={s.infoIcon}><Icon size={15} /></span>
      <div className={s.infoContent}>
        <span className={s.infoLabel}>{label}</span>
        <span className={s.infoValue}>{value || "—"}</span>
      </div>
      {copiable ? <CopyButton label={label} value={copiable} /> : null}
    </div>
  );
}

function DocumentoCard({ doc }: { doc: Documento }) {
  const notify = useNotify();
  const label = doc.nombre_custom ? doc.nombre_custom : TIPO_DOCUMENTO_LABELS[doc.tipo];
  return (
    <div className={s.docCard}>
      <div className={s.docCardHeader}>
        <span className={s.docCardTipo}><FileText size={14} />{label}</span>
        <span className={s.docActiveBadge}>Activo</span>
      </div>
      <button
        type="button"
        className={s.docLink}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", textAlign: "left" }}
        onClick={() => abrirAdjunto(doc.url).catch((e) => notify.error(e.message))}
      >
        {label}
      </button>
    </div>
  );
}

// Lo que se copió de la cabecera al crear la derivada (llega por el estado de la navegación).
function ReplicacionResumen({ rep }: { rep: ReplicacionAltaOut }) {
  const hayProblemas = rep.pasos.some((p) => p.estado === "error" || p.omitidos > 0);
  return (
    <section
      className={`${s.card} ${s.cardFull} ${hayProblemas ? s.replicaAviso : s.replicaOk}`}
      role="status"
    >
      <h2 className={s.cardTitle}>
        {hayProblemas ? <TriangleAlert size={16} /> : <CircleCheck size={16} />} Replicado desde{" "}
        {rep.cabecera_nombre}
      </h2>
      <ul className={s.replicaLista}>
        {rep.pasos.map((p) => (
          <li key={p.paso}>
            <strong>{PASO_REPLICACION_LABELS[p.paso]}:</strong>{" "}
            {p.estado === "error"
              ? "no se pudo copiar."
              : `${p.creados} copiado(s)${p.ya_existian ? `, ${p.ya_existian} ya existían` : ""}${
                  p.omitidos ? `, ${p.omitidos} omitido(s)` : ""
                }.`}
            {p.detalle.length > 0 && (
              <ul>
                {p.detalle.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ObrasSocialesDetalle() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const replicacion = (location.state as { replicacion?: ReplicacionAltaOut } | null)?.replicacion;
  const { id } = useParams<{ id: string }>();
  const obraId = Number(id);

  const [obra, setObra] = useState<ObraSocial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>("datos");
  const { can } = usePermisos();
  const notify = useNotify();
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const [dandoDeBaja, setDandoDeBaja] = useState(false);

  useEffect(() => {
    if (!obraId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await getObraSocial(obraId);
        setObra(data);
      } catch {
        setError("No se pudo cargar la obra social.");
      } finally {
        setLoading(false);
      }
    })();
  }, [obraId]);

  // Baja lógica: la obra social queda con activo=false y sale de los listados y selectores.
  const darDeBaja = async () => {
    if (!obra) return;
    setDandoDeBaja(true);
    try {
      await deleteObraSocial(obra.id);
      queryClient.invalidateQueries({ queryKey: OBRAS_SOCIALES_KEY });
      notify.success(`Se eliminó la obra social ${obra.nombre}.`);
      navigate("/panel/convenios/obras-sociales");
    } catch (e) {
      notify.error(mensajeDeError(e, "No se pudo eliminar la obra social."));
      setDandoDeBaja(false);
      setConfirmarBaja(false);
    }
  };

  if (loading) {
    return (
      <div className={s.loadingPage}>
        <span className={s.spinner} />
        <p>Cargando…</p>
      </div>
    );
  }

  if (error || !obra) {
    return (
      <div className={s.container}>
        <button type="button" className={s.backBtn} onClick={() => navigate("/panel/convenios/obras-sociales")}>
          <ChevronLeft size={18} /> Volver al listado
        </button>
        <div className={s.errorBanner} role="alert">{error ?? "No se encontró la obra social."}</div>
      </div>
    );
  }

  const plazoLabel = obra.plazo_vencimiento ? `${obra.plazo_vencimiento} días` : "—";
  const dir = obra.direccion?.[0];
  const cuit = displayCuit(obra.cuit);
  const cuitDigits = (obra.cuit ?? "").replace(/\D/g, "");

  return (
    <div className={s.container}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={s.pageHeader}>
        <button type="button" className={s.backBtn} onClick={() => navigate("/panel/convenios/obras-sociales")}>
          <ChevronLeft size={18} /> Volver al listado
        </button>

        <div className={s.titleRow}>
          <div className={s.titleLeft}>
            <div className={s.titleIcon}><Building2 size={28} /></div>
            <div>
              <h1 className={s.title}>{obra.nombre}</h1>
              <p className={s.titleSub}>Nº {obra.nro_obra_social} — {obra.denominacion}</p>
            </div>
          </div>
          <div className={s.headerActions}>
            <Link to={`/panel/convenios/obras-sociales/${obra.id}/editar`} className={s.editBtn}>
              <Pencil size={15} /> Editar
            </Link>
            {obra.activo && can("catalogo:editar") && (
              <button type="button" className={s.deleteBtn} onClick={() => setConfirmarBaja(true)}>
                <Trash2 size={15} /> Eliminar
              </button>
            )}
          </div>
        </div>

        <div className={s.badgeRow}>
          {!obra.activo && <span className={s.badgeBaja}>Dada de baja</span>}
          {obra.condicion_iva && (
            <span className={obra.condicion_iva === "responsable_inscripto" ? s.badgeA : s.badgeB}>
              {CONDICION_IVA_LABELS[obra.condicion_iva]}
            </span>
          )}
          {obra.plazo_vencimiento && (
            <span className={s.badgeNeutral}>Vto. facturas: {plazoLabel}</span>
          )}
          {obra.fecha_alta_convenio && (
            <span className={s.badgeNeutral}>Alta: {formatFecha(obra.fecha_alta_convenio)}</span>
          )}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      {/* «Pagos» deshabilitado (ver la nota en los imports). «Historial de
          Valores» pide un scope aparte del resto de la pestaña —lee
          /api/valores_nm/, que exige nomenclador:leer y no catalogo:leer—, así
          que se oculta para quien no lo tiene en vez de mostrar un tab que
          siempre da error al abrirlo. Ver auditoría O-07. */}
      <div className={s.tabs}>
        {([
          { key: "datos",       label: "Datos" },
          { key: "documentos",  label: "Documentos" },
          ...(can("nomenclador:leer")
            ? [{ key: "historial", label: "Historial de Valores" }]
            : []),
        ] as { key: ActiveTab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            className={`${s.tab} ${activeTab === key ? s.tabActive : ""}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
            {activeTab === key && (
              <motion.span className={s.tabUnderline} layoutId="os-tab-underline" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Datos ──────────────────────────────────────────────────── */}
      {activeTab === "datos" && (
        <div className={s.contentGrid}>
          {/* Datos principales */}
          <section className={s.card}>
            <h2 className={s.cardTitle}>Datos principales</h2>
            <div className={s.infoGroup}>
              {cuit && <InfoRow icon={Hash} label="CUIT" value={cuit} copy={cuitDigits} />}
              {obra.direccion_real && <InfoRow icon={MapPin} label="Dirección real oficial" value={obra.direccion_real} />}
              {(obra.emails ?? []).map((e, i) => <InfoRow key={i} icon={Mail} label={e.etiqueta || "Email"} value={e.valor} />)}
              {(obra.telefonos ?? []).map((t, i) => <InfoRow key={i} icon={Phone} label={t.etiqueta || "Teléfono"} value={t.valor} />)}
              {obra.fecha_alta_convenio && <InfoRow icon={CalendarDays} label="Fecha de alta de convenio" value={formatFecha(obra.fecha_alta_convenio)} copy={null} />}
            </div>
          </section>

          {/* Facturación */}
          <section className={s.card}>
            <h2 className={s.cardTitle}>Facturación</h2>
            <div className={s.infoGroup}>
              {obra.condicion_iva && <InfoRow icon={Receipt} label="Condición de IVA" value={CONDICION_IVA_LABELS[obra.condicion_iva]} copy={null} />}
              {obra.plazo_vencimiento != null && <InfoRow icon={CalendarDays} label="Plazo de vencimiento" value={plazoLabel} copy={null} />}
              {dir && (
                <>
                  {dir.provincia && <InfoRow icon={MapPin} label="Provincia" value={dir.provincia} />}
                  {dir.localidad && <InfoRow icon={MapPin} label="Localidad" value={dir.localidad} />}
                  {dir.direccion && <InfoRow icon={MapPin} label="Dirección de envío" value={dir.direccion} />}
                  {dir.codigo_postal && <InfoRow icon={MapPin} label="Código postal" value={dir.codigo_postal} />}
                  {dir.horario && <InfoRow icon={CalendarDays} label="Horario" value={dir.horario} copy={null} />}
                </>
              )}
            </div>
          </section>

          {replicacion && <ReplicacionResumen rep={replicacion} />}

          {/* Relaciones */}
          {(obra.obra_social_principal || (obra.asociadas && obra.asociadas.length > 0)) && (
            <section className={`${s.card} ${s.cardFull}`}>
              <h2 className={s.cardTitle}><Link2 size={16} /> Relaciones</h2>
              <div className={s.relationsGrid}>
                {obra.obra_social_principal && (
                  <div className={s.relationBlock}>
                    <h3 className={s.relationLabel}>Obra Social Cabecera</h3>
                    <Link to={`/panel/convenios/obras-sociales/${obra.obra_social_principal.id}`} className={s.relationLink}>
                      <Users size={14} />{obra.obra_social_principal.denominacion}
                    </Link>
                  </div>
                )}
                {obra.asociadas && obra.asociadas.length > 0 && (
                  <div className={s.relationBlock}>
                    <h3 className={s.relationLabel}>Obras Sociales Derivadas ({obra.asociadas.length})</h3>
                    <ul className={s.asociadasList}>
                      {obra.asociadas.map((a) => (
                        <li key={a.id}>
                          <Link to={`/panel/convenios/obras-sociales/${a.id}`} className={s.relationLink}>
                            <Users size={14} />{a.denominacion}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Metadatos */}
          <section className={s.card}>
            <h2 className={s.cardTitle}>Información del registro</h2>
            <div className={s.infoGroup}>
              <InfoRow icon={CalendarDays} label="Fecha de creación" value={formatFecha(obra.created_at)} copy={null} />
              <InfoRow icon={CalendarDays} label="Última actualización" value={formatFecha(obra.updated_at)} copy={null} />
            </div>
          </section>
        </div>
      )}

      {/* ── Tab: Documentos ─────────────────────────────────────────────── */}
      {activeTab === "documentos" && (
        <div className={s.contentGrid}>
          <section className={`${s.card} ${s.cardFull}`}>
            <h2 className={s.cardTitle}><FileText size={16} /> Documentos</h2>
            {!obra.documentos || obra.documentos.length === 0 ? (
              <p className={s.emptyDocs}>
                No hay documentos cargados. Podés agregarlos desde{" "}
                <Link to={`/panel/convenios/obras-sociales/${obra.id}/editar`} className={s.inlineLink}>Editar</Link>.
              </p>
            ) : (
              <div className={s.docGrid}>
                {obra.documentos.map((doc) => <DocumentoCard key={doc.id} doc={doc} />)}
              </div>
            )}
          </section>
        </div>
      )}


      {/* ── Tab: Historial de Valores ────────────────────────────────────── */}
      {activeTab === "historial" && (
        <HistorialValores obraNro={obra.nro_obra_social} obraNombre={obra.nombre} />
      )}

      <ConfirmModal
        isOpen={confirmarBaja}
        variant="danger"
        title="Eliminar obra social"
        message={
          `Se va a dar de baja ${obra.nombre}: deja de aparecer en los listados y selectores ` +
          "(padrón, facturación, nomenclador) y no se le pueden cargar prestaciones nuevas. " +
          "No se borra ningún dato: lo ya cargado sigue visible."
        }
        confirmLabel={dandoDeBaja ? "Eliminando…" : "Sí, eliminar"}
        onConfirm={() => { if (!dandoDeBaja) void darDeBaja(); }}
        onCancel={() => { if (!dandoDeBaja) setConfirmarBaja(false); }}
      />
    </div>
  );
}

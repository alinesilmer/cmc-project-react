import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Building2,
  ChevronLeft,
  Pencil,
  FileText,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Receipt,
  Link2,
  Users,
} from "lucide-react";
import { getObraSocial } from "../obrasSociales.api";
import type { ObraSocial, Documento } from "../obrasSociales.types";
import { CONDICION_IVA_LABELS, TIPO_DOCUMENTO_LABELS } from "../obrasSociales.types";
import s from "./ObrasSocialesDetalle.module.scss";

function formatFecha(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-AR", { dateStyle: "long" });
  } catch {
    return iso;
  }
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  return (
    <div className={s.infoRow}>
      <span className={s.infoIcon} aria-hidden="true">
        <Icon size={15} />
      </span>
      <div className={s.infoContent}>
        <span className={s.infoLabel}>{label}</span>
        <span className={s.infoValue}>{value || "—"}</span>
      </div>
    </div>
  );
}

function DocumentoCard({ doc }: { doc: Documento }) {
  const label = doc.nombre_custom
    ? doc.nombre_custom
    : TIPO_DOCUMENTO_LABELS[doc.tipo];

  return (
    <div className={s.docCard}>
      <div className={s.docCardHeader}>
        <span className={s.docCardTipo}>
          <FileText size={14} aria-hidden="true" />
          {label}
        </span>
        <span className={s.docActiveBadge}>Activo</span>
      </div>
      <a
        href={doc.url}
        target="_blank"
        rel="noopener noreferrer"
        className={s.docLink}
      >
        {label}
      </a>
    </div>
  );
}

export default function ObrasSocialesDetalle() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const obraId = Number(id);

  const [obra, setObra] = useState<ObraSocial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className={s.loadingPage}>
        <span className={s.spinner} aria-hidden="true" />
        <p>Cargando…</p>
      </div>
    );
  }

  if (error || !obra) {
    return (
      <div className={s.container}>
        <button
          type="button"
          className={s.backBtn}
          onClick={() => navigate("/panel/convenios/obras-sociales")}
        >
          <ChevronLeft size={18} /> Volver al listado
        </button>
        <div className={s.errorBanner} role="alert">
          {error ?? "No se encontró la obra social."}
        </div>
      </div>
    );
  }

  const plazoLabel = obra.plazo_vencimiento ? `${obra.plazo_vencimiento} días` : "—";
  const dir = obra.direccion?.[0];

  return (
    <div className={s.container}>
      {/* Header */}
      <div className={s.pageHeader}>
        <button
          type="button"
          className={s.backBtn}
          onClick={() => navigate("/panel/convenios/obras-sociales")}
        >
          <ChevronLeft size={18} /> Volver al listado
        </button>

        <div className={s.titleRow}>
          <div className={s.titleLeft}>
            <div className={s.titleIcon} aria-hidden="true">
              <Building2 size={28} />
            </div>
            <div>
              <h1 className={s.title}>{obra.nombre}</h1>
              <p className={s.titleSub}>Nº {obra.nro_obra_social} — {obra.denominacion}</p>
            </div>
          </div>

          <Link
            to={`/panel/convenios/obras-sociales/${obra.id}/editar`}
            className={s.editBtn}
          >
            <Pencil size={15} />
            Editar
          </Link>
        </div>

        {/* Badges */}
        <div className={s.badgeRow}>
          {obra.condicion_iva && (
            <span
              className={
                obra.condicion_iva === "responsable_inscripto"
                  ? s.badgeA
                  : s.badgeB
              }
            >
              {CONDICION_IVA_LABELS[obra.condicion_iva]}
            </span>
          )}
          {obra.plazo_vencimiento && (
            <span className={s.badgeNeutral}>Vto. facturas: {plazoLabel}</span>
          )}
          {obra.fecha_alta_convenio && (
            <span className={s.badgeNeutral}>
              Alta: {formatFecha(obra.fecha_alta_convenio)}
            </span>
          )}
        </div>
      </div>

      <div className={s.contentGrid}>
        {/* ── Datos principales ── */}
        <section className={s.card}>
          <h2 className={s.cardTitle}>Datos principales</h2>
          <div className={s.infoGroup}>
            {obra.direccion_real && (
              <InfoRow
                icon={MapPin}
                label="Dirección real oficial"
                value={obra.direccion_real}
              />
            )}
            {(obra.emails ?? []).map((e, i) => (
              <InfoRow
                key={i}
                icon={Mail}
                label={e.etiqueta || "Email"}
                value={e.valor}
              />
            ))}
            {(obra.telefonos ?? []).map((t, i) => (
              <InfoRow
                key={i}
                icon={Phone}
                label={t.etiqueta || "Teléfono"}
                value={t.valor}
              />
            ))}
            {obra.fecha_alta_convenio && (
              <InfoRow
                icon={CalendarDays}
                label="Fecha de alta de convenio"
                value={formatFecha(obra.fecha_alta_convenio)}
              />
            )}
          </div>
        </section>

        {/* ── Facturación ── */}
        <section className={s.card}>
          <h2 className={s.cardTitle}>Facturación</h2>
          <div className={s.infoGroup}>
            {obra.condicion_iva && (
              <InfoRow
                icon={Receipt}
                label="Condición de IVA"
                value={CONDICION_IVA_LABELS[obra.condicion_iva]}
              />
            )}
            {obra.plazo_vencimiento != null && (
              <InfoRow
                icon={CalendarDays}
                label="Plazo de vencimiento"
                value={plazoLabel}
              />
            )}
            {dir && (
              <>
                {dir.provincia && (
                  <InfoRow icon={MapPin} label="Provincia" value={dir.provincia} />
                )}
                {dir.localidad && (
                  <InfoRow icon={MapPin} label="Localidad" value={dir.localidad} />
                )}
                {dir.direccion && (
                  <InfoRow icon={MapPin} label="Dirección de envío" value={dir.direccion} />
                )}
                {dir.codigo_postal && (
                  <InfoRow icon={MapPin} label="Código postal" value={dir.codigo_postal} />
                )}
                {dir.horario && (
                  <InfoRow icon={CalendarDays} label="Horario" value={dir.horario} />
                )}
              </>
            )}
          </div>
        </section>

        {/* ── Relaciones ── */}
        {(obra.obra_social_principal ||
          (obra.asociadas && obra.asociadas.length > 0)) && (
          <section className={`${s.card} ${s.cardFull}`}>
            <h2 className={s.cardTitle}>
              <Link2 size={16} aria-hidden="true" /> Relaciones
            </h2>
            <div className={s.relationsGrid}>
              {obra.obra_social_principal && (
                <div className={s.relationBlock}>
                  <h3 className={s.relationLabel}>Obra Social Principal</h3>
                  <Link
                    to={`/panel/convenios/obras-sociales/${obra.obra_social_principal.id}`}
                    className={s.relationLink}
                  >
                    <Users size={14} />
                    {obra.obra_social_principal.denominacion}
                  </Link>
                </div>
              )}
              {obra.asociadas && obra.asociadas.length > 0 && (
                <div className={s.relationBlock}>
                  <h3 className={s.relationLabel}>
                    Obras Sociales Asociadas ({obra.asociadas.length})
                  </h3>
                  <ul className={s.asociadasList}>
                    {obra.asociadas.map((a) => (
                      <li key={a.id}>
                        <Link
                          to={`/panel/convenios/obras-sociales/${a.id}`}
                          className={s.relationLink}
                        >
                          <Users size={14} />
                          {a.denominacion}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Documentos ── */}
        <section className={`${s.card} ${s.cardFull}`}>
          <h2 className={s.cardTitle}>
            <FileText size={16} aria-hidden="true" /> Documentos
          </h2>

          {!obra.documentos || obra.documentos.length === 0 ? (
            <p className={s.emptyDocs}>
              No hay documentos cargados. Podés agregarlos desde{" "}
              <Link
                to={`/panel/convenios/obras-sociales/${obra.id}/editar`}
                className={s.inlineLink}
              >
                Editar
              </Link>
              .
            </p>
          ) : (
            <div className={s.docGrid}>
              {obra.documentos.map((doc) => (
                <DocumentoCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </section>

        {/* ── Metadatos ── */}
        <section className={s.card}>
          <h2 className={s.cardTitle}>Información del registro</h2>
          <div className={s.infoGroup}>
            <InfoRow
              icon={CalendarDays}
              label="Fecha de creación"
              value={formatFecha(obra.created_at)}
            />
            <InfoRow
              icon={CalendarDays}
              label="Última actualización"
              value={formatFecha(obra.updated_at)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

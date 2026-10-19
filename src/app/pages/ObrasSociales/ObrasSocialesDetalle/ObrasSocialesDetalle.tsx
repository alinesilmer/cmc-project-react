import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, Pencil, FileText, Mail, Phone, MapPin, History, IdCard,
  CalendarDays, Receipt, Link2, Users, Hash, Copy, Check,
} from "lucide-react";
import { getObraSocial } from "../obrasSociales.api";
import { OBRAS_SOCIALES_KEY } from "../useObrasSociales";
import type { ObraSocial, Documento } from "../obrasSociales.types";
import { CONDICION_IVA_LABELS, TIPO_DOCUMENTO_LABELS, displayCuit } from "../obrasSociales.types";
import HistorialValores from "./HistorialValores";
// «Pagos» deshabilitado a pedido del Colegio — el backend no registra su router (ver app/api/routes.py y el docstring de ObraSocialPago en la API).
import { abrirAdjunto } from "@/app/shared/lib/archivos";
import { formatFechaLarga } from "@/app/shared/lib/fechas";
import { useNotify } from "../../../hooks/useNotify";
import { usePermisos } from "../../../auth/usePermisos";
import s from "./ObrasSocialesDetalle.module.scss";
import Button from "@/app/components/ui/Button/Button";
import Franja, { Solapa } from "@/app/components/layout/Franja/Franja";

type ActiveTab = "datos" | "documentos" | "historial";

// `formatFechaLarga` y no `new Date(iso).toLocaleDateString()`: la fecha de alta de convenio es una fecha de calendario y el parser nativo la lee como UTC.
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

// `copy`: lo que va al portapapeles cuando difiere de lo que se muestra —el CUIT se ve con guiones pero se copia en crudo.
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
        onClick={() => abrirAdjunto(doc.url).catch((e) => notify.error(e.message))}
      >
        {label}
      </button>
    </div>
  );
}

export default function ObrasSocialesDetalle() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const obraId = Number(id);

  // Cuelga de la clave del listado: lo que vence el listado (alta, edición, baja) vence también la ficha.
  const consulta = useQuery<ObraSocial>({
    queryKey: [...OBRAS_SOCIALES_KEY, "detalle", obraId],
    queryFn: () => getObraSocial(obraId),
    enabled: Boolean(obraId),
  });
  const obra = consulta.data ?? null;
  const loading = consulta.isPending;
  const error = consulta.isError ? "No se pudo cargar la obra social." : null;

  const [activeTab, setActiveTab] = useState<ActiveTab>("datos");
  const { can } = usePermisos();

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
        <Franja titulo="Obra social" icono={Building2} />
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
      {/* «Pagos» deshabilitado (ver la nota en los imports). */}
      <Franja titulo={obra.nombre} icono={Building2}>
        {(
          [
            { key: "datos", label: "Datos", Icono: IdCard },
            { key: "documentos", label: "Documentos", Icono: FileText },
            ...(can("nomenclador:leer") ? [{ key: "historial", label: "Historial", Icono: History }] : []),
          ] as { key: ActiveTab; label: string; Icono: LucideIcon }[]
        ).map(({ key, label, Icono }) => (
          <Solapa key={key} activa={activeTab === key} onClick={() => setActiveTab(key)}>
            <Icono size={18} aria-hidden="true" /> {label}
          </Solapa>
        ))}
      </Franja>

      <div className={s.barra}>
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigate(`/panel/convenios/obras-sociales/${obra.id}/editar`)}
          leftIcon={<Pencil size={18} aria-hidden="true" />}
        >
          Editar
        </Button>
      </div>

      {/* ── Tab: Datos ──────────────────────────────────────────────────── */}
      {activeTab === "datos" && (
        <div className={s.contentGrid}>
          {/* Datos principales */}
          <section className={s.card}>
            <h2 className={s.cardTitle}><IdCard size={20} aria-hidden="true" /> Datos</h2>
            <div className={s.infoGroup}>
              <InfoRow icon={Building2} label="Número" value={String(obra.nro_obra_social)} />
              {cuit && <InfoRow icon={Hash} label="CUIT" value={cuit} copy={cuitDigits} />}
              {obra.direccion_real && <InfoRow icon={MapPin} label="Dirección" value={obra.direccion_real} />}
              {(obra.emails ?? []).map((e, i) => <InfoRow key={i} icon={Mail} label={e.etiqueta || "Email"} value={e.valor} />)}
              {(obra.telefonos ?? []).map((t, i) => <InfoRow key={i} icon={Phone} label={t.etiqueta || "Teléfono"} value={t.valor} />)}
              {obra.fecha_alta_convenio && <InfoRow icon={CalendarDays} label="Alta del convenio" value={formatFecha(obra.fecha_alta_convenio)} copy={null} />}
            </div>
          </section>

          {/* Facturación */}
          <section className={s.card}>
            <h2 className={s.cardTitle}><Receipt size={20} aria-hidden="true" /> Facturación</h2>
            <div className={s.infoGroup}>
              {obra.condicion_iva && <InfoRow icon={Receipt} label="IVA" value={CONDICION_IVA_LABELS[obra.condicion_iva]} copy={null} />}
              {obra.plazo_vencimiento != null && <InfoRow icon={CalendarDays} label="Vencimiento" value={plazoLabel} copy={null} />}
              {dir && (
                <>
                  {dir.provincia && <InfoRow icon={MapPin} label="Provincia" value={dir.provincia} />}
                  {dir.localidad && <InfoRow icon={MapPin} label="Localidad" value={dir.localidad} />}
                  {dir.direccion && <InfoRow icon={MapPin} label="Envío de facturas" value={dir.direccion} />}
                  {dir.codigo_postal && <InfoRow icon={MapPin} label="Código postal" value={dir.codigo_postal} />}
                  {dir.horario && <InfoRow icon={CalendarDays} label="Horario" value={dir.horario} copy={null} />}
                </>
              )}
            </div>
          </section>

          {/* Relaciones */}
          {(obra.obra_social_principal || (obra.asociadas && obra.asociadas.length > 0)) && (
            <section className={`${s.card} ${s.cardFull}`}>
              <h2 className={s.cardTitle}><Link2 size={20} aria-hidden="true" /> Relaciones</h2>
              <div className={s.relationsGrid}>
                {obra.obra_social_principal && (
                  <div className={s.relationBlock}>
                    <h3 className={s.relationLabel}>Principal</h3>
                    <Link to={`/panel/convenios/obras-sociales/${obra.obra_social_principal.id}`} className={s.relationLink}>
                      <Users size={14} />{obra.obra_social_principal.denominacion}
                    </Link>
                  </div>
                )}
                {obra.asociadas && obra.asociadas.length > 0 && (
                  <div className={s.relationBlock}>
                    <h3 className={s.relationLabel}>Asociadas · {obra.asociadas.length}</h3>
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
            <h2 className={s.cardTitle}><CalendarDays size={20} aria-hidden="true" /> Registro</h2>
            <div className={s.infoGroup}>
              <InfoRow icon={CalendarDays} label="Creada" value={formatFecha(obra.created_at)} copy={null} />
              <InfoRow icon={CalendarDays} label="Actualizada" value={formatFecha(obra.updated_at)} copy={null} />
            </div>
          </section>
        </div>
      )}

      {/* ── Tab: Documentos ─────────────────────────────────────────────── */}
      {activeTab === "documentos" && (
        <div className={s.contentGrid}>
          <section className={`${s.card} ${s.cardFull}`}>
            <h2 className={s.cardTitle}><FileText size={20} aria-hidden="true" /> Documentos</h2>
            {!obra.documentos || obra.documentos.length === 0 ? (
              <p className={s.emptyDocs}>
                Sin documentos. Se cargan desde{" "}
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
    </div>
  );
}

import React from "react";

import { MOTIVO_ELIMINACION_LABEL } from "../types";
import type { ClaseEstadoFicha, HistorialEvento, MotivoEliminacion, PrestacionFicha } from "../types";
import { formatMoney } from "../money";
import styles from "./ConsultaPrestacion.module.scss";

// Los timestamps del historial son datetime completos: se pueden pasar por `Date`.
const fmtFechaHora = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const fmtPeriodo = (p: unknown): string => {
  const s = String(p ?? "");
  return /^\d{6}$/.test(s) ? `${s.slice(4)}/${s.slice(0, 4)}` : s || "—";
};

const motivoLabel = (codigo: string | null | undefined): string | null =>
  codigo ? MOTIVO_ELIMINACION_LABEL[codigo as MotivoEliminacion] ?? codigo : null;

const ACTOR_LABEL: Record<string, string> = {
  colegio: "Colegio",
  medico: "médico",
  sistema: "Sistema",
  os: "Obra social",
  importacion: "Importación",
};

/** "Romero, Silvia (Colegio)", o el tipo solo cuando no hay persona (obra social, sistema). */
const actorDe = (nombre?: string | null, socio?: number | null, tipo?: string | null): string => {
  const quien = nombre ?? (socio ? `Socio ${socio}` : null);
  const que = tipo ? ACTOR_LABEL[tipo] ?? tipo : null;
  if (quien && que) return `${quien} (${que})`;
  return quien ?? que ?? "—";
};

// ─── Franja de estado ───────────────────────────────────────────────────────

const TONO_FRANJA: Record<ClaseEstadoFicha, string> = {
  vigente: styles.franjaInfo,
  cerrada: styles.franjaInfo,
  liquidada: styles.franjaOk,
  eliminada_colegio: styles.franjaMal,
  eliminada_medico: styles.franjaMalSuave,
  eliminada: styles.franjaMalSuave,
  rechazada_os: styles.franjaAviso,
};

const TITULO_FRANJA: Record<ClaseEstadoFicha, string> = {
  vigente: "Vigente",
  cerrada: "Cerrada",
  liquidada: "Liquidada",
  eliminada_colegio: "Eliminada por el Colegio",
  eliminada_medico: "Eliminada por el médico",
  eliminada: "Eliminada",
  rechazada_os: "Rechazada por la O.S.",
};

export const FranjaEstado: React.FC<{ ficha: PrestacionFicha }> = ({ ficha }) => {
  const e = ficha.estado;
  const p = ficha.prestacion;

  let subtitulo: string | null = null;
  let texto: React.ReactNode = null;
  let pie: string | null = null;

  switch (e.clase) {
    case "vigente":
      subtitulo = [
        ficha.factura?.estado === "A" ? "Período abierto" : null,
        p.revisado ? "auditada" : "sin auditar",
      ].filter(Boolean).join(" · ");
      break;
    case "cerrada":
      subtitulo = "Período cerrado · lista para liquidar";
      break;
    case "liquidada":
      subtitulo = "Ya forma parte de un pago";
      break;
    case "eliminada_colegio":
      subtitulo = e.motivo_codigo ? `Motivo: ${motivoLabel(e.motivo_codigo)}` : "Sin motivo registrado";
      if (e.motivo_texto) texto = <>«{e.motivo_texto}»</>;
      break;
    case "eliminada_medico":
      subtitulo = "Sin motivo: la dio de baja desde su panel";
      if (e.respuesta_os) texto = <>La obra social ya la había rechazado: «{e.respuesta_os}»</>;
      break;
    case "eliminada":
      subtitulo = "Anterior al historial";
      texto = "No quedó registro de quién la eliminó ni por qué.";
      break;
    case "rechazada_os":
      subtitulo = "Al validar";
      if (e.respuesta_os) texto = <>Respuesta de la obra social: «{e.respuesta_os}»</>;
      pie = "El médico la ve como «Rechazada» en su panel.";
      break;
  }

  const quien = e.actor_tipo ? actorDe(e.actor_nombre, e.actor_socio, e.actor_tipo) : null;
  const cuando = e.ocurrido_en ? fmtFechaHora(e.ocurrido_en) : null;
  const firma = [quien, cuando, pie].filter(Boolean).join(" · ");

  return (
    <div className={`${styles.franja} ${TONO_FRANJA[e.clase]}`} role="status">
      <span className={styles.franjaBarra} aria-hidden="true" />
      <div className={styles.franjaCuerpo}>
        <div className={styles.franjaTitulos}>
          <span className={styles.franjaTitulo}>{TITULO_FRANJA[e.clase]}</span>
          {subtitulo && <span className={styles.franjaSubtitulo}>{subtitulo}</span>}
        </div>
        {texto && <p className={styles.franjaTexto}>{texto}</p>}
        {firma && <span className={styles.franjaFirma}>{firma}</span>}
      </div>
    </div>
  );
};

// ─── Línea de tiempo ────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  cargada: "Cargada",
  importada: "Importada",
  editada: "Editada",
  auditada: "Auditada",
  desauditada: "Desauditada",
  movida_periodo: "Movida de período",
  eliminada: "Eliminada",
  rechazada_os: "Rechazada por la O.S.",
  periodo_cerrado: "Período cerrado",
  liquidada: "Liquidada",
  liquidacion_revertida: "Liquidación revertida",
  recotizada: "Precio recalculado",
  documento_agregado: "Documento agregado",
  documento_reemplazado: "Documento reemplazado",
  documento_quitado: "Documento quitado",
};

const TONO_EVENTO: Record<string, string> = {
  eliminada: styles.tlMal,
  rechazada_os: styles.tlAviso,
  auditada: styles.tlOk,
  periodo_cerrado: styles.tlOk,
  liquidada: styles.tlOk,
  editada: styles.tlInfo,
  movida_periodo: styles.tlInfo,
  recotizada: styles.tlInfo,
};

const CAMPO_LABEL: Record<string, string> = {
  cod_med: "Médico", cod_clinica: "Clínica", cod_nom: "Código", nomenclador_id: "Nomenclador",
  fecha_practica: "Fecha de práctica", dni_p: "Identificador del paciente", nom_ape_p: "Paciente",
  autorizacion: "Autorización", nro_orden: "Nro de orden", cantidad: "Cantidad", sesion: "Sesiones",
  porc: "Porcentaje", via: "Vía", tipo: "Tipo", manual: "Cálculo", honorarios: "Honorarios",
  gastos: "Gastos", ayudante: "Ayudante", coseguro: "Coseguro", importe_total: "Total",
  cod_obr: "Obra social", periodo: "Período", version: "Versión", grupo_equipo_id: "Equipo",
  sin_valorizar: "Sin valorizar", archivo: "Archivo",
};

const CAMPOS_PLATA = new Set(["honorarios", "gastos", "ayudante", "coseguro", "importe_total"]);

const fmtValor = (campo: string, v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (CAMPOS_PLATA.has(campo)) return formatMoney(String(v));
  if (campo === "periodo") return fmtPeriodo(v);
  if (campo === "porc") return `${v} %`;
  if (campo === "manual") return v === "M" ? "Manual" : "Automático";
  return String(v);
};

const MOTIVO_RECALCULO: Record<string, string> = {
  recalculo: "Recálculo de precios de la factura",
  revalorizacion: "Revalorización del código",
};

function detalleDe(ev: HistorialEvento): React.ReactNode[] {
  const lineas: React.ReactNode[] = [];
  const ctx = ev.contexto ?? {};

  if (ev.tipo === "rechazada_os") {
    if (ev.motivo_texto) lineas.push(<>La obra social respondió: «{ev.motivo_texto}»</>);
  } else if (ev.tipo === "recotizada") {
    const m = ev.motivo_codigo ? MOTIVO_RECALCULO[ev.motivo_codigo] ?? ev.motivo_codigo : null;
    if (m) lineas.push(m);
  } else if (ev.tipo === "importada") {
    if (ctx.importador) lineas.push(`Importador: ${String(ctx.importador)}`);
    if (ev.motivo_texto) lineas.push(<>Quedó fuera de factura: «{ev.motivo_texto}»</>);
  } else if (ev.motivo_codigo || ev.motivo_texto) {
    const label = motivoLabel(ev.motivo_codigo);
    lineas.push(
      <>
        {label && <>Motivo: <strong>{label}</strong></>}
        {label && ev.motivo_texto && " — "}
        {ev.motivo_texto && <>«{ev.motivo_texto}»</>}
      </>,
    );
  } else if (ev.tipo === "eliminada" && ev.actor_tipo === "medico") {
    lineas.push("Desde su panel de validaciones.");
  }

  if (ctx.arrastrada_por) lineas.push(`Junto con su equipo (ID ${String(ctx.arrastrada_por)}).`);
  if (ctx.archivo && ev.tipo !== "documento_reemplazado") lineas.push(String(ctx.archivo));
  if (ev.tipo === "periodo_cerrado") {
    const factura = [ctx.tipo_factura, ctx.nro_factura].filter(Boolean).join(" ");
    lineas.push(`Factura #${String(ctx.factura_id ?? "—")}${factura ? ` · ${factura}` : ""}`);
  }
  if (ev.tipo === "liquidada" || ev.tipo === "liquidacion_revertida") {
    if (ctx.pago_id) lineas.push(`Pago #${String(ctx.pago_id)}`);
  }
  if (ev.tipo === "cargada" && ctx.origen === "validaciones") lineas.push("Desde el panel de validaciones.");

  return lineas;
}

const Cambios: React.FC<{ cambios: Record<string, [unknown, unknown]> }> = ({ cambios }) => (
  <ul className={styles.tlCambios}>
    {Object.entries(cambios).map(([campo, [antes, despues]]) => (
      <li key={campo}>
        <span className={styles.tlCampo}>{CAMPO_LABEL[campo] ?? campo}:</span>{" "}
        {fmtValor(campo, antes)} → <strong>{fmtValor(campo, despues)}</strong>
      </li>
    ))}
  </ul>
);

export const LineaDeTiempo: React.FC<{ ficha: PrestacionFicha }> = ({ ficha }) => {
  const eventos = ficha.historial;
  // Las filas anteriores al historial no tienen su alta: se arma con lo que dice la fila.
  const tieneAlta = eventos.some((e) => e.tipo === "cargada" || e.tipo === "importada");
  const p = ficha.prestacion;

  return (
    <ol className={styles.tl}>
      {eventos.map((ev) => {
        const detalle = detalleDe(ev);
        return (
          <li key={ev.id} className={`${styles.tlItem} ${TONO_EVENTO[ev.tipo] ?? ""}`}>
            <span className={styles.tlTitulo}>
              {TIPO_LABEL[ev.tipo] ?? ev.tipo}
              {ev.fuente === "reconstruido" && <span className={styles.tlMarca}>reconstruido</span>}
            </span>
            {detalle.map((d, i) => <span key={i} className={styles.tlDetalle}>{d}</span>)}
            {ev.cambios && Object.keys(ev.cambios).length > 0 && <Cambios cambios={ev.cambios} />}
            <span className={styles.tlFirma}>
              {actorDe(ev.actor_nombre, ev.actor_socio, ev.actor_tipo)} · {fmtFechaHora(ev.ocurrido_en)}
            </span>
          </li>
        );
      })}
      {!tieneAlta && (
        <li className={styles.tlItem}>
          <span className={styles.tlTitulo}>
            Cargada <span className={styles.tlMarca}>según la fila</span>
          </span>
          <span className={styles.tlFirma}>
            {ficha.cargado_por?.nombre ?? (p.usuario ? `Socio ${p.usuario}` : "—")} · {fmtFechaHora(p.created)}
          </span>
        </li>
      )}
    </ol>
  );
};

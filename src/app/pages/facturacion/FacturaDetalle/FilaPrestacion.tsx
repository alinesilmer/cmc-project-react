import React from "react";
import { Pencil, Copy, ArrowRightCircle, ArrowLeftCircle, Trash2 } from "lucide-react";

import type { PrestacionFacturaDetalle, Tipo } from "../types";
import { TIPO_ABREV, TIPO_LABEL, TIPO_PRESTADOR_ABREV } from "../constants";
import { formatMoney, parseMoney } from "../money";
import type { ColumnaVista } from "./vista/types";
import styles from "./FacturaDetalle.module.scss";

// La prestación "aplanada" con los datos de su socio ya resueltos — se arma una
// sola vez a partir de `detalle.prestadores` y es la base de todo el pipeline
// de vista (filtrar → agrupar → ordenar), en vez de depender de la agrupación
// por-socio que ya viene armada del backend.
export interface PrestacionConSocio extends PrestacionFacturaDetalle {
  cod_medico: string;
  nombreSocio: string | null;
  matriculaSocio: number | null;
}

// Acciones de una fila. El padre pasa SIEMPRE el mismo objeto (ver `acciones` en
// FacturaDetalle.tsx): así `React.memo` puede saltear las filas que no cambiaron.
export interface FilaAcciones {
  onToggleRevisado: (p: PrestacionConSocio) => void;
  onEditar: (p: PrestacionConSocio) => void;
  onReplicar: (p: PrestacionConSocio) => void;
  onMover: (p: PrestacionConSocio, direccion: "siguiente" | "anterior") => void;
  onEliminar: (p: PrestacionConSocio) => void;
}

const fmtFecha = (iso: string | null): string => {
  if (!iso) return "—";
  // `new Date("2026-11-01")` parsea las date-only como medianoche UTC, y al mostrarlas
  // en hora local (AR = UTC-3) retroceden un día. Las fechas de la API (`fecha_practica`,
  // `fecha`) son columnas DATE, así que se formatean sin pasar por Date.
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const tipoPrestadorClass = (t: string | null): string => {
  switch (t) {
    case "Medico":   return styles.tipoPrestadorMedico;
    case "Ayudante": return styles.tipoPrestadorAyudante;
    case "Gastos":   return styles.tipoPrestadorGastos;
    case "Pediatra": return styles.tipoPrestadorPediatra;
    default:         return "";
  }
};

const tipoClass = (t: Tipo | null): string => {
  switch (t) {
    case "Consulta":               return styles.tipoConsulta;
    case "Practica":               return styles.tipoPractica;
    case "Honorarios individuales": return styles.tipoHonorarios;
    case "Sanatorio":              return styles.tipoSanatorio;
    default:                       return "";
  }
};

const viaLabel = (v: string | null | undefined): string =>
  v === "L" ? "Laparoscópica" : v === "T" ? "Tradicional" : "";

const muted = <span className={styles.mutedText}>—</span>;

const renderCelda = (p: PrestacionConSocio, col: ColumnaVista) => {
  switch (col) {
    case "autorizacion":
      return <td key={col}>{p.autorizacion || muted}</td>;
    case "fecha":
      return <td key={col}>{fmtFecha(p.fecha_practica)}</td>;
    case "codigo":
      return <td key={col}><span className={styles.codeCell}>{p.codigo ?? "—"}</span></td>;
    case "via":
      return (
        <td key={col}>
          {p.via ? (
            <span
              className={`${styles.viaBadge} ${p.via === "L" ? styles.viaLaparoscopica : ""}`}
              title={viaLabel(p.via)}
            >
              {p.via}
            </span>
          ) : muted}
        </td>
      );
    case "nro_afiliado":
      return <td key={col}>{p.nro_afiliado || muted}</td>;
    case "paciente":
      return <td key={col}>{p.nombre_paciente || muted}</td>;
    case "cantidad":
      return (
        <td key={col}>
          <div className={styles.cantidadCell}>
            <span className={styles.cantidadMain}>Cant. {p.cantidad ?? "—"}</span>
            <span className={styles.cantidadSub}>Sesión {p.sesion ?? "—"}</span>
          </div>
        </td>
      );
    case "porcentaje":
      return <td key={col}>{p.porcentaje != null ? `${p.porcentaje}%` : "—"}</td>;
    case "honorarios":
      // En la fila del ayudante se muestra lo que cobra (se guarda en `ayudante`, con
      // honorarios en 0): así la columna cuadra con el total de la fila.
      return (
        <td key={col}>
          <span className={styles.moneyCell}>
            {formatMoney(p.tipo_prestador === "Ayudante" ? p.ayudante : p.honorarios)}
          </span>
        </td>
      );
    case "gastos":
      return <td key={col}><span className={styles.moneyCell}>{formatMoney(p.gastos)}</span></td>;
    case "tipo_prestador":
      return (
        <td key={col}>
          {p.tipo_prestador ? (
            <span
              className={`${styles.tipoPrestadorBadge} ${tipoPrestadorClass(p.tipo_prestador)}`}
              title={p.tipo_prestador}
            >
              {TIPO_PRESTADOR_ABREV[p.tipo_prestador] ?? p.tipo_prestador}
            </span>
          ) : muted}
        </td>
      );
    case "coseguro":
      return <td key={col}><span className={styles.moneyCell}>{formatMoney(p.coseguro)}</span></td>;
    case "valor_unitario":
      // Honorarios + gastos − coseguro (el total es esto × cantidad × sesión); el
      // ayudante cobra un único monto aparte.
      return (
        <td key={col}>
          {p.tipo_prestador === "Ayudante"
            ? muted
            : <span className={styles.moneyCell}>{formatMoney(parseMoney(p.honorarios) + parseMoney(p.gastos) - parseMoney(p.coseguro))}</span>}
        </td>
      );
    case "subtotal":
      return <td key={col}><span className={styles.subtotalCell}>{formatMoney(p.subtotal)}</span></td>;
    case "tipo":
      return (
        <td key={col}>
          {p.tipo ? (
            <span className={`${styles.tipoBadge} ${tipoClass(p.tipo)}`} title={TIPO_LABEL[p.tipo] ?? p.tipo}>
              {TIPO_ABREV[p.tipo] ?? p.tipo}
            </span>
          ) : muted}
        </td>
      );
    default:
      return null;
  }
};

interface Props {
  p: PrestacionConSocio;
  columnas: ColumnaVista[];
  acciones: FilaAcciones;
  busy: boolean;
  // Un complemento (version > 1) es una factura para un período ya cerrado y enviado:
  // mover sus prestaciones a otro período no tiene sentido, así que se ocultan esos botones.
  esComplemento: boolean;
  // Integrante del equipo, indentado bajo la cabeza (es una fila completa, con sus acciones).
  indent?: boolean;
  ultimoDelEquipo?: boolean;
  equipoHead?: boolean;
  // La clínica (si la hay) va como etiqueta en la celda del socio. En las prestaciones de
  // tipo Sanatorio no: ahí la clínica es un subtítulo naranja que agrupa las filas.
  clinicaInline?: boolean;
  // Clases extra para la fila.
  className?: string;
}

function FilaPrestacion({
  p, columnas, acciones, busy, esComplemento, indent, ultimoDelEquipo, equipoHead, clinicaInline, className,
}: Props) {
  const editable = p.estado === "A";
  const tituloMover = (txt: string) => (p.revisado ? "Está marcada: desmarcala para moverla" : txt);
  return (
    <tr
      className={[
        styles.dataRow,
        p.revisado ? styles.rowRevisada : "",
        p.estado === "X" ? styles.rowAnulada : "",
        indent ? styles.equipoPreviewRow : "",
        ultimoDelEquipo ? styles.equipoPreviewRowLast : "",
        equipoHead ? styles.equipoGrupoHeadRow : "",
        className ?? "",
      ].filter(Boolean).join(" ")}
    >
      <td className={styles.idCell}>{p.id}</td>
      <td>
        <div className={styles.socioCell}>
          <span className={styles.socioNro}>
            {p.cod_medico}
            {p.matriculaSocio != null && <span className={styles.socioMatricula}> - {p.matriculaSocio}</span>}
          </span>
          <span className={styles.socioNombre}>{p.nombreSocio ?? "—"}</span>
          {clinicaInline && p.cod_clinica != null && p.tipo !== "Sanatorio" && (
            <span className={styles.clinicaTag}>Clínica {p.nombre_clinica ?? p.cod_clinica}</span>
          )}
        </div>
      </td>
      {columnas.map((c) => renderCelda(p, c))}
      <td>
        {(
          <div className={styles.actionsCell}>
            <span className={`${styles.auditCheckboxWrap} ${p.revisado ? styles.auditCheckboxOn : ""}`}>
              <input
                type="checkbox"
                className={styles.auditCheckbox}
                checked={p.revisado}
                onChange={() => acciones.onToggleRevisado(p)}
                title="Marcar como auditado"
              />
            </span>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnEdit}`}
              title="Editar"
              disabled={!editable || busy}
              onClick={() => acciones.onEditar(p)}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              title="Replicar carga"
              disabled={busy}
              onClick={() => acciones.onReplicar(p)}
            >
              <Copy size={14} />
            </button>
            {!esComplemento && (
              <>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.iconBtnMove}`}
                  title={tituloMover("Mover al período anterior")}
                  disabled={!editable || busy || p.revisado}
                  onClick={() => acciones.onMover(p, "anterior")}
                >
                  <ArrowLeftCircle size={15} />
                </button>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.iconBtnMove}`}
                  title={tituloMover("Mover al período siguiente")}
                  disabled={!editable || busy || p.revisado}
                  onClick={() => acciones.onMover(p, "siguiente")}
                >
                  <ArrowRightCircle size={15} />
                </button>
              </>
            )}
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
              title="Eliminar"
              disabled={!editable || busy}
              onClick={() => acciones.onEliminar(p)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// Con cientos/miles de filas, re-renderizar todas por cada tilde o acción era lo que
// trababa la pantalla: cada fila se vuelve a dibujar sólo si cambian sus props.
export default React.memo(FilaPrestacion);

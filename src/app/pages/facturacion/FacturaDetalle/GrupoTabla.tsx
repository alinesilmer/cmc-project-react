import React from "react";
import { ArrowRightCircle, ArrowLeftCircle } from "lucide-react";

import { formatMoney } from "../money";
import type { ColumnaVista } from "./vista/types";
import { RESUMEN_TIPO_LABEL, totalesPorTipo } from "./totales";
import FilaPrestacion from "./FilaPrestacion";
import type { FilaAcciones, PrestacionConSocio } from "./FilaPrestacion";
import styles from "./FacturaDetalle.module.scss";

export interface VistaGrupo {
  key: string;
  titulo: string;
  prestaciones: PrestacionConSocio[];
  mostrarResumen: boolean;
  // Sólo en "Por socio": encabezado "Clínicas / Sanatorios" antes de la primera
  // clínica, y tramos con subtítulo (Consultas / Prácticas / Honorarios
  // individuales) dentro de cada médico.
  bloque?: string;
  esClinica?: boolean;
  tramos?: { key: string; subtitulo: string; prestaciones: PrestacionConSocio[] }[];
  // Compañeros de equipo de cada cabeza del grupo (id cabeza → compañeros), resueltos
  // por el padre para que el grupo no dependa del mapa de equipos de toda la factura.
  companeros?: Record<number, PrestacionConSocio[]>;
  totalHonorarios: number;
  totalGastos: number;
  totalSubtotal: number;
}

export interface GrupoAcciones {
  onMarcarTodos: (g: VistaGrupo) => void;
  onDesmarcarTodos: (g: VistaGrupo) => void;
  onMoverGrupo: (g: VistaGrupo, direccion: "siguiente" | "anterior") => void;
}

// Filas por bloque. Cada bloque es una <table> propia con `content-visibility: auto`
// (ver `.bloqueFilas` en el SCSS): el navegador sólo calcula y pinta los bloques que
// están en pantalla, pero todas las filas siguen en la página (el Ctrl+F las
// encuentra). Todas las tablas usan el mismo <colgroup> y `table-layout: fixed`,
// así que las columnas quedan alineadas entre bloques.
const FILAS_POR_BLOQUE = 40;

interface Props {
  g: VistaGrupo;
  columnas: ColumnaVista[];
  // Ancho (%) de cada columna, incluidas ID, Socio y Acciones.
  anchos: number[];
  acciones: FilaAcciones;
  accionesGrupo: GrupoAcciones;
  // Ids ocupados DE ESTE grupo (el mismo Set vacío si no hay): así una acción en
  // otro grupo no invalida el memo de este.
  busyIds: ReadonlySet<number>;
  grupoBusy: boolean;
  esComplemento: boolean;
  esPorSocio: boolean;
  agruparEquipo: boolean;
}

function GrupoTabla({
  g, columnas, anchos, acciones, accionesGrupo, busyIds, grupoBusy, esComplemento, esPorSocio, agruparEquipo,
}: Props) {
  const colSpan = anchos.length;

  const fila = (
    p: PrestacionConSocio,
    opts?: { indent?: boolean; key?: string; ultimoDelEquipo?: boolean; equipoHead?: boolean; clinicaInline?: boolean },
  ) => (
    <FilaPrestacion
      key={opts?.key ?? p.id}
      p={p}
      columnas={columnas}
      acciones={acciones}
      busy={busyIds.has(p.id)}
      esComplemento={esComplemento}
      indent={opts?.indent}
      ultimoDelEquipo={opts?.ultimoDelEquipo}
      equipoHead={opts?.equipoHead}
      clinicaInline={opts?.clinicaInline}
    />
  );

  // Cada prestación cabeza de equipo arrastra, indentadas justo debajo, filas de
  // solo lectura con el detalle de sus compañeros (ayudante/gastos) — sin afectar el
  // subtotal del grupo. Cada compañero tiene además su fila interactiva en su grupo.
  const filaConEquipo = (p: PrestacionConSocio, clinicaInline = false): React.ReactNode[] => {
    const companeros = agruparEquipo ? g.companeros?.[p.id] : undefined;
    if (!companeros || companeros.length === 0) return [fila(p, { clinicaInline })];
    return [
      fila(p, { equipoHead: true, clinicaInline }),
      ...companeros.map((m, i) => fila(m, {
        indent: true, key: `${p.id}-eq-${m.id}`, ultimoDelEquipo: i === companeros.length - 1,
      })),
    ];
  };

  // Prestaciones consecutivas de una misma clínica se enmarcan bajo un encabezado
  // naranja con su nombre; el marco engloba también las filas de equipo de cada una.
  const filasConClinica = (prestaciones: PrestacionConSocio[]): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    let i = 0;
    while (i < prestaciones.length) {
      const cod = prestaciones[i].cod_clinica;
      if (!cod) {
        out.push(...filaConEquipo(prestaciones[i]));
        i += 1;
        continue;
      }
      let j = i;
      while (j < prestaciones.length && prestaciones[j].cod_clinica === cod) j += 1;
      const filas = prestaciones.slice(i, j).flatMap((p) => filaConEquipo(p));
      out.push(
        <tr key={`clinica-${prestaciones[i].id}`} className={styles.clinicaHeadRow}>
          <td colSpan={colSpan}>Clínica {prestaciones[i].nombre_clinica ?? cod}</td>
        </tr>,
      );
      filas.forEach((f, k) => {
        if (!React.isValidElement<{ className?: string }>(f)) { out.push(f); return; }
        const cls = [f.props.className, styles.clinicaRow, k === filas.length - 1 ? styles.clinicaRowLast : ""]
          .filter(Boolean).join(" ");
        out.push(React.cloneElement(f, { className: cls }));
      });
      i = j;
    }
    return out;
  };

  // "Por socio": encabezado "Clínicas / Sanatorios" (antes de la primera clínica), fila
  // de título del socio (naranja si es una clínica) y, en los médicos, un subtítulo por tramo.
  const filasPorSocio = (): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    if (g.bloque) {
      out.push(<tr key={`bloque-${g.key}`} className={styles.bloqueRow}><td colSpan={colSpan}>{g.bloque}</td></tr>);
    }
    out.push(
      <tr key={`titulo-${g.key}`} className={g.esClinica ? styles.clinicaHeadRow : styles.socioTituloRow}>
        <td colSpan={colSpan}>{g.titulo}</td>
      </tr>,
    );
    for (const t of g.tramos ?? [{ key: "todas", subtitulo: "", prestaciones: g.prestaciones }]) {
      if (t.subtitulo) {
        out.push(<tr key={`tramo-${g.key}-${t.key}`} className={styles.tramoRow}><td colSpan={colSpan}>{t.subtitulo}</td></tr>);
      }
      out.push(...t.prestaciones.flatMap((p) => filaConEquipo(p, true)));
    }
    return out;
  };

  const resumen = (
    <tr key={`resumen-${g.key}`} className={styles.resumenRow}>
      <td colSpan={colSpan}>
        <div className={styles.resumenContent}>
          <span className={styles.resumenLabel}>RESUMEN: {g.titulo}</span>
          {totalesPorTipo(g.prestaciones).map((t) => (
            <span key={t.tipo} className={styles.resumenMoney}>
              {RESUMEN_TIPO_LABEL[t.tipo]} ({t.cantidad}): <strong>{formatMoney(t.total)}</strong>
            </span>
          ))}
          <div className={styles.resumenActions}>
            <button type="button" className={styles.resumenActionBtn} disabled={grupoBusy}
              onClick={() => accionesGrupo.onMarcarTodos(g)}>
              Marcar todos
            </button>
            <button type="button" className={styles.resumenActionBtn} disabled={grupoBusy}
              onClick={() => accionesGrupo.onDesmarcarTodos(g)}>
              Desmarcar todos
            </button>
            {!esComplemento && esPorSocio && (
              <>
                <button type="button" className={styles.resumenActionBtn} disabled={grupoBusy}
                  onClick={() => accionesGrupo.onMoverGrupo(g, "siguiente")}>
                  <ArrowRightCircle size={12} /> Siguiente período todos
                </button>
                <button type="button" className={styles.resumenActionBtn} disabled={grupoBusy}
                  onClick={() => accionesGrupo.onMoverGrupo(g, "anterior")}>
                  <ArrowLeftCircle size={12} /> Anterior período todos
                </button>
              </>
            )}
          </div>
          <span className={styles.resumenTotalBadge}>Total: {formatMoney(g.totalSubtotal)}</span>
        </div>
      </td>
    </tr>
  );

  const filas = esPorSocio ? filasPorSocio() : filasConClinica(g.prestaciones);
  if (g.mostrarResumen) filas.push(resumen);

  const colgroup = <colgroup>{anchos.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>;
  const bloques: React.ReactNode[] = [];
  for (let i = 0; i < filas.length; i += FILAS_POR_BLOQUE) {
    bloques.push(
      <div key={i} className={styles.bloqueFilas}>
        <table className={styles.table}>
          {colgroup}
          <tbody>{filas.slice(i, i + FILAS_POR_BLOQUE)}</tbody>
        </table>
      </div>,
    );
  }
  return <>{bloques}</>;
}

// Un grupo sólo se vuelve a dibujar si cambió algo suyo (sus filas, su estado de
// "ocupado", las columnas). Abrir un panel o tildar una fila de otro socio no lo toca.
export default React.memo(GrupoTabla);

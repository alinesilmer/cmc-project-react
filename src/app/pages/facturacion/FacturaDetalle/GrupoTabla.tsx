import React from "react";
import { ArrowRightCircle, ArrowLeftCircle } from "lucide-react";

import { formatMoney } from "../money";
import type { Tipo } from "../types";
import type { ColumnaVista, OrdenAlfabetico } from "./vista/types";
import { RESUMEN_TIPO_LABEL, sumaEquipo, sumarTotales, totalesPorTipo } from "./totales";
import { clavePaciente } from "./equipo";
import FilaPrestacion from "./FilaPrestacion";
import type { FilaAcciones, PrestacionConSocio } from "./FilaPrestacion";
import styles from "./FacturaDetalle.module.scss";

export interface VistaGrupo {
  key: string;
  titulo: string;
  // Prestaciones que se dibujan como línea propia del grupo.
  prestaciones: PrestacionConSocio[];
  // Todo lo que cuenta en el grupo: las de arriba + el equipo anidado bajo cada cabeza
  // (`companeros`). Los totales, "Marcar todos" y "Mover todos" se calculan sobre esto.
  miembros: PrestacionConSocio[];
  // Lo que suma a los totales del grupo: `miembros` menos el equipo de las cirugías de
  // Honorarios individuales y Sanatorios (se muestra, pero no suma al médico).
  sumables: PrestacionConSocio[];
  mostrarResumen: boolean;
  // "Por tipo": subtítulo de la sección (Consultas, Prácticas…) y subtotal al cerrar
  // las filas de cada médico.
  subtitulo?: string;
  subtotalPorMedico?: boolean;
  // "Por tipo", sólo Honorarios individuales y Sanatorios: el selector de orden (médico /
  // paciente A-Z) que se dibuja una única vez en el subtítulo de la sección.
  ordenAlfabetico?: { tipo: Tipo; valor: OrdenAlfabetico };
  // "Por socio": tramos con subtítulo (Consultas / Prácticas / Honorarios
  // individuales / Sanatorios) dentro de cada médico.
  tramos?: { key: string; subtitulo: string; prestaciones: PrestacionConSocio[] }[];
  // Equipo de cada cabeza del grupo (id cabeza → integrantes), resuelto por el padre. Sólo
  // se dibuja acá, anidado bajo la cabeza: no aparece como línea propia en su socio.
  companeros?: Record<number, PrestacionConSocio[]>;
  totalHonorarios: number;
  totalGastos: number;
  totalSubtotal: number;
}

export interface GrupoAcciones {
  onMarcarTodos: (g: VistaGrupo) => void;
  onDesmarcarTodos: (g: VistaGrupo) => void;
  onMoverGrupo: (g: VistaGrupo, direccion: "siguiente" | "anterior") => void;
  onOrdenAlfabetico: (tipo: Tipo, valor: OrdenAlfabetico) => void;
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
}

function GrupoTabla({
  g, columnas, anchos, acciones, accionesGrupo, busyIds, grupoBusy, esComplemento, esPorSocio,
}: Props) {
  const colSpan = anchos.length;
  // El subtítulo con el nombre de la clínica va en "Por socio" y "Por tipo" (no en la planilla plana).
  const subtituloClinica = esPorSocio || Boolean(g.subtotalPorMedico);

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

  // Cada cabeza de equipo arrastra, indentadas justo debajo, las filas de su equipo
  // (ayudante/gastos/pediatra). Es el único lugar donde aparecen: no se repiten en su
  // propio socio. Son filas completas (se tildan, editan y mueven como cualquier otra).
  const filaConEquipo = (p: PrestacionConSocio): React.ReactNode[] => {
    const companeros = g.companeros?.[p.id];
    if (!companeros || companeros.length === 0) return [fila(p, { clinicaInline: true })];
    return [
      fila(p, { equipoHead: true, clinicaInline: true }),
      ...companeros.map((m, i) => fila(m, {
        indent: true, key: `${p.id}-eq-${m.id}`, ultimoDelEquipo: i === companeros.length - 1, clinicaInline: true,
      })),
    ];
  };

  // Filas de una lista de prestaciones. En "Por socio"/"Por tipo", cuando cambia la clínica
  // de las prestaciones de tipo Sanatorio se intercala un subtítulo (naranja) con su nombre.
  // Con `porPaciente` (lista ordenada por paciente) cada paciente lleva su subtítulo celeste
  // y, con `totalPaciente`, al terminar sus filas una línea con lo que suma (equipo incluido).
  const filasDe = (
    prestaciones: PrestacionConSocio[], keyBase: string,
    opts?: { porPaciente?: boolean; totalPaciente?: boolean },
  ): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    let clinicaPrevia: number | null | undefined;
    let pacientePrevio: string | undefined;
    let bloque: PrestacionConSocio[] = [];
    const cerrarPaciente = () => {
      if (opts?.totalPaciente && bloque.length > 0) {
        const cabeza = bloque[0];
        out.push(
          <tr key={`total-paciente-${keyBase}-${cabeza.id}`} className={styles.totalPacienteRow}>
            <td colSpan={colSpan}>
              <div className={styles.subtotalMedicoContent}>
                <span>Total paciente {cabeza.nombre_paciente ?? clavePaciente(cabeza)}</span>
                <span className={styles.subtotalMedicoMontos}>
                  <span>Total: <strong>{formatMoney(sumarTotales(bloque).totalSubtotal)}</strong></span>
                </span>
              </div>
            </td>
          </tr>,
        );
      }
      bloque = [];
    };
    for (const p of prestaciones) {
      // Nombre y número, como los ordena `porPacienteAZ`: así las filas de un paciente
      // siempre quedan en un solo bloque. Un paciente en otra clínica es otro bloque.
      const clavePac = opts?.porPaciente
        ? [p.nombre_paciente, p.nro_afiliado, p.tipo === "Sanatorio" ? p.cod_clinica : ""]
            .map((v) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ")).join("|")
        : undefined;
      const cambioPaciente = clavePac !== undefined && clavePac !== pacientePrevio;
      if (cambioPaciente) cerrarPaciente();
      if (subtituloClinica && p.tipo === "Sanatorio") {
        const cod = p.cod_clinica ?? null;
        if (cod !== clinicaPrevia) {
          clinicaPrevia = cod;
          if (cod) {
            out.push(
              <tr key={`clinica-${keyBase}-${p.id}`} className={styles.clinicaSubtituloRow}>
                <td colSpan={colSpan}>Clínica {p.nombre_clinica ?? cod}</td>
              </tr>,
            );
          }
        }
      } else {
        clinicaPrevia = undefined;
      }
      if (cambioPaciente) {
        pacientePrevio = clavePac;
        out.push(
          <tr key={`paciente-${keyBase}-${p.id}`} className={styles.pacienteSubtituloRow}>
            <td colSpan={colSpan}>Paciente {p.nombre_paciente ?? clavePaciente(p)}</td>
          </tr>,
        );
      }
      out.push(...filaConEquipo(p));
      bloque.push(p, ...(g.companeros?.[p.id] ?? []));
    }
    cerrarPaciente();
    return out;
  };

  // Lista plana / "Por tipo": filas en el orden recibido. Con `subtotalPorMedico`, un
  // subtítulo arriba y, al terminar las filas de cada médico, su subtotal antes de pasar
  // al siguiente.
  const filasListado = (): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    if (g.subtitulo) {
      const orden = g.ordenAlfabetico;
      out.push(
        <tr key={`subtitulo-${g.key}`} className={styles.tipoTituloRow}>
          <td colSpan={colSpan}>
            <div className={styles.tipoTituloContent}>
              <span>{g.subtitulo}</span>
              {orden && (
                <span className={styles.ordenAlfaGroup} role="group" aria-label={`Orden de ${g.subtitulo}`}>
                  {([["medico", "Médico A-Z"], ["paciente", "Paciente A-Z"]] as const).map(([valor, etiqueta]) => (
                    <button
                      key={valor}
                      type="button"
                      className={`${styles.ordenAlfaBtn} ${orden.valor === valor ? styles.ordenAlfaBtnOn : ""}`}
                      onClick={() => accionesGrupo.onOrdenAlfabetico(orden.tipo, valor)}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </span>
              )}
            </div>
          </td>
        </tr>,
      );
    }
    const ps = g.prestaciones;
    let i = 0;
    while (i < ps.length) {
      // Honorarios individuales / Sanatorios ordenados por paciente: la sección entera va
      // por paciente (no por médico) y cada paciente cierra con su total, en lugar del
      // subtotal del médico.
      const porPaciente = g.ordenAlfabetico?.valor === "paciente";
      let j = i + 1;
      if (g.subtotalPorMedico && !porPaciente) {
        while (j < ps.length && ps[j].cod_medico === ps[i].cod_medico) j += 1;
      } else {
        j = ps.length;
      }
      const tramo = ps.slice(i, j);
      out.push(...filasDe(tramo, `${g.key}-${i}`, { porPaciente, totalPaciente: porPaciente }));
      if (g.subtotalPorMedico && !porPaciente) {
        const medico = tramo[0];
        // El equipo anidado bajo cada fila cuenta en el subtotal del socio de la cabeza,
        // salvo en Honorarios individuales y Sanatorios.
        const incluidas = tramo.flatMap((p) => [p, ...(sumaEquipo(p) ? g.companeros?.[p.id] ?? [] : [])]);
        const totales = sumarTotales(incluidas);
        out.push(
          <tr key={`subtotal-${g.key}-${medico.cod_medico}-${medico.id}`} className={styles.subtotalMedicoRow}>
            <td colSpan={colSpan}>
              <div className={styles.subtotalMedicoContent}>
                <span>Subtotal socio {medico.cod_medico} {medico.nombreSocio ?? ""} ({incluidas.length})</span>
                <span className={styles.subtotalMedicoMontos}>
                  <span>Coseguro: <strong>{formatMoney(totales.totalCoseguro)}</strong></span>
                  <span>Total: <strong>{formatMoney(totales.totalSubtotal)}</strong></span>
                </span>
              </div>
            </td>
          </tr>,
        );
      }
      i = j;
    }
    return out;
  };

  // "Por socio": fila de título del socio y, en cada uno, un subtítulo por tramo.
  const filasPorSocio = (): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    out.push(
      <tr key={`titulo-${g.key}`} className={styles.socioTituloRow}>
        <td colSpan={colSpan}>{g.titulo}</td>
      </tr>,
    );
    for (const t of g.tramos ?? [{ key: "todas", subtitulo: "", prestaciones: g.prestaciones }]) {
      if (t.subtitulo) {
        out.push(<tr key={`tramo-${g.key}-${t.key}`} className={styles.tramoRow}><td colSpan={colSpan}>{t.subtitulo}</td></tr>);
      }
      // Honorarios individuales y Sanatorios van ordenados por paciente: cada uno con su subtítulo y su total.
      const porPaciente = t.key === "Honorarios individuales" || t.key === "Sanatorio";
      out.push(...filasDe(t.prestaciones, `${g.key}-${t.key}`, { porPaciente, totalPaciente: porPaciente }));
    }
    return out;
  };

  const resumen = (
    <tr key={`resumen-${g.key}`} className={styles.resumenRow}>
      <td colSpan={colSpan}>
        <div className={styles.resumenContent}>
          <span className={styles.resumenLabel}>RESUMEN: {g.titulo}</span>
          {totalesPorTipo(g.sumables).map((t) => (
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

  const filas = esPorSocio ? filasPorSocio() : filasListado();
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

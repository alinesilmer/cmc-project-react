import type React from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  ShieldCheck,
} from "lucide-react";

import {
  getAuditoriaDetalle,
  getAuditoriaResumen,
  ORDEN_SEVERIDAD,
  SEVERIDAD_LABEL,
  type ChequeoPadron,
  type Severidad,
} from "./auditoria.api";
import styles from "./AuditoriaPadron.module.scss";

const LIMITE_DETALLE = 50;
const numero = new Intl.NumberFormat("es-AR");

/** "2050-05-01" → "01/05/2050", sin construir un Date (evita el corrimiento). */
function fecha(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

const claseSev = (s: Severidad) =>
  ({ alta: styles.sevAlta, media: styles.sevMedia, baja: styles.sevBaja, info: styles.sevInfo })[s];

const claseAcento = (s: Severidad) =>
  ({
    alta: styles.acentoAlta,
    media: styles.acentoMedia,
    baja: styles.acentoBaja,
    info: styles.acentoInfo,
  })[s];

/**
 * Control de calidad del padrón de socios.
 *
 * Detecta duplicados, datos faltantes y valores imposibles (fechas de
 * nacimiento en el futuro, edades de 110 años) para que alguien los revise.
 *
 * **No corrige nada.** Es una decisión deliberada: son 4.500 legajos migrados
 * de un sistema viejo, y un arreglo automático sobre datos así hace más daño
 * que bien. Cada fila enlaza a su legajo para corregirla a mano, con contexto.
 */
const AuditoriaPadron: React.FC = () => {
  const [abierto, setAbierto] = useState<string | null>(null);

  const resumen = useQuery({
    queryKey: ["auditoria-padron"],
    queryFn: getAuditoriaResumen,
    staleTime: 5 * 60 * 1000,
  });

  // El detalle se pide recién al abrir un chequeo: son 14 consultas que no
  // tiene sentido disparar todas juntas al entrar.
  const detalle = useQuery({
    queryKey: ["auditoria-detalle", abierto],
    queryFn: () => getAuditoriaDetalle(abierto as string, LIMITE_DETALLE),
    enabled: Boolean(abierto),
    staleTime: 5 * 60 * 1000,
  });

  const porSeveridad = useMemo(() => {
    const mapa = new Map<Severidad, ChequeoPadron[]>();
    for (const c of resumen.data?.chequeos ?? []) {
      const lista = mapa.get(c.severidad) ?? [];
      lista.push(c);
      mapa.set(c.severidad, lista);
    }
    // Dentro de cada grupo, primero lo que más casos tiene.
    for (const lista of mapa.values()) lista.sort((a, b) => b.casos - a.casos);
    return mapa;
  }, [resumen.data]);

  const totales = useMemo(() => {
    const t: Record<Severidad, number> = { alta: 0, media: 0, baja: 0, info: 0 };
    for (const c of resumen.data?.chequeos ?? []) t[c.severidad] += c.casos;
    return t;
  }, [resumen.data]);

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <Link to="/panel/users" className={styles.back}>
          <ArrowLeft size={16} /> Volver a Socios
        </Link>

        <header className={styles.head}>
          <div>
            <h1 className={styles.title}>Control de datos del padrón</h1>
            <p className={styles.subtitle}>
              Duplicados, datos faltantes y valores que no pueden ser correctos.
              Tocá cualquier chequeo para ver los legajos afectados.
            </p>
          </div>
        </header>

        <div className={styles.aviso}>
          <ShieldCheck size={17} />
          <span>
            Esta pantalla <strong>no modifica ningún dato</strong>: sólo señala
            legajos para revisar. Cada uno se corrige desde su propia ficha.
          </span>
        </div>

        {resumen.isError ? (
          <div className={styles.error}>
            <AlertCircle size={16} /> No se pudo ejecutar el control. Puede que no
            tengas permiso para ver socios.
          </div>
        ) : resumen.isLoading ? (
          <>
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
          </>
        ) : (
          <>
            {/* ── Marcador ── */}
            <div className={styles.tablero}>
              <div className={styles.tarjetaTotal}>
                <span className={styles.totalLabel}>Legajos</span>
                <span className={styles.totalNum}>
                  {numero.format(resumen.data?.total ?? 0)}
                </span>
                <span className={styles.totalHint}>en el padrón</span>
              </div>
              {ORDEN_SEVERIDAD.map((sev) => (
                <div
                  key={sev}
                  className={`${styles.tarjetaTotal} ${claseAcento(sev)}`}
                >
                  <span className={styles.totalLabel}>{SEVERIDAD_LABEL[sev]}</span>
                  <span className={styles.totalNum}>
                    {numero.format(totales[sev])}
                  </span>
                  <span className={styles.totalHint}>
                    {totales[sev] === 1 ? "observación" : "observaciones"}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Chequeos, agrupados por severidad ── */}
            {ORDEN_SEVERIDAD.map((sev) => {
              const lista = porSeveridad.get(sev) ?? [];
              if (!lista.length) return null;

              return (
                <section key={sev} className={styles.grupo}>
                  <h2 className={styles.grupoTitulo}>
                    <span className={`${styles.chipSev} ${claseSev(sev)}`}>
                      {SEVERIDAD_LABEL[sev]}
                    </span>
                  </h2>

                  {lista.map((c) => {
                    const activo = abierto === c.id;
                    return (
                      <article key={c.id} className={styles.chequeo}>
                        <button
                          type="button"
                          className={styles.chequeoHead}
                          onClick={() => setAbierto(activo ? null : c.id)}
                          aria-expanded={activo}
                          disabled={c.casos === 0}
                        >
                          {c.casos === 0 ? (
                            <CheckCircle2 size={18} className={styles.flecha} />
                          ) : activo ? (
                            <ChevronDown size={18} className={styles.flecha} />
                          ) : (
                            <ChevronRight size={18} className={styles.flecha} />
                          )}

                          <span className={styles.chequeoTexto}>
                            <span className={styles.chequeoTitulo}>{c.titulo}</span>
                            <span className={styles.chequeoDesc}>{c.descripcion}</span>
                          </span>

                          <span
                            className={`${styles.casos} ${c.casos === 0 ? styles.casosCero : ""}`}
                          >
                            {numero.format(c.casos)}
                          </span>
                        </button>

                        {activo && (
                          <div className={styles.detalle}>
                            {detalle.isLoading ? (
                              <div className={styles.skeleton} />
                            ) : detalle.isError ? (
                              <div className={styles.error}>
                                <AlertCircle size={16} /> No se pudo cargar el detalle.
                              </div>
                            ) : (detalle.data ?? []).length === 0 ? (
                              <p className={styles.ok}>
                                <CheckCircle2 size={16} /> Sin casos.
                              </p>
                            ) : (
                              <>
                                <div className={styles.tableWrap}>
                                  <table className={styles.table}>
                                    <thead>
                                      <tr>
                                        <th>N° socio</th>
                                        <th>Nombre</th>
                                        <th className={styles.num}>Documento</th>
                                        <th className={styles.num}>Matrícula</th>
                                        <th>Nacimiento</th>
                                        <th>Estado</th>
                                        <th />
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(detalle.data ?? []).map((f) => (
                                        <tr key={f.id}>
                                          <td>{f.nro_socio ?? "—"}</td>
                                          <td className={styles.nombre}>
                                            {f.nombre?.trim() || (
                                              <span className={styles.falta}>sin nombre</span>
                                            )}
                                          </td>
                                          <td className={styles.num}>
                                            {f.documento && f.documento > 0 ? (
                                              numero.format(f.documento)
                                            ) : (
                                              <span className={styles.falta}>—</span>
                                            )}
                                          </td>
                                          <td className={styles.num}>
                                            {f.matricula_prov && f.matricula_prov > 0 ? (
                                              f.matricula_prov
                                            ) : (
                                              <span className={styles.falta}>—</span>
                                            )}
                                          </td>
                                          <td>{fecha(f.fecha_nac)}</td>
                                          <td>{f.activo ? "Activo" : "Inactivo"}</td>
                                          <td>
                                            <Link
                                              to={`/panel/doctors/${f.id}`}
                                              className={styles.verLink}
                                            >
                                              Ver legajo <ExternalLink size={13} />
                                            </Link>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {c.casos > (detalle.data ?? []).length && (
                                  <p className={styles.pieDetalle}>
                                    <Info size={13} style={{ verticalAlign: "-2px" }} />{" "}
                                    Se muestran los primeros{" "}
                                    {numero.format((detalle.data ?? []).length)} de{" "}
                                    {numero.format(c.casos)}.
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditoriaPadron;

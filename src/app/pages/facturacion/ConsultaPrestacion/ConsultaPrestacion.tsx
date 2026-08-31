import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Search, ArrowLeft, AlertTriangle, Users, History, FileSearch,
} from "lucide-react";

import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import { fetchPrestacionFicha, listarPrestaciones } from "../api";
import { detailMessage } from "../types";
import type { EstadoPrestacion, PrestacionFicha, PrestacionRead } from "../types";
import { formatMoney } from "../money";
import PrestacionStateChip from "../components/PrestacionStateChip";
import styles from "./ConsultaPrestacion.module.scss";

// Igual que en MedicoPrestacionesTable: las fechas DATE de la API vienen
// "YYYY-MM-DD" — parsear con `new Date` las corre un día por el huso horario
// (AR = UTC-3). Se formatean sin pasar por Date.
const fmtFecha = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// `created_at` / los timestamps de auditoría sí son datetime completos — acá el
// corrimiento de huso no aplica, se puede pasar por `Date` sin problema.
const fmtFechaHora = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const ORIGEN_LABEL: Record<string, string> = { colegio: "Colegio", medico: "Médico (portal)" };

const ConsultaPrestacion: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();
  const { id: idParam } = useParams<{ id: string }>();

  const [idInput, setIdInput] = useState("");
  const [autInput, setAutInput] = useState("");

  const [ficha, setFicha] = useState<PrestacionFicha | null>(null);
  const [loadingFicha, setLoadingFicha] = useState(false);
  const [notFoundId, setNotFoundId] = useState<string | null>(null);

  const [lista, setLista] = useState<PrestacionRead[] | null>(null);
  const [loadingLista, setLoadingLista] = useState(false);
  const [buscadoAut, setBuscadoAut] = useState("");

  // Ficha: se dispara desde el :id de la URL, no desde el input — así un deep-link
  // o el botón "Ver ficha" de la lista (que navega) también la cargan.
  useEffect(() => {
    if (!idParam) {
      setFicha(null);
      setNotFoundId(null);
      return;
    }
    let active = true;
    setLoadingFicha(true);
    setNotFoundId(null);
    (async () => {
      try {
        const data = await fetchPrestacionFicha(idParam);
        if (!active) return;
        setFicha(data);
      } catch (e: any) {
        if (!active) return;
        if (e?.response?.status === 404) {
          setFicha(null);
          setNotFoundId(idParam);
        } else {
          notify(detailMessage(e?.response?.data?.detail) || "No se pudo cargar la prestación.", "error");
        }
      } finally {
        if (active) setLoadingFicha(false);
      }
    })();
    return () => { active = false; };
  }, [idParam, notify]);

  const buscarPorId = () => {
    const v = idInput.trim();
    if (!v) return;
    if (!/^\d+$/.test(v)) {
      notify("El ID de prestación tiene que ser numérico.", "error");
      return;
    }
    navigate(`/panel/facturacion/consulta/${v}`);
  };

  const buscarPorAutorizacion = async () => {
    const v = autInput.trim();
    if (!v) return;
    // Sale de una ficha abierta (si había una) para mostrar la lista en su lugar.
    if (idParam) navigate("/panel/facturacion/consulta");
    setLoadingLista(true);
    setBuscadoAut(v);
    try {
      const { data } = await listarPrestaciones({ orden_o_autorizacion: v, limit: 100 });
      setLista(data);
    } catch (e: any) {
      notify(detailMessage(e?.response?.data?.detail) || "Error al buscar.", "error");
    } finally {
      setLoadingLista(false);
    }
  };

  const verFicha = (id: number) => navigate(`/panel/facturacion/consulta/${id}`);

  const volver = () => {
    navigate("/panel/facturacion/consulta");
    setLista(null);
    setIdInput("");
    setAutInput("");
  };

  const onIdKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") buscarPorId(); };
  const onAutKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") buscarPorAutorizacion(); };

  // `idParam` sigue presente en la URL aunque el fetch haya dado 404 — no alcanza
  // para decidir qué mostrar. Distinguir "hay :id" (¿mostramos la sección ficha?) de
  // "esa ficha se resolvió" (¿la encontramos?).
  const enModoFicha = !!idParam;
  const mostrandoFicha = enModoFicha && !loadingFicha && !!ficha;
  const mostrandoNoEncontrada = enModoFicha && !loadingFicha && !ficha && !!notFoundId;
  const mostrandoLista = !enModoFicha && lista !== null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <FileSearch size={22} />
        </span>
        <div>
          <h1 className={styles.title}>Consulta de prestación</h1>
          <p className={styles.subtitle}>
            Buscá por ID o por número de orden / autorización para ver el registro completo.
          </p>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.toolbar}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>ID de prestación</label>
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                type="text"
                inputMode="numeric"
                placeholder="Ej. 2665336"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                onKeyDown={onIdKeyDown}
              />
              <button
                type="button"
                className={styles.iconBtn}
                onClick={buscarPorId}
                disabled={loadingFicha}
                aria-label="Buscar por ID"
              >
                <Search size={16} />
              </button>
            </div>
          </div>

          <div className={styles.divider} />

          <div className={`${styles.filterField} ${styles.filterFieldWide}`}>
            <label className={styles.filterLabel}>Nro de orden o autorización</label>
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                type="text"
                placeholder="Ej. 2047774"
                value={autInput}
                onChange={(e) => setAutInput(e.target.value)}
                onKeyDown={onAutKeyDown}
              />
              <button
                type="button"
                className={styles.iconBtn}
                onClick={buscarPorAutorizacion}
                disabled={loadingLista}
                aria-label="Buscar por orden o autorización"
              >
                <Search size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Estado inicial ── */}
        {!enModoFicha && lista === null && !loadingLista && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}><Search size={24} /></span>
            <p className={styles.emptyText}>
              Ingresá un ID exacto o un número de orden / autorización para ver la ficha
              completa de una prestación.
            </p>
          </div>
        )}

        {/* ── Cargando ── */}
        {((enModoFicha && loadingFicha) || (!enModoFicha && loadingLista)) && (
          <div className={styles.emptyState}>
            <p className={styles.mutedText}>Buscando…</p>
          </div>
        )}

        {/* ── No encontrada ── */}
        {mostrandoNoEncontrada && (
          <div className={styles.emptyState}>
            <span className={`${styles.emptyIcon} ${styles.emptyIconWarn}`}><AlertTriangle size={24} /></span>
            <p className={styles.emptyTextStrong}>
              No se encontró ninguna prestación con el ID <strong>{notFoundId}</strong>.
            </p>
            <p className={styles.emptyText}>
              Revisá el número, o probá buscar por nro de orden / autorización si no tenés
              el ID a mano.
            </p>
            <button type="button" className={styles.ghostBtn} onClick={volver}>
              Volver a buscar
            </button>
          </div>
        )}

        {/* ── Lista de resultados ── */}
        {mostrandoLista && !loadingLista && (
          lista!.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={`${styles.emptyIcon} ${styles.emptyIconWarn}`}><AlertTriangle size={24} /></span>
              <p className={styles.emptyTextStrong}>
                No se encontró ninguna prestación con "{buscadoAut}" en el nro de orden o
                la autorización.
              </p>
            </div>
          ) : (
            <div>
              <div className={styles.listaInfo}>
                <strong>{lista!.length} resultado{lista!.length !== 1 ? "s" : ""}</strong> para "{buscadoAut}"
                {lista!.length > 1 && " — un mismo número de autorización puede cubrir varios ítems de un equipo."}
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha práctica</th>
                      <th>Socio</th>
                      <th>Código</th>
                      <th className={styles.thRight}>Importe</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista!.map((row) => (
                      <tr key={row.id}>
                        <td className={styles.idCell}>{row.id}</td>
                        <td>{fmtFecha(row.fecha_practica)}</td>
                        <td>{row.cod_medico}</td>
                        <td className={styles.codeCell}>{row.cod_nomenclador ?? "—"}</td>
                        <td className={`${styles.tdRight} ${styles.moneyCell}`}>{formatMoney(row.importe_total)}</td>
                        <td className={styles.thRight}>
                          <button type="button" className={styles.btnVer} onClick={() => verFicha(row.id)}>
                            Ver ficha
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* ── Ficha completa ── */}
        {mostrandoFicha && ficha && (
          <div>
            <button type="button" className={styles.backBtn} onClick={volver}>
              <ArrowLeft size={14} /> Volver a la búsqueda
            </button>

            <div className={styles.fichaHero}>
              <span className={styles.fichaId}>#{ficha.prestacion.id_detalle_prestaciones}</span>
              <PrestacionStateChip estado={(ficha.prestacion.estado as EstadoPrestacion) ?? "A"} />
              <span className={`${styles.chip} ${styles.chipBlue}`}>
                Origen: {ORIGEN_LABEL[ficha.prestacion.origen_carga ?? ""] ?? ficha.prestacion.origen_carga ?? "—"}
              </span>
              <span className={`${styles.chip} ${styles.chipNeutral}`}>
                Período {ficha.prestacion.periodo_label ?? ficha.prestacion.periodo}
              </span>
              <span className={`${styles.chip} ${styles.chipNeutral}`}>
                <History size={11} /> Cargada el {fmtFechaHora(ficha.prestacion.created)}
                {ficha.prestacion.usuario && ` · ${ficha.cargado_por?.nombre ?? ficha.prestacion.usuario}`}
              </span>
            </div>

            <div className={styles.grid}>
              {/* Médico */}
              <div className={styles.card}>
                <p className={styles.cardTitle}>Médico que cobra</p>
                {ficha.medico ? (
                  <>
                    <div className={styles.cardMain}>{ficha.medico.nombre ?? "—"}</div>
                    <div className={styles.cardSub}>
                      Socio {ficha.medico.nro_socio}
                      {ficha.medico.matricula_prov != null && ` · Matrícula ${ficha.medico.matricula_prov}`}
                      {ficha.medico.categoria && ` · Categoría ${ficha.medico.categoria}`}
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.cardMain}>Socio {ficha.prestacion.cod_med}</div>
                    <div className={styles.cardWarn}><AlertTriangle size={13} /> No se encontró en el padrón.</div>
                  </>
                )}
              </div>

              {/* Obra social */}
              <div className={styles.card}>
                <p className={styles.cardTitle}>Obra social</p>
                {ficha.obra_social ? (
                  <div className={styles.cardMain}>
                    {ficha.obra_social.nro_obrasocial} · {ficha.obra_social.nombre}
                  </div>
                ) : (
                  <>
                    <div className={styles.cardMain}>Código {ficha.prestacion.cod_obr ?? "—"}</div>
                    <div className={styles.cardWarn}>
                      <AlertTriangle size={13} /> Código fuera del catálogo — no se pudo resolver el nombre.
                    </div>
                  </>
                )}
              </div>

              {/* Clínica */}
              {ficha.prestacion.cod_clinica ? (
                <div className={styles.card}>
                  <p className={styles.cardTitle}>Clínica / ámbito</p>
                  {ficha.clinica ? (
                    <>
                      <div className={styles.cardMain}>{ficha.clinica.nombre ?? "—"}</div>
                      <div className={styles.cardSub}>
                        Socio {ficha.clinica.nro_socio}
                        {ficha.clinica.matricula_prov != null && ` · Matrícula ${ficha.clinica.matricula_prov}`}
                      </div>
                      {!ficha.clinica.es_organizacion && (
                        <div className={styles.cardWarn}>
                          <AlertTriangle size={13} /> No figura marcado como organización en el padrón.
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className={styles.cardMain}>Socio {ficha.prestacion.cod_clinica}</div>
                      <div className={styles.cardWarn}><AlertTriangle size={13} /> No se encontró en el padrón.</div>
                    </>
                  )}
                </div>
              ) : null}

              {/* Nomenclador */}
              <div className={styles.card}>
                <p className={styles.cardTitle}>Código / Nomenclador</p>
                {ficha.nomenclador ? (
                  <>
                    <div className={styles.cardMain}>
                      <span className={styles.codeCell}>{ficha.nomenclador.codigo}</span>
                      {ficha.nomenclador.descripcion && ` — ${ficha.nomenclador.descripcion}`}
                    </div>
                    <div className={styles.cardSub}>
                      {ficha.nomenclador.categoria ?? "—"}
                      {ficha.nomenclador.complejidad && ` · Complejidad ${ficha.nomenclador.complejidad}`}
                    </div>
                    {ficha.nomenclador.resuelto_por_codigo && (
                      <p className={styles.legacyNote} style={{ marginTop: 5 }}>
                        Resuelto por código — sin vínculo persistido en la fila.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className={styles.cardMain}>Código {ficha.prestacion.cod_nom ?? "—"}</div>
                    <div className={styles.cardWarn}><AlertTriangle size={13} /> No se encontró en el nomenclador.</div>
                  </>
                )}
              </div>

              {/* Paciente */}
              <div className={styles.card}>
                <p className={styles.cardTitle}>Paciente</p>
                <div className={styles.cardMain}>{ficha.prestacion.nom_ape_p || "—"}</div>
                <div className={styles.cardSub}>
                  Identificador: {ficha.prestacion.dni_p || <em>sin cargar</em>}
                </div>
                {!ficha.paciente && ficha.prestacion.dni_p && (
                  <div className={styles.cardWarn}>
                    <AlertTriangle size={13} /> Sin match en el padrón de afiliados.
                  </div>
                )}
              </div>

              {/* Factura */}
              <div className={styles.card}>
                <p className={styles.cardTitle}>Factura / cabecera</p>
                {ficha.factura ? (
                  <>
                    <div className={styles.cardMain}>
                      Factura #{ficha.factura.id_prestaciones} · versión {ficha.factura.version}
                    </div>
                    <div className={styles.cardSub}>
                      Fase colegio: {ficha.factura.estado === "A" ? "Abierta" : ficha.factura.estado === "C" ? "Cerrada" : ficha.factura.estado ?? "—"}
                      {" · "}
                      Fase médico: {ficha.factura.estado_doctor === "A" ? "Abierta" : ficha.factura.estado_doctor === "C" ? "Cerrada" : ficha.factura.estado_doctor ?? "—"}
                    </div>
                  </>
                ) : (
                  <div className={styles.cardWarn}>
                    <AlertTriangle size={13} /> No tiene cabecera de factura (puede estar huérfana).
                  </div>
                )}
              </div>

              {/* Equipo */}
              <div className={`${styles.card} ${styles.gridFull}`}>
                <p className={styles.cardTitle}><Users size={13} /> Equipo quirúrgico</p>
                {ficha.equipo.length === 0 ? (
                  <p className={styles.mutedText} style={{ fontSize: "0.82rem", margin: 0 }}>
                    No pertenece a un equipo — se factura de forma individual.
                  </p>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Socio</th>
                          <th>Rol</th>
                          <th className={styles.thRight}>Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ficha.equipo.map((m) => (
                          <tr key={m.id}>
                            <td className={styles.idCell}>{m.id}</td>
                            <td>{m.cod_medico}</td>
                            <td>{m.tipo_prestador ?? "—"}</td>
                            <td className={`${styles.tdRight} ${styles.moneyCell}`}>{formatMoney(m.importe_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Montos */}
              <div className={`${styles.card} ${styles.gridFull}`}>
                <p className={styles.cardTitle}>Montos</p>
                <div className={styles.montosGrid}>
                  <div>
                    <div className={styles.montoLabel}>Honorarios</div>
                    <div className={styles.montoValor}>{formatMoney(ficha.prestacion.honorarios)}</div>
                  </div>
                  <div>
                    <div className={styles.montoLabel}>Gastos</div>
                    <div className={styles.montoValor}>{formatMoney(ficha.prestacion.gastos)}</div>
                  </div>
                  <div>
                    <div className={styles.montoLabel}>Ayudante</div>
                    <div className={styles.montoValor}>{formatMoney(ficha.prestacion.ayudante)}</div>
                  </div>
                  <div>
                    <div className={styles.montoLabel}>Coseguro</div>
                    <div className={styles.montoValor}>{formatMoney(ficha.prestacion.coseguro)}</div>
                  </div>
                  <div>
                    <div className={styles.montoLabel}>Total</div>
                    <div className={styles.montoTotal}>{formatMoney(ficha.prestacion.importe_total)}</div>
                  </div>
                </div>
                <p className={styles.cardSub} style={{ marginTop: 10 }}>
                  Tipo de cálculo: <strong>{ficha.prestacion.manual === "M" ? "Manual" : "Automático"}</strong>
                </p>
              </div>

              {/* Auditoría */}
              <div className={`${styles.card} ${styles.gridFull}`}>
                <p className={styles.cardTitle}><History size={13} /> Auditoría</p>
                {ficha.auditoria.length === 0 ? (
                  <p className={styles.mutedText} style={{ fontSize: "0.82rem", margin: 0 }}>
                    Sin movimientos registrados desde que se cargó.
                  </p>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Acción</th>
                          <th>Usuario</th>
                          <th>Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ficha.auditoria.map((ev) => (
                          <tr key={ev.id}>
                            <td>{fmtFechaHora(ev.timestamp)}</td>
                            <td>{ev.method === "PATCH" ? "Edición" : ev.method === "DELETE" ? "Anulación" : ev.method}</td>
                            <td>{ev.nombre ?? ev.nro_socio ?? "—"}</td>
                            <td>{ev.status_code}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Otros campos (legado) */}
              <div className={`${styles.card} ${styles.cardLegacy} ${styles.gridFull}`}>
                <p className={styles.cardTitle}>Otros campos de la fila</p>
                <div className={styles.legacyGrid}>
                  <div>
                    <div className={styles.legacyLabel}>Nro. de orden</div>
                    <div className={styles.legacyValue}>{ficha.prestacion.nro_orden ?? "—"}</div>
                  </div>
                  <div>
                    <div className={styles.legacyLabel}>Marca legado (tipo_orden)</div>
                    <div className={styles.legacyValue}>{ficha.prestacion.tipo_orden ?? "—"}</div>
                  </div>
                  <div>
                    <div className={styles.legacyLabel}>Vía</div>
                    <div className={styles.legacyValue}>{ficha.prestacion.via ?? "—"}</div>
                  </div>
                  <div>
                    <div className={styles.legacyLabel}>Revisado</div>
                    <div className={styles.legacyValue}>{ficha.prestacion.revisado ? "Sí" : "No"}</div>
                  </div>
                </div>
                <p className={styles.legacyNote}>
                  Campos legado de CMC (tpo_funcion, tpo_serv, nro_vias, fin_semana, nocturno,
                  feriado, urgencia, diag, id_especialidad) y de validaciones (validacion_estado /
                  detalle / respuesta) — vacíos salvo que la fila venga del portal del médico.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultaPrestacion;

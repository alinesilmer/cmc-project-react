// app/pages/DoctorProfile/DoctorProfilePage.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Pencil, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import Card from "../../../components/atoms/Card/Card";
import Button from "../../../components/atoms/Button/Button";
import styles from "./DoctorProfilePage.module.scss";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

/* ========= API ========= */
const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";
const M = (id: string | number) => `${API_BASE}/api/medicos/${id}`;
const M_DEUDA = (id: string | number) => `${API_BASE}/api/medicos/${id}/deuda`;
const M_DOCS = (id: string | number) => `${API_BASE}/api/medicos/${id}/documentos`;
const M_STATS = (id: string | number, months = 6) => `${API_BASE}/api/medicos/${id}/stats?months=${months}`;
const M_DEUDA_MANUAL = (id: string | number) => `${API_BASE}/api/medicos/${id}/deudas_manual`;

/* ========= Tipos locales (UI) ========= */
type DoctorDocument = { id: string; label: string; fileName: string; url: string };
type DoctorProfile = {
  id: number;
  memberNumber: string;
  name: string;
  provincialReg: string;
  nationalReg: string;
  email?: string;
  phone?: string;
  specialty?: string;
  address?: string;
  hasDebt: boolean;
  debtDetail?: { amount: number; lastInvoice?: string; since?: string };
  documents: DoctorDocument[];
};

type StatsPoint = { month: string; consultas: number; facturado: number; [dynamicKey: string]: any };

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
type TabKey = "datos" | "deudas" | "documentos" | "reportes";

/* === Modal “Agregar deuda” === */
type Installment = { n: number; dueDate: string; amount: number };
type DebtDraft = { concept: string; amount: number | ""; mode: "full" | "installments"; qty: number; firstDue: Date };

async function fetchJSON<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(await r.text().catch(() => `HTTP ${r.status}`));
  return r.json();
}

const DoctorProfilePage: React.FC = () => {
  const { id } = useParams();
  const [data, setData] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("datos");

  const [showAddDebt, setShowAddDebt] = useState(false);
  const [draft, setDraft] = useState<DebtDraft>({ concept: "", amount: "", mode: "full", qty: 3, firstDue: new Date() });

  // stats
  const [stats, setStats] = useState<StatsPoint[]>([]);
  const [statsKeys, setStatsKeys] = useState<string[]>([]); // claves dinámicas “OS …”

  // ==== carga de datos ====
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        // 1) datos básicos del médico
        const base = await fetchJSON(M(id));
        // 2) deuda
        const debt = await fetchJSON(M_DEUDA(id));
        // 3) documentos
        const docs = await fetchJSON(M_DOCS(id));
        // 4) stats
        const st = await fetchJSON(M_STATS(id, 6)); // últimos 6 meses

        if (!alive) return;

        // mapear backend -> UI
        const profile: DoctorProfile = {
          id: Number(base.id),
          memberNumber: String(base.nro_socio ?? ""),
          name: String(base.nombre ?? "—"),
          provincialReg: String(base.matricula_prov ?? ""),
          nationalReg: String(base.matricula_nac ?? ""),
          email: base.mail_particular ?? undefined,
          phone: base.telefono_consulta ?? undefined,
          specialty: base.categoria ?? undefined, // ajustá si tenés otra fuente
          address: base.domicilio_consulta ?? undefined,
          hasDebt: Boolean(debt.has_debt),
          debtDetail: {
            amount: Number(debt.amount || 0),
            lastInvoice: debt.last_invoice ?? undefined,
            since: debt.since ?? undefined,
          },
          documents: (docs as any[]).map((d) => ({
            id: String(d.id),
            label: String(d.label ?? "-"),
            fileName: String(d.file_name ?? d.fileName ?? "archivo"),
            url: String(d.url ?? "#"),
          })),
        };

        // stats: convertir a shape compatible con Recharts y recolectar claves dinámicas
        const dynKeysSet = new Set<string>();
        const stPoints: StatsPoint[] = (st as any[]).map((row) => {
          const p: StatsPoint = {
            month: String(row.month),
            consultas: Number(row.consultas || 0),
            facturado: Number(row.facturado || 0),
          };
          const obras = row.obras || {};
          for (const k of Object.keys(obras)) {
            p[k] = Number(obras[k] || 0);
            dynKeysSet.add(k);
          }
          return p;
        });
        // priorizar hasta 6 obras por total facturado descendente (para no saturar el gráfico)
        const totalsByKey: Record<string, number> = {};
        for (const k of dynKeysSet) {
          totalsByKey[k] = stPoints.reduce((acc, r) => acc + (Number(r[k]) || 0), 0);
        }
        const chosen = Object.entries(totalsByKey)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([k]) => k);

        setData(profile);
        setStats(stPoints);
        setStatsKeys(chosen);
      } catch (e) {
        console.error(e);
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const hasDebt = !!data?.hasDebt;
  const debtInfo = data?.debtDetail;

  // Genera plan de cuotas local (sólo UI)
  const schedule = useMemo<Installment[] | undefined>(() => {
    if (draft.mode !== "installments" || !draft.amount || draft.qty <= 0) return undefined;
    const total = Number(draft.amount);
    const base = Math.round((total / draft.qty) * 100) / 100;
    const arr: Installment[] = [];
    const start = new Date(draft.firstDue);
    start.setHours(12, 0, 0, 0);
    for (let i = 0; i < draft.qty; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      arr.push({ n: i + 1, dueDate: d.toISOString().slice(0, 10), amount: base });
    }
    const sum = arr.reduce((a, it) => a + it.amount, 0);
    const diff = Math.round((total - sum) * 100) / 100;
    if (diff !== 0) arr[arr.length - 1].amount = Math.round((arr[arr.length - 1].amount + diff) * 100) / 100;
    return arr;
  }, [draft.mode, draft.amount, draft.qty, draft.firstDue]);

  const handleDownloadAll = async () => {
    if (!data) return;
    // si algún día bloqueás por deuda en backend, podés también chequear 403 acá
    for (const doc of data.documents) {
      const a = document.createElement("a");
      a.href = doc.url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const saveDebt = async () => {
    if (!id) return;
    if (!draft.concept || draft.amount === "" || Number(draft.amount) <= 0) {
      alert("Completá concepto y monto.");
      return;
    }
    try {
      const body =
        draft.mode === "full"
          ? { concept: draft.concept, amount: Number(draft.amount), mode: "full" as const }
          : {
              concept: draft.concept,
              amount: Number(draft.amount),
              mode: "installments" as const,
              installments: (schedule ?? []).map((q) => ({
                n: q.n,
                due_date: q.dueDate,
                amount: q.amount,
              })),
            };

      const res = await fetchJSON(M_DEUDA_MANUAL(id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // refrescar card de deuda
      setData((prev) =>
        prev
          ? {
              ...prev,
              hasDebt: !!res.has_debt,
              debtDetail: {
                amount: Number(res.amount || 0),
                lastInvoice: res.last_invoice ?? prev.debtDetail?.lastInvoice,
                since: res.since ?? prev.debtDetail?.since,
              },
            }
          : prev
      );

      setShowAddDebt(false);
      setDraft({ concept: "", amount: "", mode: "full", qty: 3, firstDue: new Date() });
    } catch (e: any) {
      alert(e?.message || "No se pudo crear la deuda.");
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "datos", label: "Datos" },
    { key: "deudas", label: "Deudas" },
    { key: "documentos", label: "Documentos" },
    { key: "reportes", label: "Reportes" },
  ];

  return (
    <div className={styles.page}>
      <Sidebar />
      <div className={styles.content}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className={styles.topbar}>
            <Link to="/doctors" className={styles.backLink}>← Volver</Link>
            <div />
          </div>

          {loading ? (
            <Card className={styles.loadingCard}>
              <div className={styles.loader} aria-label="Cargando perfil…" />
              <p>Cargando perfil…</p>
            </Card>
          ) : !data ? (
            <Card className={styles.errorCard}><p>No se encontró el profesional solicitado.</p></Card>
          ) : (
            <div className={styles.profileLayout}>
              <div className={styles.rightCol}>
                <Card className={styles.headerCard}>
                  <Link to={`/doctors/${data.id}/edit`} className={styles.editPencil} aria-label="Editar" title="Editar">
                    <Pencil size={16} />
                  </Link>

                  <div className={styles.profileHeader}>
                    <div className={styles.avatarSmall} aria-label={data.name}>
                      {data.name?.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div className={styles.headerMain}>
                      <h2 className={styles.name}>{data.name}</h2>
                      <div className={styles.roleRow}>
                        <span className={styles.role}>{data.specialty || "—"}</span>
                        <span className={styles.dot}>•</span>
                        <span className={styles.location}>Corrientes, Capital</span>
                      </div>
                      <div className={styles.headerMeta}>
                        <div className={styles.headerMetaItem}>
                          <span className={styles.headerMetaLabel}>ID:</span>
                          <span className={styles.headerMetaValue}>{data.id}</span>
                        </div>
                        <div className={styles.headerMetaItem}>
                          <span className={styles.headerMetaLabel}>Member #:</span>
                          <span className={styles.headerMetaValue}>{data.memberNumber}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.tabs}>
                    {tabs.map((t) => (
                      <button
                        key={t.key}
                        className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
                        onClick={() => setTab(t.key)}
                        aria-current={tab === t.key ? "page" : undefined}
                      >
                        {t.label}
                        {tab === t.key && (
                          <motion.span layoutId="tab-underline" className={styles.tabUnderline}
                            transition={{ type: "spring", stiffness: 420, damping: 30 }}/>
                        )}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {tab === "datos" && (
                      <motion.div key="tab-datos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className={styles.tabBody}>
                        <div className={styles.infoGrid}>
                          <div><span className={styles.label}>Teléfono:</span><a className={styles.link} href={`tel:${data.phone}`}>{data.phone ?? "—"}</a></div>
                          <div><span className={styles.label}>Dirección:</span><span>{data.address ?? "—"}</span></div>
                          <div><span className={styles.label}>E-mail:</span><a className={styles.link} href={`mailto:${data.email}`}>{data.email ?? "—"}</a></div>
                        </div>
                        <div className={styles.infoGrid}>
                          <div />
                          <div><span className={styles.label}>Matrículas:</span><span>MP {data.provincialReg} · MN {data.nationalReg}</span></div>
                          <div><span className={styles.label}>Estado:</span>
                            <span className={`${styles.badge} ${data.hasDebt ? styles.debt : styles.ok}`}>{data.hasDebt ? "Con deuda" : "Al día"}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {tab === "deudas" && (
                      <motion.div key="tab-deudas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className={styles.tabBody}>
                        <div className={styles.debtBox}>
                          <div>
                            <span className={styles.label}>Monto adeudado</span>
                            <p className={styles.value}>{debtInfo ? currency.format(debtInfo.amount) : data.hasDebt ? "—" : "0"}</p>
                          </div>
                          <div>
                            <span className={styles.label}>Última aplicación</span>
                            <p className={styles.value}>{debtInfo?.lastInvoice ?? "—"}</p>
                          </div>
                          <div>
                            <span className={styles.label}>En mora desde</span>
                            <p className={styles.value}>{debtInfo?.since ?? "—"}</p>
                          </div>
                          <div className={styles.debtActions}>
                            <Button variant="primary" onClick={() => setShowAddDebt(true)}><Plus size={16} />&nbsp;Agregar deuda</Button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {tab === "documentos" && (
                      <motion.div key="tab-documentos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className={styles.tabBody}>
                        <div className={styles.docsHeaderInline}>
                          <h5 className={styles.section}>Documentación</h5>
                          <Button variant="primary" onClick={handleDownloadAll}>Descargar todo</Button>
                        </div>
                        {data.documents.length === 0 ? (
                          <p className={styles.muted}>No hay documentos cargados.</p>
                        ) : (
                          <ul className={styles.docList}>
                            {data.documents.map((doc) => (
                              <li key={doc.id} className={styles.docItem}>
                                <div>
                                  <p className={styles.docLabel}>{doc.label}</p>
                                  <p className={styles.docName}>{doc.fileName}</p>
                                </div>
                                <div className={styles.docActions}>
                                  <a className={styles.downloadLink} href={doc.url} download>Descargar</a>
                                  <Button size="sm" variant="ghost" onClick={() => window.open(doc.url, "_blank")}>Ver</Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </motion.div>
                    )}

                    {tab === "reportes" && (
                      <motion.div key="tab-reportes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className={styles.tabBody}>
                        <div className={styles.chartsWrap}>
                          <div className={styles.chartBox}>
                            <h4 className={styles.chartTitle}>Consultas por mes</h4>
                            <ResponsiveContainer width="100%" height={260}>
                              <BarChart data={stats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="consultas" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <div className={styles.chartBox}>
                            <h4 className={styles.chartTitle}>Obras sociales por mes</h4>
                            <ResponsiveContainer width="100%" height={320}>
                              <LineChart data={stats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {statsKeys.map((k) => (
                                  <Line key={k} type="monotone" dataKey={k} name={k} dot={false} />
                                ))}
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal agregar deuda */}
      <AnimatePresence>
        {showAddDebt && (
          <div className={styles.portal}>
            <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setShowAddDebt(false)} />
            <motion.div className={styles.popup} role="dialog" aria-modal="true"
              initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ type: "spring", stiffness: 240, damping: 22 }}>
              <div className={styles.popupHeader}>
                <h3>Agregar deuda</h3>
                <button className={styles.iconButton} onClick={() => setShowAddDebt(false)} aria-label="Cerrar"><X size={16} /></button>
              </div>

              <div className={styles.modalGrid}>
                <div className={styles.field}>
                  <label>Concepto</label>
                  <input className={styles.input} value={draft.concept} onChange={(e) => setDraft((d) => ({ ...d, concept: e.target.value }))} placeholder="Cuota societaria / cargo manual" />
                </div>
                <div className={styles.field}>
                  <label>Monto total (ARS)</label>
                  <input className={styles.input} type="number"
                    value={draft.amount === "" ? "" : String(draft.amount)}
                    onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value === "" ? "" : Number(e.target.value) }))} placeholder="0" />
                </div>
                <div className={styles.field}>
                  <label>Modo</label>
                  <select className={styles.select} value={draft.mode}
                    onChange={(e) => setDraft((d) => ({ ...d, mode: e.target.value as "full" | "installments" }))}>
                    <option value="full">Pago completo</option>
                    <option value="installments">En cuotas</option>
                  </select>
                </div>

                {draft.mode === "installments" && (
                  <>
                    <div className={styles.field}>
                      <label>Cantidad de cuotas</label>
                      <input className={styles.input} type="number" value={draft.qty}
                        onChange={(e) => setDraft((d) => ({ ...d, qty: Number(e.target.value) }))} />
                    </div>
                    <div className={styles.field}>
                      <label>Primera fecha de vencimiento</label>
                      <DatePicker selected={draft.firstDue} onChange={(d) => d && setDraft((s) => ({ ...s, firstDue: d }))} className={styles.dateInput} dateFormat="yyyy-MM-dd" placeholderText="Seleccionar fecha" closeOnScroll showPopperArrow={false}/>
                    </div>
                  </>
                )}
              </div>

              {draft.mode === "installments" && !!schedule?.length && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>#</th><th>Vencimiento</th><th>Importe</th></tr></thead>
                    <tbody>
                      {schedule.map((q) => (<tr key={q.n}><td>{q.n}</td><td>{q.dueDate}</td><td>${q.amount.toLocaleString()}</td></tr>))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className={styles.popupButtons}>
                <Button variant="primary" onClick={saveDebt}>Guardar deuda</Button>
                <Button variant="ghost" onClick={() => setShowAddDebt(false)}>Cancelar</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DoctorProfilePage;

// app/pages/DoctorProfile/DoctorProfilePage.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Pencil, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import Card from "../../../components/atoms/Card/Card";
import Button from "../../../components/atoms/Button/Button";
import styles from "./DoctorProfilePage.module.scss";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";

/* ========= API ========= */
const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";
const M = (id: string | number) => `${API_BASE}/api/medicos/${id}`;
const M_DEUDA = (id: string | number) => `${API_BASE}/api/medicos/${id}/deuda`;
const M_DOCS = (id: string | number) => `${API_BASE}/api/medicos/${id}/documentos`;
const M_STATS = (id: string | number, months = 6) => `${API_BASE}/api/medicos/${id}/stats?months=${months}`;
const M_DEUDA_MANUAL = (id: string | number) => `${API_BASE}/api/medicos/${id}/deudas_manual`;

// NUEVO
const M_CONCEPTS = (id: string | number) => `${API_BASE}/api/medicos/${id}/conceptos`;        // desc agrupado por nro_colegio
const M_ESPEC_ASOC = (id: string | number) => `${API_BASE}/api/medicos/${id}/especialidades`;  // lista adheridas
const M_ASSOC = (id: string | number) => `${API_BASE}/api/medicos/${id}/ce_bundle`;            // PATCH add/remove

// catálogos
const DESCUENTOS_URL = `${API_BASE}/api/descuentos`;        // devuelve id, nro_colegio, nombre, ...
const ESPECIALIDADES_URL = `${API_BASE}/api/especialidades`; // devuelve ID, ESPECIALIDAD, ...

/* ========= Tipos ========= */
type DoctorDocument = { id: string; label: string; fileName: string; url: string };
type DoctorProfile = {
  id: number; memberNumber: string; name: string; provincialReg: string; nationalReg: string;
  email?: string; phone?: string; specialty?: string; address?: string;
  hasDebt: boolean; debtDetail?: { amount: number; lastInvoice?: string; since?: string };
  documents: DoctorDocument[];
};

type StatsPoint = { month: string; consultas: number; facturado: number; [k: string]: any };
type TabKey = "datos" | "deudas" | "documentos" | "reportes" | "conceptos" | "especialidades";
const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

type Installment = { n: number; dueDate: string; amount: number };
type DebtDraft = { concept: string; amount: number | ""; mode: "full" | "installments"; qty: number; firstDue: Date };

type ConceptApp = {
  resumen_id: number; periodo: string; created_at?: string | null;
  monto_aplicado: number; porcentaje_aplicado: number;
};
type DoctorConcept = {
  concepto_id: number;                 // nro_colegio
  concepto_nro_colegio?: number | null;
  concepto_nombre?: string | null;
  saldo: number;
  aplicaciones: ConceptApp[];
};
type DoctorEspecialidad = { id: number; nombre?: string | null };

type Option = { id: string; label: string }; // id = nro_colegio (para conceptos) / ID (para especialidad)

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

  // deuda
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [draft, setDraft] = useState<DebtDraft>({ concept: "", amount: "", mode: "full", qty: 3, firstDue: new Date() });

  // stats
  const [stats, setStats] = useState<StatsPoint[]>([]);
  const [statsKeys, setStatsKeys] = useState<string[]>([]);

  // conceptos (desc por nro_colegio)
  const [concepts, setConcepts] = useState<DoctorConcept[]>([]);
  const [conceptsLoading, setConceptsLoading] = useState(false);
  const [conceptsErr, setConceptsErr] = useState<string | null>(null);

  // especialidades
  const [especs, setEspecs] = useState<DoctorEspecialidad[]>([]);
  const [especLoading, setEspecLoading] = useState(false);
  const [especErr, setEspecErr] = useState<string | null>(null);

  // catálogos
  const [descOptions, setDescOptions] = useState<Option[]>([]); // id = nro_colegio
  const [espOptions, setEspOptions] = useState<Option[]>([]);   // id = Especialidad.ID

  // asociar modales
  const [assocDescOpen, setAssocDescOpen] = useState(false);
  const [assocDescId, setAssocDescId] = useState<string>(""); // nro_colegio
  const [assocDescBusy, setAssocDescBusy] = useState(false);

  const [assocEspOpen, setAssocEspOpen] = useState(false);
  const [assocEspId, setAssocEspId] = useState<string>("");   // Especialidad.ID
  const [assocEspBusy, setAssocEspBusy] = useState(false);

  // quitar busy
  const [rmConceptBusy, setRmConceptBusy] = useState<number | null>(null); // nro_colegio
  const [rmEspBusy, setRmEspBusy] = useState<number | null>(null);         // Especialidad.ID

  /* ===== carga básica ===== */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [base, debt, docs, st] = await Promise.all([
          fetchJSON(M(id)),
          fetchJSON(M_DEUDA(id)),
          fetchJSON(M_DOCS(id)),
          fetchJSON(M_STATS(id, 6)),
        ]);
        if (!alive) return;

        const profile: DoctorProfile = {
          id: Number(base.id),
          memberNumber: String(base.nro_socio ?? ""),
          name: String(base.nombre ?? "—"),
          provincialReg: String(base.matricula_prov ?? ""),
          nationalReg: String(base.matricula_nac ?? ""),
          email: base.mail_particular ?? undefined,
          phone: base.telefono_consulta ?? undefined,
          specialty: base.categoria ?? undefined,
          address: base.domicilio_consulta ?? undefined,
          hasDebt: Boolean(debt.has_debt),
          debtDetail: { amount: Number(debt.amount || 0), lastInvoice: debt.last_invoice ?? undefined, since: debt.since ?? undefined },
          documents: (docs as any[]).map((d) => ({ id: String(d.id), label: String(d.label ?? "-"), fileName: String(d.file_name ?? d.fileName ?? "archivo"), url: String(d.url ?? "#") })),
        };

        // stats
        const dynKeysSet = new Set<string>();
        const stPoints: StatsPoint[] = (st as any[]).map((row) => {
          const p: StatsPoint = { month: String(row.month), consultas: Number(row.consultas || 0), facturado: Number(row.facturado || 0) };
          const obras = row.obras || {};
          for (const k of Object.keys(obras)) { p[k] = Number(obras[k] || 0); dynKeysSet.add(k); }
          return p;
        });
        const totalsByKey: Record<string, number> = {};
        for (const k of dynKeysSet) totalsByKey[k] = stPoints.reduce((a, r) => a + (Number(r[k]) || 0), 0);
        const chosen = Object.entries(totalsByKey).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);

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
    return () => { alive = false; };
  }, [id]);

  /* ===== catálogos para selects (dedupe por clave correcta) ===== */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (descOptions.length === 0) {
          const ds = await fetchJSON<any[]>(DESCUENTOS_URL);
          if (alive) {
            // tomar un único option por nro_colegio
            const seen = new Set<number>();
            const opts: Option[] = [];
            for (const d of ds || []) {
              const nro = Number(d.nro_colegio);
              if (!Number.isFinite(nro) || seen.has(nro)) continue;
              seen.add(nro);
              opts.push({ id: String(nro), label: `${nro} — ${d.nombre ?? ""}`.trim() });
            }
            setDescOptions(opts.sort((a, b) => Number(a.id) - Number(b.id)));
          }
        }
        if (espOptions.length === 0) {
          const esps = await fetchJSON<any[]>(ESPECIALIDADES_URL);
          if (alive) {
            const opts: Option[] = (esps || []).map((s) => {
              const id = String(s.id ?? s.ID);
              const name = s.nombre ?? s.ESPECIALIDAD ?? "";
              return { id, label: `${id} — ${name}`.trim() };
            });
            setEspOptions(opts);
          }
        }
      } catch { /* noop */ }
    })();
    return () => { alive = false; };
  }, [descOptions.length, espOptions.length]);

  /* ===== loaders por solapa ===== */
  const loadConcepts = async () => {
    if (!id) return;
    setConceptsLoading(true);
    setConceptsErr(null);
    try {
      const list = await fetchJSON<any[]>(M_CONCEPTS(id)); // cada item -> nro_colegio
      const norm: DoctorConcept[] = (list || []).map((c) => ({
        concepto_id: Number(c.concepto_id), // nro_colegio
        concepto_nro_colegio: Number(c.concepto_nro_colegio ?? c.concepto_id),
        concepto_nombre: c.concepto_nombre ?? null,
        saldo: Number(c.saldo || 0),
        aplicaciones: (c.aplicaciones || []).map((a: any) => ({
          resumen_id: Number(a.resumen_id),
          periodo: String(a.periodo || ""),
          created_at: a.created_at ? String(a.created_at) : null,
          monto_aplicado: Number(a.monto_aplicado || 0),
          porcentaje_aplicado: Number(a.porcentaje_aplicado || 0),
        })),
      }));
      // dedupe defensivo por nro_colegio
      const seen = new Set<number>();
      const uniq = norm.filter((r) => (seen.has(r.concepto_id) ? false : (seen.add(r.concepto_id), true)));
      setConcepts(uniq);
    } catch (e: any) {
      setConceptsErr(e?.message || "No se pudieron cargar los conceptos.");
    } finally {
      setConceptsLoading(false);
    }
  };

  const loadEspec = async () => {
    if (!id) return;
    setEspecLoading(true);
    setEspecErr(null);
    try {
      const list = await fetchJSON<any[]>(M_ESPEC_ASOC(id));
      const norm: DoctorEspecialidad[] = (list || []).map((r) => ({ id: Number(r.id), nombre: r.nombre ?? null }));
      const seen = new Set<number>();
      const uniq = norm.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
      setEspecs(uniq);
    } catch (e: any) {
      setEspecErr(e?.message || "No se pudieron cargar las especialidades.");
    } finally {
      setEspecLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    if (tab === "conceptos") loadConcepts();
    if (tab === "especialidades") loadEspec();
  }, [tab, id]);

  /* ===== deuda ===== */
  const schedule = useMemo<Installment[] | undefined>(() => {
    if (draft.mode !== "installments" || !draft.amount || draft.qty <= 0) return undefined;
    const total = Number(draft.amount);
    const base = Math.round((total / draft.qty) * 100) / 100;
    const arr: Installment[] = [];
    const start = new Date(draft.firstDue); start.setHours(12, 0, 0, 0);
    for (let i = 0; i < draft.qty; i++) { const d = new Date(start); d.setMonth(d.getMonth() + i); arr.push({ n: i + 1, dueDate: d.toISOString().slice(0, 10), amount: base }); }
    const sum = arr.reduce((a, it) => a + it.amount, 0);
    const diff = Math.round((total - sum) * 100) / 100;
    if (diff !== 0) arr[arr.length - 1].amount = Math.round((arr[arr.length - 1].amount + diff) * 100) / 100;
    return arr;
  }, [draft.mode, draft.amount, draft.qty, draft.firstDue]);
  const debtInfo = data?.debtDetail;

  const handleDownloadAll = async () => {
    if (!data) return;
    for (const doc of data.documents) {
      const a = document.createElement("a");
      a.href = doc.url; a.download = doc.fileName; document.body.appendChild(a); a.click(); a.remove();
    }
  };

  const saveDebt = async () => {
    if (!id) return;
    if (!draft.concept || draft.amount === "" || Number(draft.amount) <= 0) { alert("Completá concepto y monto."); return; }
    try {
      const body = draft.mode === "full"
        ? { concept: draft.concept, amount: Number(draft.amount), mode: "full" as const }
        : { concept: draft.concept, amount: Number(draft.amount), mode: "installments" as const,
            installments: (schedule ?? []).map((q) => ({ n: q.n, due_date: q.dueDate, amount: q.amount })) };

      const res = await fetchJSON(M_DEUDA_MANUAL(id), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setData((prev) => prev ? { ...prev, hasDebt: !!res.has_debt, debtDetail: {
        amount: Number(res.amount || 0),
        lastInvoice: res.last_invoice ?? prev.debtDetail?.lastInvoice,
        since: res.since ?? prev.debtDetail?.since,
      }} : prev);
      setShowAddDebt(false); setDraft({ concept: "", amount: "", mode: "full", qty: 3, firstDue: new Date() });
    } catch (e: any) {
      alert(e?.message || "No se pudo crear la deuda.");
    }
  };

  /* ===== disponibles (filtrar los ya asociados) ===== */
  const descAvailable = useMemo(() => {
    const taken = new Set(concepts.map((c) => c.concepto_id)); // nro_colegio
    return descOptions.filter((o) => !taken.has(Number(o.id)));
  }, [descOptions, concepts]);

  const espAvailable = useMemo(() => {
    const taken = new Set(especs.map((e) => e.id));
    return espOptions.filter((o) => !taken.has(Number(o.id)));
  }, [espOptions, especs]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "datos", label: "Datos" },
    { key: "deudas", label: "Deudas" },
    { key: "documentos", label: "Documentos" },
    { key: "reportes", label: "Reportes" },
    { key: "conceptos", label: "Conceptos" },
    { key: "especialidades", label: "Especialidades" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className={styles.topbar}>
            <Link to="/doctors" className={styles.backLink}>← Volver</Link>
            <div />
          </div>

          {loading ? (
            <Card className={styles.loadingCard}><div className={styles.loader} aria-label="Cargando perfil…" /><p>Cargando perfil…</p></Card>
          ) : !data ? (
            <Card className={styles.errorCard}><p>No se encontró el profesional solicitado.</p></Card>
          ) : (
            <div className={styles.profileLayout}>
              <div className={styles.rightCol}>
                <Card className={styles.headerCard}>
                  <Link to={`/doctors/${data.id}/edit`} className={styles.editPencil} aria-label="Editar" title="Editar"><Pencil size={16} /></Link>

                  <div className={styles.profileHeader}>
                    <div className={styles.avatarSmall} aria-label={data.name}>
                      {data.name?.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div className={styles.headerMain}>
                      <h2 className={styles.name}>{data.name}</h2>
                      <div className={styles.roleRow}><span className={styles.role}>{data.specialty || "—"}</span><span className={styles.dot}>•</span><span className={styles.location}>Corrientes, Capital</span></div>
                      <div className={styles.headerMeta}>
                        <div className={styles.headerMetaItem}><span className={styles.headerMetaLabel}>ID:</span><span className={styles.headerMetaValue}>{data.id}</span></div>
                        <div className={styles.headerMetaItem}><span className={styles.headerMetaLabel}>Member #:</span><span className={styles.headerMetaValue}>{data.memberNumber}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.tabs}>
                    {tabs.map((t) => (
                      <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`} onClick={() => setTab(t.key)} aria-current={tab === t.key ? "page" : undefined}>
                        {t.label}
                        {tab === t.key && (<motion.span layoutId="tab-underline" className={styles.tabUnderline} transition={{ type: "spring", stiffness: 420, damping: 30 }}/>)}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {/* === Datos === */}
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
                          <div><span className={styles.label}>Estado:</span><span className={`${styles.badge} ${data.hasDebt ? styles.debt : styles.ok}`}>{data.hasDebt ? "Con deuda" : "Al día"}</span></div>
                        </div>
                      </motion.div>
                    )}

                    {/* === Deudas === */}
                    {tab === "deudas" && (
                      <motion.div key="tab-deudas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className={styles.tabBody}>
                        <div className={styles.debtBox}>
                          <div><span className={styles.label}>Monto adeudado</span><p className={styles.value}>{debtInfo ? currency.format(debtInfo.amount) : data.hasDebt ? "—" : "0"}</p></div>
                          <div><span className={styles.label}>Última aplicación</span><p className={styles.value}>{debtInfo?.lastInvoice ?? "—"}</p></div>
                          <div><span className={styles.label}>En mora desde</span><p className={styles.value}>{debtInfo?.since ?? "—"}</p></div>
                          <div className={styles.debtActions}><Button variant="primary" onClick={() => setShowAddDebt(true)}><Plus size={16} />&nbsp;Agregar deuda</Button></div>
                        </div>
                      </motion.div>
                    )}

                    {/* === Documentos === */}
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
                                <div><p className={styles.docLabel}>{doc.label}</p><p className={styles.docName}>{doc.fileName}</p></div>
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

                    {/* === Reportes === */}
                    {tab === "reportes" && (
                      <motion.div key="tab-reportes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className={styles.tabBody}>
                        <div className={styles.chartsWrap}>
                          <div className={styles.chartBox}>
                            <h4 className={styles.chartTitle}>Consultas por mes</h4>
                            <ResponsiveContainer width="100%" height={260}>
                              <BarChart data={stats}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="consultas" /></BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className={styles.chartBox}>
                            <h4 className={styles.chartTitle}>Obras sociales por mes</h4>
                            <ResponsiveContainer width="100%" height={320}>
                              <LineChart data={stats}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                                {statsKeys.map((k) => (<Line key={k} type="monotone" dataKey={k} name={k} dot={false} />))}
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* === Conceptos (desc por nro_colegio) === */}
                    {tab === "conceptos" && (
                      <motion.div key="tab-conceptos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className={styles.tabBody}>
                        <div className={styles.conceptsHeader}>
                          <h5 className={styles.section}>Conceptos asociados</h5>
                          <Button variant="primary" onClick={() => { setAssocDescOpen(true); setAssocDescId(""); }}>
                            <Plus size={16} />&nbsp;Asociar concepto
                          </Button>
                        </div>

                        {conceptsLoading && <p className={styles.muted}>Cargando conceptos…</p>}
                        {conceptsErr && <p className={styles.errorInline}>{conceptsErr}</p>}

                        {!conceptsLoading && !conceptsErr && (
                          concepts.length === 0 ? (
                            <p className={styles.muted}>Este médico no tiene conceptos asociados.</p>
                          ) : (
                            <div className={styles.conceptsList}>
                              {concepts.map((c) => {
                                const danger = Number(c.saldo || 0) !== 0;
                                const removing = rmConceptBusy === c.concepto_id; // nro_colegio
                                return (
                                  <div key={`nro-${c.concepto_id}`} className={`${styles.conceptCard} ${danger ? styles.danger : ""}`}>
                                    <div className={styles.conceptHeader}>
                                      <div className={styles.conceptTitle}>
                                        {c.concepto_nro_colegio ?? c.concepto_id} — {c.concepto_nombre ?? "—"}
                                      </div>
                                      <div className={styles.conceptHeaderRight}>
                                        <div className={`${styles.badge} ${danger ? styles.badgeDanger : styles.badgeOk}`}>
                                          Saldo: {currency.format(Number(c.saldo || 0))}
                                        </div>
                                        <Button
                                          size="sm" variant="danger" disabled={removing}
                                          onClick={async () => {
                                            if (!id) return;
                                            try {
                                              setRmConceptBusy(c.concepto_id);
                                              await fetchJSON(M_ASSOC(id), {
                                                method: "PATCH",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ concepto_tipo: "desc", concepto_id: c.concepto_id, op: "remove" }),
                                              });
                                              await loadConcepts();
                                            } catch (e: any) {
                                              alert(e?.message || "No se pudo quitar el concepto.");
                                            } finally {
                                              setRmConceptBusy(null);
                                            }
                                          }}
                                        >
                                          {removing ? "Quitando…" : "Quitar"}
                                        </Button>
                                      </div>
                                    </div>

                                    <div className={styles.tableWrap}>
                                      <table className={styles.table}>
                                        <thead><tr><th>Resumen ID</th><th>Período</th><th>Fecha</th><th>Monto aplicado</th><th>% aplicado</th></tr></thead>
                                        <tbody>
                                          {(c.aplicaciones || []).length === 0 ? (
                                            <tr><td colSpan={5} className={styles.mutedCenter}>Sin aplicaciones</td></tr>
                                          ) : (
                                            c.aplicaciones.map((a, idx) => (
                                              <tr key={`app-${c.concepto_id}-${idx}`}>
                                                <td>{a.resumen_id}</td>
                                                <td>{a.periodo}</td>
                                                <td>{a.created_at ? new Date(a.created_at).toLocaleString() : "—"}</td>
                                                <td>${Number(a.monto_aplicado).toLocaleString("es-AR", { maximumFractionDigits: 2 })}</td>
                                                <td>{Number(a.porcentaje_aplicado).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%</td>
                                              </tr>
                                            ))
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )
                        )}
                      </motion.div>
                    )}

                    {/* === Especialidades === */}
                    {tab === "especialidades" && (
                      <motion.div key="tab-especialidades" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className={styles.tabBody}>
                        <div className={styles.conceptsHeader}>
                          <h5 className={styles.section}>Especialidades adheridas</h5>
                          <Button variant="primary" onClick={() => { setAssocEspOpen(true); setAssocEspId(""); }}>
                            <Plus size={16} />&nbsp;Agregar especialidad
                          </Button>
                        </div>

                        {especLoading && <p className={styles.muted}>Cargando especialidades…</p>}
                        {especErr && <p className={styles.errorInline}>{especErr}</p>}

                        {!especLoading && !especErr && (
                          <div className={styles.tableWrap}>
                            <table className={styles.table}>
                              <thead><tr><th>ID</th><th>Especialidad</th><th>Acciones</th></tr></thead>
                              <tbody>
                                {(especs || []).length === 0 ? (
                                  <tr><td colSpan={3} className={styles.mutedCenter}>Sin especialidades asociadas.</td></tr>
                                ) : (
                                  especs.map((r) => {
                                    const removing = rmEspBusy === r.id;
                                    return (
                                      <tr key={r.id}>
                                        <td>{r.id}</td>
                                        <td>{r.nombre ?? `ID ${r.id}`}</td>
                                        <td>
                                          <Button
                                            size="sm" variant="danger" disabled={removing}
                                            onClick={async () => {
                                              if (!id) return;
                                              try {
                                                setRmEspBusy(r.id);
                                                await fetchJSON(M_ASSOC(id), {
                                                  method: "PATCH",
                                                  headers: { "Content-Type": "application/json" },
                                                  body: JSON.stringify({ concepto_tipo: "esp", concepto_id: r.id, op: "remove" }),
                                                });
                                                await loadEspec();
                                              } catch (e: any) {
                                                alert(e?.message || "No se pudo quitar la especialidad.");
                                              } finally {
                                                setRmEspBusy(null);
                                              }
                                            }}
                                          >
                                            {removing ? "Quitando…" : "Quitar"}
                                          </Button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ===== Modal agregar deuda ===== */}
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
                <div className={styles.field}><label>Concepto</label>
                  <input className={styles.input} value={draft.concept} onChange={(e) => setDraft((d) => ({ ...d, concept: e.target.value }))} placeholder="Cuota societaria / cargo manual" />
                </div>
                <div className={styles.field}><label>Monto total (ARS)</label>
                  <input className={styles.input} type="number" value={draft.amount === "" ? "" : String(draft.amount)} onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value === "" ? "" : Number(e.target.value) }))} placeholder="0" />
                </div>
                <div className={styles.field}><label>Modo</label>
                  <select className={styles.select} value={draft.mode} onChange={(e) => setDraft((d) => ({ ...d, mode: e.target.value as "full" | "installments" }))}>
                    <option value="full">Pago completo</option>
                    <option value="installments">En cuotas</option>
                  </select>
                </div>

                {draft.mode === "installments" && (
                  <>
                    <div className={styles.field}><label>Cantidad de cuotas</label>
                      <input className={styles.input} type="number" value={draft.qty} onChange={(e) => setDraft((d) => ({ ...d, qty: Number(e.target.value) }))} />
                    </div>
                    <div className={styles.field}><label>Primera fecha de vencimiento</label>
                      <DatePicker selected={draft.firstDue} onChange={(d) => d && setDraft((s) => ({ ...s, firstDue: d }))} className={styles.dateInput} dateFormat="yyyy-MM-dd" placeholderText="Seleccionar fecha" closeOnScroll showPopperArrow={false}/>
                    </div>
                  </>
                )}
              </div>

              {draft.mode === "installments" && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}><thead><tr><th>#</th><th>Vencimiento</th><th>Importe</th></tr></thead>
                    <tbody>{(schedule ?? []).map((q) => (<tr key={q.n}><td>{q.n}</td><td>{q.dueDate}</td><td>${q.amount.toLocaleString()}</td></tr>))}</tbody>
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

      {/* ===== Modal asociar concepto (nro_colegio) ===== */}
      <AnimatePresence>
        {assocDescOpen && (
          <div className={styles.portal}>
            <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setAssocDescOpen(false)} />
            <motion.div className={styles.popup} role="dialog" aria-modal="true"
              initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ type: "spring", stiffness: 240, damping: 22 }}>
              <div className={styles.popupHeader}>
                <h3>Asociar concepto</h3>
                <button className={styles.iconButton} onClick={() => setAssocDescOpen(false)} aria-label="Cerrar"><X size={16} /></button>
              </div>

              <div className={styles.modalGrid}>
                <div className={styles.field}>
                  <label>Descuento (nro colegio)</label>
                  <select className={styles.select} value={assocDescId} onChange={(e) => setAssocDescId(e.target.value)}>
                    <option value="">Seleccionar…</option>
                    {descAvailable.map((o) => (<option key={o.id} value={o.id}>{o.label}</option>))}
                  </select>
                </div>
              </div>

              <div className={styles.popupButtons}>
                <Button
                  variant="primary"
                  disabled={!assocDescId || assocDescBusy}
                  onClick={async () => {
                    if (!id || !assocDescId) return;
                    try {
                      setAssocDescBusy(true);
                      await fetchJSON(M_ASSOC(id), {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ concepto_tipo: "desc", concepto_id: Number(assocDescId), op: "add" }), // nro_colegio
                      });
                      await loadConcepts();
                      setAssocDescOpen(false);
                      setAssocDescId("");
                    } catch (e: any) {
                      alert(e?.message || "No se pudo asociar el concepto.");
                    } finally {
                      setAssocDescBusy(false);
                    }
                  }}
                >
                  {assocDescBusy ? "Asociando…" : "Asociar"}
                </Button>
                <Button variant="ghost" onClick={() => setAssocDescOpen(false)}>Cancelar</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== Modal asociar especialidad ===== */}
      <AnimatePresence>
        {assocEspOpen && (
          <div className={styles.portal}>
            <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setAssocEspOpen(false)} />
            <motion.div className={styles.popup} role="dialog" aria-modal="true"
              initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ type: "spring", stiffness: 240, damping: 22 }}>
              <div className={styles.popupHeader}>
                <h3>Agregar especialidad</h3>
                <button className={styles.iconButton} onClick={() => setAssocEspOpen(false)} aria-label="Cerrar"><X size={16} /></button>
              </div>

              <div className={styles.modalGrid}>
                <div className={styles.field}>
                  <label>Especialidad</label>
                  <select className={styles.select} value={assocEspId} onChange={(e) => setAssocEspId(e.target.value)}>
                    <option value="">Seleccionar…</option>
                    {espAvailable.map((o) => (<option key={o.id} value={o.id}>{o.label}</option>))}
                  </select>
                </div>
              </div>

              <div className={styles.popupButtons}>
                <Button
                  variant="primary"
                  disabled={!assocEspId || assocEspBusy}
                  onClick={async () => {
                    if (!id || !assocEspId) return;
                    try {
                      setAssocEspBusy(true);
                      await fetchJSON(M_ASSOC(id), {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ concepto_tipo: "esp", concepto_id: Number(assocEspId), op: "add" }),
                      });
                      await loadEspec();
                      setAssocEspOpen(false);
                      setAssocEspId("");
                    } catch (e: any) {
                      alert(e?.message || "No se pudo asociar la especialidad.");
                    } finally {
                      setAssocEspBusy(false);
                    }
                  }}
                >
                  {assocEspBusy ? "Asociando…" : "Asociar"}
                </Button>
                <Button variant="ghost" onClick={() => setAssocEspOpen(false)}>Cancelar</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DoctorProfilePage;

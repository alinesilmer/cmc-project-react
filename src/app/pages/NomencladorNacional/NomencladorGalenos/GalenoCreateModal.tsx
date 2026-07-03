import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  X as XIcon, Plus, Save, Loader2, Building2,
  CheckCircle2, AlertCircle, Trash2,
} from "lucide-react";
import { motion } from "framer-motion";

import styles from "./NomencladorGalenos.module.scss";
import {
  listGalenoPlantillas, createNivelesGaleno, createGaleno,
} from "../nomenclador.api";
import type { GalenoPlantillaOut } from "../nomenclador.types";
import type { ObraSocialListItem } from "../../ObrasSociales/obrasSociales.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function extractDetail(e: unknown): string {
  const err = e as { response?: { data?: { detail?: string } } };
  return err?.response?.data?.detail ?? "Ocurrió un error inesperado.";
}

function parseOpt(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

function plantillaLabel(p: GalenoPlantillaOut): string {
  const n = p.niveles.length;
  const sinNivel = n === 1 && p.niveles[0].nivel == null;
  if (sinNivel) return `${p.nombre} — sin niveles`;
  return `${p.nombre} — ${n} nivel${n !== 1 ? "es" : ""}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type BuildNivelRow = {
  /** null solo para plantillas sin niveles */
  nivel: number | null;
  hon: string;
  ayu: string;
  gas: string;
  /** Las filas que vienen de la plantilla tienen el nivel fijo; las agregadas a mano, editable. */
  fromPlantilla: boolean;
};

type GalenoDraft = {
  uid: string;
  grupo: string;
  nombre: string;
  codigo: string;
  sinNivel: boolean;
  vigencia_desde: string;
  valor_unitario: string;
  observacion: string;
  niveles: BuildNivelRow[];
  errors: Record<string, string>;
};

type OsBlock = {
  osNro: number;
  drafts: GalenoDraft[];
};

type SubmitResult = {
  osNro: number;
  nombre: string;
  nivelesCount: number;
  ok: boolean;
  detail?: string;
};

let draftSeq = 0;
function newDraft(): GalenoDraft {
  return {
    uid: `d${Date.now()}_${draftSeq++}`,
    grupo: "", nombre: "", codigo: "", sinNivel: false,
    vigencia_desde: today(), valor_unitario: "", observacion: "",
    niveles: [], errors: {},
  };
}

function validateDraft(d: GalenoDraft): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.grupo) e.grupo = "Elegí una plantilla";
  if (!d.vigencia_desde) e.vigencia_desde = "Requerido";
  const vu = parseFloat(d.valor_unitario);
  if (d.valor_unitario.trim() === "" || isNaN(vu) || vu < 0)
    e.valor_unitario = "Precio inválido (debe ser ≥ 0)";
  if (d.niveles.length === 0) {
    e.niveles = "Agregá al menos un nivel";
  } else if (!d.sinNivel) {
    const nums: number[] = [];
    for (const r of d.niveles) {
      if (r.nivel == null || isNaN(r.nivel) || r.nivel < 1) {
        e.niveles = "Todos los niveles deben tener un número válido (≥ 1)";
        break;
      }
      nums.push(r.nivel);
    }
    if (!e.niveles && new Set(nums).size !== nums.length)
      e.niveles = "Hay niveles duplicados";
  }
  return e;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GalenoCreateModal({
  osList, initialOsNro, onClose, onCreated,
}: {
  osList: ObraSocialListItem[];
  initialOsNro: number | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [plantillas, setPlantillas] = useState<GalenoPlantillaOut[]>([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(true);
  const [plantillasError, setPlantillasError] = useState<string | null>(null);

  const [blocks, setBlocks] = useState<OsBlock[]>(
    initialOsNro != null ? [{ osNro: initialOsNro, drafts: [newDraft()] }] : [],
  );
  const [activeOs, setActiveOs] = useState<number | null>(initialOsNro);

  const [osSearch, setOsSearch] = useState("");
  const [osOpen, setOsOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<SubmitResult[] | null>(null);

  // ── Load plantillas ─────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingPlantillas(true);
      try {
        const data = await listGalenoPlantillas();
        if (alive) setPlantillas(data);
      } catch {
        if (alive) setPlantillasError("No se pudieron cargar las plantillas.");
      } finally {
        if (alive) setLoadingPlantillas(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const osName = (nro: number) =>
    osList.find((os) => os.nro_obra_social === nro)?.nombre ?? `OS ${nro}`;

  const availableOS = useMemo(() => {
    const q = osSearch.trim().toLowerCase();
    const picked = new Set(blocks.map((b) => b.osNro));
    return osList
      .filter((os) => !picked.has(os.nro_obra_social))
      .filter((os) => !q || os.nombre.toLowerCase().includes(q) || String(os.nro_obra_social).includes(q))
      .slice(0, 50);
  }, [osList, osSearch, blocks]);

  const activeBlock = blocks.find((b) => b.osNro === activeOs) ?? null;

  const totalDrafts = useMemo(
    () => blocks.reduce((acc, b) => acc + b.drafts.length, 0),
    [blocks],
  );

  // ── OS block ops ────────────────────────────────────────────────────────────
  function addOs(osNro: number) {
    setBlocks((prev) =>
      prev.some((b) => b.osNro === osNro)
        ? prev
        : [...prev, { osNro, drafts: [newDraft()] }],
    );
    setActiveOs(osNro);
    setOsSearch("");
    setOsOpen(false);
  }

  function removeOs(osNro: number) {
    const next = blocks.filter((b) => b.osNro !== osNro);
    setBlocks(next);
    if (activeOs === osNro) setActiveOs(next[0]?.osNro ?? null);
  }

  // ── Draft ops ───────────────────────────────────────────────────────────────
  function patchDraft(osNro: number, uid: string, patch: Partial<GalenoDraft>) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.osNro !== osNro
          ? b
          : { ...b, drafts: b.drafts.map((d) => (d.uid === uid ? { ...d, ...patch } : d)) },
      ),
    );
  }

  function addDraft(osNro: number) {
    setBlocks((prev) =>
      prev.map((b) => (b.osNro !== osNro ? b : { ...b, drafts: [...b.drafts, newDraft()] })),
    );
  }

  function removeDraft(osNro: number, uid: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.osNro !== osNro
          ? b
          : { ...b, drafts: b.drafts.filter((d) => d.uid !== uid) },
      ),
    );
  }

  function selectPlantilla(osNro: number, uid: string, grupo: string) {
    const p = plantillas.find((x) => x.grupo === grupo);
    if (!p) {
      patchDraft(osNro, uid, { grupo: "", nombre: "", codigo: "", niveles: [], sinNivel: false, errors: {} });
      return;
    }
    const sinNivel = p.niveles.length === 1 && p.niveles[0].nivel == null;
    const niveles: BuildNivelRow[] = p.niveles.map((n) => ({
      nivel: n.nivel,
      hon: n.unidades_honorarios ?? "",
      ayu: n.unidades_ayudante ?? "",
      gas: n.unidades_gastos ?? "",
      fromPlantilla: true,
    }));
    patchDraft(osNro, uid, {
      grupo, nombre: p.nombre, codigo: p.codigo, sinNivel, niveles, errors: {},
    });
  }

  function setNivelField(
    osNro: number, uid: string, idx: number, field: keyof BuildNivelRow, val: string,
  ) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.osNro !== osNro
          ? b
          : {
              ...b,
              drafts: b.drafts.map((d) =>
                d.uid !== uid
                  ? d
                  : {
                      ...d,
                      niveles: d.niveles.map((r, i) =>
                        i !== idx
                          ? r
                          : { ...r, [field]: field === "nivel" ? (val === "" ? null : Number(val)) : val },
                      ),
                    },
              ),
            },
      ),
    );
  }

  function addNivelRow(osNro: number, uid: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.osNro !== osNro
          ? b
          : {
              ...b,
              drafts: b.drafts.map((d) => {
                if (d.uid !== uid) return d;
                const used = d.niveles.map((r) => r.nivel).filter((n): n is number => n != null);
                const nextNivel = used.length ? Math.max(...used) + 1 : 1;
                return {
                  ...d,
                  niveles: [...d.niveles, { nivel: nextNivel, hon: "", ayu: "", gas: "", fromPlantilla: false }],
                };
              }),
            },
      ),
    );
  }

  function removeNivelRow(osNro: number, uid: string, idx: number) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.osNro !== osNro
          ? b
          : {
              ...b,
              drafts: b.drafts.map((d) =>
                d.uid !== uid ? d : { ...d, niveles: d.niveles.filter((_, i) => i !== idx) },
              ),
            },
      ),
    );
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    // Validación client-side de todas las instancias
    const errorsByUid = new Map<string, Record<string, string>>();
    let anyErrors = false;
    for (const b of blocks) {
      for (const d of b.drafts) {
        const errs = validateDraft(d);
        errorsByUid.set(d.uid, errs);
        if (Object.keys(errs).length > 0) anyErrors = true;
      }
    }
    // Escribir los errores en cada draft para mostrarlos inline
    setBlocks((prev) =>
      prev.map((b) => ({
        ...b,
        drafts: b.drafts.map((d) => ({ ...d, errors: errorsByUid.get(d.uid) ?? {} })),
      })),
    );
    if (totalDrafts === 0 || anyErrors) return;

    setSubmitting(true);

    // Una llamada por instancia OS+galeno, sin abortar ante el primer error
    const tasks = blocks.flatMap((b) =>
      b.drafts.map((d) => ({ osNro: b.osNro, draft: d })),
    );

    const settled = await Promise.allSettled(
      tasks.map(({ osNro, draft }) => {
        const vu = parseFloat(draft.valor_unitario);
        if (draft.sinNivel) {
          const row = draft.niveles[0];
          return createGaleno({
            obra_social_nro: osNro,
            nombre: draft.nombre,
            nivel: null,
            vigencia_desde: draft.vigencia_desde,
            valor_unitario: vu,
            unidades_honorarios: parseOpt(row.hon),
            unidades_ayudante: parseOpt(row.ayu),
            unidades_gastos: parseOpt(row.gas),
            observacion: draft.observacion.trim() || null,
          });
        }
        return createNivelesGaleno({
          obra_social_nro: osNro,
          nombre: draft.nombre,
          vigencia_desde: draft.vigencia_desde,
          observacion: draft.observacion.trim() || null,
          niveles: draft.niveles.map((r) => ({
            nivel: r.nivel as number,
            valor_unitario: vu,
            unidades_honorarios: parseOpt(r.hon),
            unidades_ayudante: parseOpt(r.ayu),
            unidades_gastos: parseOpt(r.gas),
          })),
        });
      }),
    );

    const res: SubmitResult[] = settled.map((s, i) => {
      const { osNro, draft } = tasks[i];
      const base = { osNro, nombre: draft.nombre, nivelesCount: draft.niveles.length };
      return s.status === "fulfilled"
        ? { ...base, ok: true }
        : { ...base, ok: false, detail: extractDetail(s.reason) };
    });

    setResults(res);
    setSubmitting(false);
    if (res.some((r) => r.ok)) onCreated();
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      title="Nuevo galeno desde plantilla"
      subtitle="Elegí una o más obras sociales y armá sus galenos a partir de plantillas prearmadas"
      onClose={onClose}
      wide
    >
      {results ? (
        <ResultSummary results={results} osName={osName} onClose={onClose} />
      ) : (
        <>
          {/* Selección de obras sociales */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Obras sociales <span className={styles.req}>*</span>
            </label>
            {blocks.length > 0 && (
              <div className={styles.osChips}>
                {blocks.map((b) => (
                  <span key={b.osNro} className={styles.osChip}>
                    <span className={styles.osAcNro}>{b.osNro}</span>
                    {osName(b.osNro)}
                    <button
                      type="button"
                      className={styles.osChipClear}
                      title="Quitar obra social"
                      onClick={() => removeOs(b.osNro)}
                    >
                      <XIcon size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className={styles.osAcWrap}>
              <input
                className={styles.formInput}
                placeholder="Agregar obra social por nombre o número…"
                value={osSearch}
                onChange={(e) => { setOsSearch(e.target.value); setOsOpen(true); }}
                onFocus={() => setOsOpen(true)}
                onBlur={() => setTimeout(() => setOsOpen(false), 150)}
              />
              {osOpen && availableOS.length > 0 && (
                <ul className={styles.osAcDropdown}>
                  {availableOS.map((os) => (
                    <li
                      key={os.nro_obra_social}
                      className={styles.osAcItem}
                      onMouseDown={(e) => { e.preventDefault(); addOs(os.nro_obra_social); }}
                    >
                      <span className={styles.osAcNro}>{os.nro_obra_social}</span>
                      <span className={styles.osAcName}>{os.nombre}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {blocks.length === 0 ? (
            <div className={styles.noSelection}>
              <Building2 size={32} className={styles.noSelectionIcon} />
              <p>Agregá al menos una obra social para empezar a cargar galenos.</p>
            </div>
          ) : (
            <>
              {/* Tabs por OS */}
              {blocks.length > 1 && (
                <div className={styles.tabs}>
                  {blocks.map((b) => (
                    <button
                      key={b.osNro}
                      className={`${styles.tab} ${activeOs === b.osNro ? styles.tabActive : ""}`}
                      onClick={() => setActiveOs(b.osNro)}
                    >
                      {osName(b.osNro)}
                      <span className={styles.tabCount}>{b.drafts.length}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Galenos de la OS activa */}
              {activeBlock && (
                <div className={styles.draftList}>
                  {activeBlock.drafts.map((d, di) => (
                    <DraftCard
                      key={d.uid}
                      draft={d}
                      index={di}
                      plantillas={plantillas}
                      loadingPlantillas={loadingPlantillas}
                      plantillasError={plantillasError}
                      canRemove={activeBlock.drafts.length > 1}
                      onRemove={() => removeDraft(activeBlock.osNro, d.uid)}
                      onSelectPlantilla={(grupo) => selectPlantilla(activeBlock.osNro, d.uid, grupo)}
                      onField={(patch) => patchDraft(activeBlock.osNro, d.uid, patch)}
                      onNivelField={(idx, field, val) => setNivelField(activeBlock.osNro, d.uid, idx, field, val)}
                      onAddNivel={() => addNivelRow(activeBlock.osNro, d.uid)}
                      onRemoveNivel={(idx) => removeNivelRow(activeBlock.osNro, d.uid, idx)}
                    />
                  ))}
                  <button
                    type="button"
                    className={styles.addNivelBtn}
                    onClick={() => addDraft(activeBlock.osNro)}
                  >
                    <Plus size={14} /> Agregar galeno a {osName(activeBlock.osNro)}
                  </button>
                </div>
              )}
            </>
          )}

          <div className={styles.modalFooter}>
            <button className={styles.btnGhost} onClick={onClose}>Cancelar</button>
            <button
              className={styles.btnPrimary}
              onClick={handleSubmit}
              disabled={submitting || totalDrafts === 0}
            >
              {submitting
                ? <><Loader2 size={14} className={styles.spin} /> Creando…</>
                : <><Save size={15} /> Crear {totalDrafts > 0 ? `${totalDrafts} ` : ""}galeno{totalDrafts !== 1 ? "s" : ""}</>}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Draft card ───────────────────────────────────────────────────────────────

function DraftCard({
  draft, index, plantillas, loadingPlantillas, plantillasError, canRemove,
  onRemove, onSelectPlantilla, onField, onNivelField, onAddNivel, onRemoveNivel,
}: {
  draft: GalenoDraft;
  index: number;
  plantillas: GalenoPlantillaOut[];
  loadingPlantillas: boolean;
  plantillasError: string | null;
  canRemove: boolean;
  onRemove: () => void;
  onSelectPlantilla: (grupo: string) => void;
  onField: (patch: Partial<GalenoDraft>) => void;
  onNivelField: (idx: number, field: keyof BuildNivelRow, val: string) => void;
  onAddNivel: () => void;
  onRemoveNivel: (idx: number) => void;
}) {
  const e = draft.errors;
  return (
    <div className={styles.draftCard}>
      <div className={styles.draftHeader}>
        <span className={styles.draftTitle}>
          Galeno {index + 1}
          {draft.codigo && <span className={styles.draftCode}>{draft.codigo}</span>}
        </span>
        {canRemove && (
          <button
            type="button"
            className={styles.removeNivelBtn}
            title="Quitar galeno"
            onClick={onRemove}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Plantilla */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Plantilla <span className={styles.req}>*</span>
        </label>
        <select
          className={`${styles.formSelect} ${e.grupo ? styles.inputError : ""}`}
          value={draft.grupo}
          onChange={(ev) => onSelectPlantilla(ev.target.value)}
          disabled={loadingPlantillas || !!plantillasError}
        >
          <option value="">
            {loadingPlantillas ? "Cargando plantillas…" : plantillasError ? "Error al cargar" : "— Seleccionar —"}
          </option>
          {plantillas.map((p) => (
            <option key={p.grupo} value={p.grupo}>{plantillaLabel(p)}</option>
          ))}
        </select>
        {plantillasError && <span className={styles.errorMsg}>{plantillasError}</span>}
        {e.grupo && <span className={styles.errorMsg}>{e.grupo}</span>}
      </div>

      {draft.grupo && (
        <>
          {/* Cabecera: vigencia + precio único */}
          <div className={styles.formRow2}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Vigente desde <span className={styles.req}>*</span>
              </label>
              <input
                type="date"
                className={`${styles.formInput} ${e.vigencia_desde ? styles.inputError : ""}`}
                value={draft.vigencia_desde}
                onChange={(ev) => onField({ vigencia_desde: ev.target.value })}
              />
              {e.vigencia_desde && <span className={styles.errorMsg}>{e.vigencia_desde}</span>}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Valor galeno ($) <span className={styles.req}>*</span>
              </label>
              <input
                type="number" min="0" step="0.01"
                className={`${styles.formInput} ${e.valor_unitario ? styles.inputError : ""}`}
                value={draft.valor_unitario}
                onChange={(ev) => onField({ valor_unitario: ev.target.value })}
                placeholder="0.00"
              />
              {e.valor_unitario && <span className={styles.errorMsg}>{e.valor_unitario}</span>}
            </div>
          </div>
          <p className={styles.hintText}>
            El valor se aplica a {draft.sinNivel ? "el galeno" : "todos los niveles"}. Las unidades
            vacías se toman del nomenclador al facturar.
          </p>

          {/* Niveles */}
          <div className={styles.nivelSection}>
            <p className={styles.unitsBlockTitle}>
              {draft.sinNivel ? "Unidades" : "Niveles"} <span className={styles.req}>*</span>
            </p>
            {e.niveles && <span className={styles.errorMsg}>{e.niveles}</span>}
            <div className={styles.nivelList}>
              {draft.niveles.map((row, idx) => (
                <div key={idx} className={styles.nivelCard}>
                  <div className={styles.nivelCardHeader}>
                    {draft.sinNivel ? (
                      <span className={styles.nivelNum}>Sin nivel</span>
                    ) : row.fromPlantilla ? (
                      <span className={styles.nivelNum}>Nivel {row.nivel}</span>
                    ) : (
                      <div className={styles.nivelInlineField}>
                        <span className={styles.nivelNum}>Nivel</span>
                        <input
                          type="number" min="1" step="1"
                          className={styles.nivelNumInput}
                          value={row.nivel ?? ""}
                          onChange={(ev) => onNivelField(idx, "nivel", ev.target.value)}
                          placeholder="#"
                        />
                      </div>
                    )}
                    {!row.fromPlantilla && !draft.sinNivel && (
                      <button
                        type="button"
                        className={styles.removeNivelBtn}
                        title="Quitar nivel"
                        onClick={() => onRemoveNivel(idx)}
                      >
                        <XIcon size={13} />
                      </button>
                    )}
                  </div>
                  <div className={styles.formRow3}>
                    <div className={styles.formGroup}>
                      <label className={styles.unitLabel}>Honorarios</label>
                      <input
                        type="number" min="0" step="0.0001"
                        className={styles.unitInput}
                        value={row.hon}
                        onChange={(ev) => onNivelField(idx, "hon", ev.target.value)}
                        placeholder="—"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.unitLabel}>Ayudante</label>
                      <input
                        type="number" min="0" step="0.0001"
                        className={styles.unitInput}
                        value={row.ayu}
                        onChange={(ev) => onNivelField(idx, "ayu", ev.target.value)}
                        placeholder="—"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.unitLabel}>Gastos</label>
                      <input
                        type="number" min="0" step="0.0001"
                        className={styles.unitInput}
                        value={row.gas}
                        onChange={(ev) => onNivelField(idx, "gas", ev.target.value)}
                        placeholder="—"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!draft.sinNivel && (
              <button type="button" className={styles.addNivelBtn} onClick={onAddNivel}>
                <Plus size={14} /> Agregar nivel extra
              </button>
            )}
          </div>

          {/* Observación */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Observación <span className={styles.optional}>(opcional)</span>
            </label>
            <textarea
              className={styles.formTextarea}
              value={draft.observacion}
              onChange={(ev) => onField({ observacion: ev.target.value })}
              placeholder="Opcional…"
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Result summary ───────────────────────────────────────────────────────────

function ResultSummary({
  results, osName, onClose,
}: {
  results: SubmitResult[];
  osName: (nro: number) => string;
  onClose: () => void;
}) {
  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;
  return (
    <>
      <div className={styles.warningBox} style={{ background: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" }}>
        <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          {ok} galeno{ok !== 1 ? "s" : ""} creado{ok !== 1 ? "s" : ""}
          {failed > 0 && ` · ${failed} con error`}.
        </span>
      </div>
      <div className={styles.resultList}>
        {results.map((r, i) => (
          <div key={i} className={`${styles.resultRow} ${r.ok ? styles.resultOk : styles.resultErr}`}>
            {r.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>
              <strong>OS {r.osNro}</strong> · {osName(r.osNro)} — {r.nombre}
              {` (${r.nivelesCount} nivel${r.nivelesCount !== 1 ? "es" : ""})`}
              {r.ok ? " — creado" : ` — error: ${r.detail}`}
            </span>
          </div>
        ))}
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnPrimary} onClick={onClose}>Cerrar</button>
      </div>
    </>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children, wide }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <motion.div
      className={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`${styles.modal} ${wide ? styles.modalWide : ""}`}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.16 }}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{title}</h2>
            {subtitle && <p className={styles.modalSubtitle}>{subtitle}</p>}
          </div>
          <button className={styles.modalClose} onClick={onClose}>
            <XIcon size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </motion.div>
    </motion.div>
  );
}

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search,
  Plus,
  Trash2,
  X as XIcon,
  Save,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import styles from "./NomencladorPorOS.module.scss";
import {
  listGalenos,
  listValores,
  createValor,
  deleteValor,
  listNomenclador,
  getNomencladorById,
} from "../nomenclador.api";
import { listObrasSociales } from "../../ObrasSociales/obrasSociales.api";
import type {
  ValorOut,
  GalenoOut,
  NomencladorOut,
  ComponentePayload,
} from "../nomenclador.types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalidadValor = "calculable" | "fijo";

type ComponenteForm = {
  concepto: "Honorarios" | "Ayudante" | "Gastos";
  galeno_id: number | null;
  cantidad: string;
  valor_unitario: string;
  opcional: boolean;
};

type ValorForm = {
  nomencladorId: number | null;
  nomencladorLabel: string;
  modalidad: ModalidadValor;
  vigencia_desde: string;
  componentes: ComponenteForm[];
};

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

function emptyComp(modalidad: ModalidadValor): ComponenteForm {
  return { concepto: "Honorarios", galeno_id: null, cantidad: "", valor_unitario: "", opcional: false };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sumValor(v: ValorOut): number {
  return v.componentes
    .filter((c) => c.activo && !c.opcional)
    .reduce((acc, c) => {
      const cu = parseFloat(c.valor_unitario ?? "0");
      const cant = parseFloat(c.cantidad);
      return acc + (isNaN(cu) || isNaN(cant) ? 0 : cu * cant);
    }, 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NomencladorPorOS() {
  const [selectedNroOS, setSelectedNroOS] = useState<number | null>(null);
  const [osSearch, setOsSearch] = useState("");
  const [galenos, setGalenos] = useState<GalenoOut[]>([]);
  const [valores, setValores] = useState<ValorOut[]>([]);
  const [loadingValores, setLoadingValores] = useState(false);
  const [codeSearch, setCodeSearch] = useState("");
  // nomenclador_id → descripcion, resolved from catálogo for values with null descripcion
  const [nomDescMap, setNomDescMap] = useState<Record<number, string>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ValorForm>({
    nomencladorId: null,
    nomencladorLabel: "",
    modalidad: "calculable",
    vigencia_desde: today(),
    componentes: [emptyComp("calculable")],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Nomenclador search
  const [nomSearch, setNomSearch] = useState("");
  const [nomResults, setNomResults] = useState<NomencladorOut[]>([]);
  const [nomLoading, setNomLoading] = useState(false);
  const nomDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const { data: osList = [] } = useQuery({
    queryKey: ["obras-sociales"],
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });

  const filteredOS = useMemo(() => {
    if (!osSearch.trim()) return osList.slice(0, 80);
    const q = osSearch.toLowerCase();
    return osList
      .filter((os) => os.nombre?.toLowerCase().includes(q) || String(os.nro_obra_social).includes(q))
      .slice(0, 80);
  }, [osList, osSearch]);

  const selectedOS = osList.find((os) => os.nro_obra_social === selectedNroOS);

  // When OS changes: load galenos and valores
  useEffect(() => {
    if (!selectedNroOS) {
      setGalenos([]);
      setValores([]);
      setNomDescMap({});
      return;
    }

    listGalenos({ obra_social_nro: selectedNroOS }).then(setGalenos).catch(() => {});
    loadValores(selectedNroOS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNroOS]);

  const loadValores = useCallback(async (osNro: number) => {
    setLoadingValores(true);
    try {
      const data = await listValores({ obra_social_nro: osNro, estado: "activo", size: 200 });
      setValores(data);

      // Resolve descriptions from the catálogo for values that have none
      const idsNeedingDesc = [...new Set(
        data.filter((v) => !v.descripcion).map((v) => v.nomenclador_id)
      )];
      if (idsNeedingDesc.length > 0) {
        const results = await Promise.allSettled(idsNeedingDesc.map(getNomencladorById));
        const map: Record<number, string> = {};
        results.forEach((r, i) => {
          if (r.status === "fulfilled") map[idsNeedingDesc[i]] = r.value.descripcion;
        });
        setNomDescMap((prev) => ({ ...prev, ...map }));
      }
    } catch {
      showToast("error", "Error al cargar los valores.");
    } finally {
      setLoadingValores(false);
    }
  }, []);

  const resolvedDesc = useCallback(
    (v: ValorOut) => v.descripcion ?? nomDescMap[v.nomenclador_id] ?? "",
    [nomDescMap],
  );

  const filteredValores = useMemo(() => {
    if (!codeSearch.trim()) return valores;
    const q = codeSearch.toLowerCase();
    return valores.filter(
      (v) =>
        v.codigo.toLowerCase().includes(q) ||
        (v.descripcion ?? nomDescMap[v.nomenclador_id] ?? "").toLowerCase().includes(q),
    );
  }, [valores, codeSearch, nomDescMap]);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  // ─── Nomenclador search ────────────────────────────────────────────────────

  function searchNom(q: string) {
    setNomSearch(q);
    if (nomDebounce.current) clearTimeout(nomDebounce.current);
    if (q.trim().length < 2) { setNomResults([]); return; }

    setNomLoading(true);
    nomDebounce.current = setTimeout(async () => {
      try {
        const results = await listNomenclador({ q: q.trim(), activo: true, size: 12 });
        setNomResults(results);
      } catch {
        setNomResults([]);
      } finally {
        setNomLoading(false);
      }
    }, 300);
  }

  function selectNom(n: NomencladorOut) {
    setForm((prev) => ({ ...prev, nomencladorId: n.id, nomencladorLabel: `${n.codigo} — ${n.descripcion}` }));
    setNomSearch("");
    setNomResults([]);
    setErrors((prev) => ({ ...prev, nomenclador: "" }));
  }

  function clearNom() {
    setForm((prev) => ({ ...prev, nomencladorId: null, nomencladorLabel: "" }));
    setNomSearch("");
    setNomResults([]);
  }

  // ─── Modalidad change ──────────────────────────────────────────────────────

  function changeModalidad(m: ModalidadValor) {
    setForm((prev) => ({
      ...prev,
      modalidad: m,
      componentes: prev.componentes.map((c) => ({
        ...c,
        galeno_id: m === "fijo" ? null : c.galeno_id,
        cantidad: m === "fijo" ? "" : c.cantidad,
        valor_unitario: m === "calculable" ? "" : c.valor_unitario,
      })),
    }));
  }

  // ─── Components ───────────────────────────────────────────────────────────

  function addComp() {
    setForm((prev) => ({ ...prev, componentes: [...prev.componentes, emptyComp(prev.modalidad)] }));
  }

  function removeComp(idx: number) {
    setForm((prev) => ({ ...prev, componentes: prev.componentes.filter((_, i) => i !== idx) }));
  }

  function updateComp<K extends keyof ComponenteForm>(idx: number, key: K, value: ComponenteForm[K]) {
    setForm((prev) => {
      const comps = [...prev.componentes];
      comps[idx] = { ...comps[idx], [key]: value };
      return { ...prev, componentes: comps };
    });
  }

  // ─── Validation + Save ────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.nomencladorId) errs.nomenclador = "Seleccioná un código";
    if (!form.vigencia_desde) errs.vigencia_desde = "Requerido";
    if (form.componentes.length === 0) errs.componentes = "Agregá al menos un componente";
    form.componentes.forEach((c, i) => {
      if (form.modalidad === "calculable") {
        if (!c.galeno_id) errs[`comp_${i}_galeno`] = "Seleccioná un galeno";
      } else {
        if (!c.valor_unitario.trim() || isNaN(parseFloat(c.valor_unitario))) errs[`comp_${i}_valor`] = "Valor inválido";
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate() || !selectedNroOS) return;
    setSaving(true);
    try {
      const componentes: ComponentePayload[] = form.componentes.map((c, i) => ({
        concepto: c.concepto,
        galeno_id: form.modalidad === "calculable" ? c.galeno_id : null,
        cantidad: form.modalidad === "calculable" ? (parseFloat(c.cantidad) || 0) : 0,
        valor_unitario: form.modalidad === "fijo" ? parseFloat(c.valor_unitario) : null,
        opcional: c.opcional,
        orden: i,
      }));

      const v = await createValor({
        obra_social_nro: selectedNroOS,
        nomenclador_id: form.nomencladorId!,
        vigencia_desde: form.vigencia_desde,
        componentes,
      });

      setValores((prev) => [v, ...prev]);
      showToast("success", "Código agregado a la obra social.");
      setModalOpen(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast("error", msg ?? "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(v: ValorOut) {
    if (!confirm(`¿Cerrar el valor del código ${v.codigo} para esta obra social?`)) return;
    try {
      await deleteValor(v.id);
      setValores((prev) => prev.filter((x) => x.id !== v.id));
      showToast("success", "Valor cerrado.");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast("error", msg ?? "No se pudo cerrar el valor.");
    }
  }

  function openModal() {
    setForm({
      nomencladorId: null,
      nomencladorLabel: "",
      modalidad: "calculable",
      vigencia_desde: today(),
      componentes: [emptyComp("calculable")],
    });
    setNomSearch("");
    setNomResults([]);
    setErrors({});
    setModalOpen(true);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}><Building2 size={20} /></span>
        <div>
          <h1 className={styles.title}>Códigos por Obra Social</h1>
          <p className={styles.subtitle}>Listado y carga de códigos y precios por obra social</p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* OS panel */}
        <div className={styles.osPanel}>
          <div className={styles.osPanelHeader}>
            <p className={styles.osPanelTitle}>Obra social</p>
            <div className={styles.osSearchWrap}>
              <Search size={13} className={styles.osSearchIcon} />
              <input
                className={styles.osSearchInput}
                placeholder="Buscar…"
                value={osSearch}
                onChange={(e) => setOsSearch(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.osList}>
            {filteredOS.map((os) => (
              <button
                key={os.nro_obra_social}
                className={`${styles.osItem} ${selectedNroOS === os.nro_obra_social ? styles.osItemSelected : ""}`}
                onClick={() => { setSelectedNroOS(os.nro_obra_social); setCodeSearch(""); }}
              >
                <span className={styles.osNro}>{os.nro_obra_social}</span>
                <span className={styles.osNombre}>{os.nombre}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {!selectedNroOS ? (
            <div className={styles.noSelection}>
              <Building2 size={36} className={styles.noSelectionIcon} />
              <p>Seleccioná una obra social para ver sus códigos y precios</p>
            </div>
          ) : (
            <>
              <div className={styles.contentHeader}>
                <h2 className={styles.contentTitle}>{selectedOS?.nombre ?? `OS ${selectedNroOS}`}</h2>
              </div>

              <div className={styles.toolbar}>
                <div className={styles.searchWrap}>
                  <Search size={14} className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    placeholder="Buscar código…"
                    value={codeSearch}
                    onChange={(e) => setCodeSearch(e.target.value)}
                  />
                </div>
                <button className={styles.btnPrimary} onClick={openModal}>
                  <Plus size={14} /> Agregar código
                </button>
              </div>

              {/* Table */}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th>Componentes</th>
                      <th>Vigente desde</th>
                      <th className={styles.thActions}>Acc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingValores ? (
                      <tr><td colSpan={5} className={styles.loadingCell}>Cargando…</td></tr>
                    ) : filteredValores.length === 0 ? (
                      <tr><td colSpan={5} className={styles.emptyCell}>Sin códigos cargados</td></tr>
                    ) : filteredValores.map((v) => (
                      <tr key={v.id}>
                        <td><span className={styles.codeCell}>{v.codigo}</span></td>
                        <td>{resolvedDesc(v)}</td>
                        <td>
                          <div className={styles.componentList}>
                            {v.componentes.filter((c) => c.activo).map((c) => (
                              <span key={c.id} className={styles.componentChip}>
                                <strong>{c.concepto}</strong>
                                {c.galeno_id
                                  ? ` × ${c.cantidad}`
                                  : ` ${fmt.format(parseFloat(c.valor_unitario ?? "0"))}`
                                }
                                {c.opcional && " (opc)"}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "#718096" }}>{v.vigencia_desde}</td>
                        <td className={styles.actionsCell}>
                          <button className={styles.btnDanger} onClick={() => handleDelete(v)} title="Cerrar valor">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className={styles.cardList}>
                {filteredValores.map((v) => (
                  <div key={v.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <span className={styles.codeCell}>{v.codigo}</span>
                      <span className={styles.priceCell}>{fmt.format(sumValor(v))}</span>
                    </div>
                    <p className={styles.cardDesc}>{v.descripcion ?? ""}</p>
                    <div className={styles.cardActions}>
                      <button className={styles.btnDanger} onClick={() => handleDelete(v)}>
                        <Trash2 size={12} /> Cerrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Add code modal ── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>Agregar código</h2>
                  <p className={styles.modalSubtitle}>{selectedOS?.nombre}</p>
                </div>
                <button className={styles.modalClose} onClick={() => setModalOpen(false)}><XIcon size={18} /></button>
              </div>

              <div className={styles.modalBody}>
                {/* Nomenclador picker */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Código de nomenclador <span className={styles.req}>*</span></label>
                  {form.nomencladorId ? (
                    <div className={styles.selectedCode}>
                      <strong>{form.nomencladorLabel.split("—")[0].trim()}</strong>
                      <span style={{ color: "#4a5568" }}>{form.nomencladorLabel.split("—").slice(1).join("—").trim()}</span>
                      <button
                        style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#718096" }}
                        onClick={clearNom}
                      >
                        <XIcon size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className={styles.autocompleteWrap}>
                      <div style={{ position: "relative" }}>
                        <input
                          className={`${styles.formInput} ${errors.nomenclador ? styles.inputError : ""}`}
                          value={nomSearch}
                          onChange={(e) => searchNom(e.target.value)}
                          placeholder="Escribí código o descripción para buscar…"
                          style={{ paddingRight: nomLoading ? 36 : 12, width: "100%", boxSizing: "border-box" }}
                        />
                        {nomLoading && (
                          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#718096" }}>
                            <Loader2 size={14} style={{ animation: "spin .7s linear infinite" }} />
                          </span>
                        )}
                      </div>
                      {nomResults.length > 0 && (
                        <ul className={styles.autocompleteDropdown}>
                          {nomResults.map((n) => (
                            <li
                              key={n.id}
                              className={styles.autocompleteItem}
                              onMouseDown={(e) => { e.preventDefault(); selectNom(n); }}
                            >
                              <strong>{n.codigo}</strong> — {n.descripcion}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {errors.nomenclador && <span className={styles.errorMsg}>{errors.nomenclador}</span>}
                </div>

                {/* Vigencia */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Vigente desde <span className={styles.req}>*</span></label>
                  <input
                    type="date"
                    className={`${styles.formInput} ${errors.vigencia_desde ? styles.inputError : ""}`}
                    value={form.vigencia_desde}
                    onChange={(e) => { setForm((prev) => ({ ...prev, vigencia_desde: e.target.value })); setErrors((p) => ({ ...p, vigencia_desde: "" })); }}
                    style={{ maxWidth: 180 }}
                  />
                  {errors.vigencia_desde && <span className={styles.errorMsg}>{errors.vigencia_desde}</span>}
                </div>

                {/* Modalidad */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Tipo de valor</label>
                  <select
                    className={styles.formSelect}
                    value={form.modalidad}
                    onChange={(e) => changeModalidad(e.target.value as ModalidadValor)}
                    style={{ maxWidth: 220 }}
                  >
                    <option value="calculable">Calculable (galeno × cantidad)</option>
                    <option value="fijo">Fijo ($)</option>
                  </select>
                </div>

                {/* Componentes */}
                <div className={styles.sectionTitle}>Componentes de precio</div>
                {errors.componentes && <span className={styles.errorMsg}>{errors.componentes}</span>}

                <div className={styles.componentRows}>
                  {form.componentes.map((comp, i) => (
                    <div key={i} className={styles.componentRow}>
                      {/* Concepto */}
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Concepto</label>
                        <select
                          className={styles.formSelect}
                          value={comp.concepto}
                          onChange={(e) => updateComp(i, "concepto", e.target.value as ComponenteForm["concepto"])}
                        >
                          <option value="Honorarios">Honorarios</option>
                          <option value="Ayudante">Ayudante</option>
                          <option value="Gastos">Gastos</option>
                        </select>
                      </div>

                      {/* Galeno or fixed — based on form-level modalidad */}
                      {form.modalidad === "calculable" ? (
                        <>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Galeno</label>
                            <select
                              className={`${styles.formSelect} ${errors[`comp_${i}_galeno`] ? styles.inputError : ""}`}
                              value={comp.galeno_id ?? ""}
                              onChange={(e) => updateComp(i, "galeno_id", e.target.value ? Number(e.target.value) : null)}
                            >
                              <option value="">— Seleccionar —</option>
                              {galenos.filter((g) => g.activo).map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.codigo}{g.nivel != null ? ` (niv. ${g.nivel})` : ""} — {fmt.format(parseFloat(g.valor_unitario))}
                                </option>
                              ))}
                            </select>
                            {errors[`comp_${i}_galeno`] && <span className={styles.errorMsg}>{errors[`comp_${i}_galeno`]}</span>}
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Cantidad</label>
                            <input
                              type="number" min="0" step="0.01"
                              className={styles.formInput}
                              value={comp.cantidad}
                              onChange={(e) => updateComp(i, "cantidad", e.target.value)}
                              placeholder="0 = auto"
                            />
                          </div>
                        </>
                      ) : (
                        <div className={styles.formGroup} style={{ gridColumn: "span 2" }}>
                          <label className={styles.formLabel}>Valor fijo ($)</label>
                          <input
                            type="number" min="0" step="0.01"
                            className={`${styles.formInput} ${errors[`comp_${i}_valor`] ? styles.inputError : ""}`}
                            value={comp.valor_unitario}
                            onChange={(e) => updateComp(i, "valor_unitario", e.target.value)}
                            placeholder="0.00"
                          />
                          {errors[`comp_${i}_valor`] && <span className={styles.errorMsg}>{errors[`comp_${i}_valor`]}</span>}
                        </div>
                      )}

                      <div className={styles.formGroup} style={{ alignSelf: "flex-end" }}>
                        <label className={styles.formLabel} style={{ visibility: "hidden" }}>_</label>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.83rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={comp.opcional}
                            onChange={(e) => updateComp(i, "opcional", e.target.checked)}
                          />
                          Opcional
                        </label>
                      </div>

                      <button className={styles.btnRemoveComp} onClick={() => removeComp(i)} title="Quitar componente">
                        <XIcon size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button className={styles.btnAddComp} onClick={addComp}>
                  <Plus size={14} /> Agregar componente
                </button>
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.btnGhost} onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                  {saving ? <><span className={styles.spinner} /> Guardando…</> : <><Save size={15} /> Guardar</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
          >
            {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

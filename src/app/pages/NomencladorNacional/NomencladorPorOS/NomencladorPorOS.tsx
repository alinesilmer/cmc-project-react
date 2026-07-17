import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react";
import {
  Search, Plus, Trash2, X as XIcon, Save,
  Building2, CheckCircle2, AlertCircle, Loader2, Edit2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import styles from "./NomencladorPorOS.module.scss";
import {
  listGalenos, listValores, createValor, deleteValor,
  listNomenclador, getNomencladorById, updateValorMetadata, actualizarValor,
  listNomencladorEspecialidadesResumen,
} from "../nomenclador.api";
import ConfirmModal from "../../../components/atoms/ConfirmModal/ConfirmModal";
import { listObrasSociales } from "../../ObrasSociales/obrasSociales.api";
import { getEspecialidades } from "../../Especialidades/especialidades.api";
import EspecialidadCombo from "../EspecialidadCombo";
import type { ValorOut, GalenoOut, NomencladorOut, ComponentePayload, Origen } from "../nomenclador.types";
import { ORIGEN_LABELS } from "../nomenclador.types";
import { today, parseMonto } from "../nomenclador.helpers";

// ─── Local types ──────────────────────────────────────────────────────────────

type ModalidadValor = "calculable" | "fijo";
type ModalKind = "create" | "edit" | null;

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
  origen: Origen;
  modalidad: ModalidadValor;
  vigencia_desde: string;
  porPresupuesto: boolean;
  nivel: string;
  complejidad: string;
  observacion: string;
  especialidadId: number | null;
  especialidadSearch: string;
  componentes: ComponenteForm[];
};

type EditMetaForm = {
  descripcion: string;
  nivel: string;
  complejidad: string;
  observacion: string;
};

type EditEcuForm = {
  vigencia_desde: string;
  modalidad: ModalidadValor;
  componentes: ComponenteForm[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

const PAGE_SIZE = 25;

// El badge muestra "Valor Fijo" para NNE; el resto usa su etiqueta estándar.
function origenBadgeLabel(o: Origen): string {
  return o === "NNE" ? "Valor Fijo" : ORIGEN_LABELS[o];
}

const FIXED_CONCEPTOS: ComponenteForm["concepto"][] = ["Honorarios", "Gastos", "Ayudante"];

function initComps(): ComponenteForm[] {
  return FIXED_CONCEPTOS.map((concepto) => ({
    concepto, galeno_id: null, cantidad: "", valor_unitario: "",
    opcional: concepto !== "Honorarios",
  }));
}

function sumValor(v: ValorOut): number {
  return v.componentes.filter((c) => c.activo && !c.opcional).reduce((acc, c) => {
    if (c.tipo === "calculable") return acc + parseMonto(c.subtotal);
    return acc + parseMonto(c.valor_unitario);
  }, 0);
}

function compsFromOut(comps: ValorOut["componentes"]): ComponenteForm[] {
  return FIXED_CONCEPTOS.map((concepto) => {
    const ex = comps.find((c) => c.concepto === concepto && c.activo);
    return {
      concepto,
      galeno_id: ex?.galeno_id ?? null,
      cantidad: ex?.cantidad ?? "",
      valor_unitario: ex?.valor_unitario ?? "",
      opcional: concepto !== "Honorarios",
    };
  });
}

// ─── ComponentEditor (shared between create and edit) ─────────────────────────

type CompEditorProps = {
  modalidad: ModalidadValor;
  componentes: ComponenteForm[];
  galenos: GalenoOut[];
  errors: Record<string, string>;
  onChange: (idx: number, key: keyof ComponenteForm, value: ComponenteForm[keyof ComponenteForm]) => void;
};

function ComponentEditor({ modalidad, componentes, galenos, errors, onChange }: CompEditorProps) {
  return (
    <div className={styles.componentRows}>
      {componentes.map((comp, i) => (
        <div key={comp.concepto} className={styles.componentRow}>
          <div className={styles.compConceptLabel}>
            {comp.concepto}{i === 0 && <span className={styles.req}> *</span>}
          </div>
          {modalidad === "calculable" ? (
            <>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Galeno</label>
                <select
                  className={`${styles.formSelect} ${errors[`comp_${i}_galeno`] ? styles.inputError : ""}`}
                  value={comp.galeno_id ?? ""}
                  onChange={(e) => onChange(i, "galeno_id", e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— {i === 0 ? "Seleccionar" : "Opcional"} —</option>
                  {galenos.filter((g) => g.activo).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.codigo}{g.nivel != null ? ` (niv. ${g.nivel})` : ""} — {fmt.format(parseMonto(g.valor_unitario))}
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
                  onChange={(e) => onChange(i, "cantidad", e.target.value)}
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
                onChange={(e) => onChange(i, "valor_unitario", e.target.value)}
                placeholder={i === 0 ? "0.00" : "Dejar vacío si no aplica"}
              />
              {errors[`comp_${i}_valor`] && <span className={styles.errorMsg}>{errors[`comp_${i}_valor`]}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NomencladorPorOS() {
  const [selectedNroOS, setSelectedNroOS] = useState<number | null>(null);
  const [osSearch, setOsSearch] = useState("");
  const [galenos, setGalenos] = useState<GalenoOut[]>([]);
  const [valores, setValores] = useState<ValorOut[]>([]);
  const [loadingValores, setLoadingValores] = useState(false);
  const [codeSearch, setCodeSearch] = useState("");
  const [nomDescMap, setNomDescMap] = useState<Record<number, string>>({});
  const [origenFilter, setOrigenFilter] = useState<Origen | "todos">("todos");
  const [soloPresupuesto, setSoloPresupuesto] = useState(false);
  const [especialidadFilter, setEspecialidadFilter] = useState<number | "todos">("todos");
  const [page, setPage] = useState(1);
  const descAttempted = useRef<Set<number>>(new Set());

  // Modal
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [editTarget, setEditTarget] = useState<ValorOut | null>(null);

  // Create form
  const [form, setForm] = useState<ValorForm>({
    nomencladorId: null, nomencladorLabel: "", origen: "NNE",
    modalidad: "calculable", vigencia_desde: today(),
    porPresupuesto: false, nivel: "", complejidad: "", observacion: "",
    especialidadId: null, especialidadSearch: "", componentes: initComps(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Edit forms
  const [editMeta, setEditMeta] = useState<EditMetaForm>({ descripcion: "", nivel: "", complejidad: "", observacion: "" });
  const [editEcu, setEditEcu] = useState<EditEcuForm>({ vigencia_desde: today(), modalidad: "calculable", componentes: initComps() });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingEcu, setSavingEcu] = useState(false);

  // Nomenclador search
  const [nomSearch, setNomSearch] = useState("");
  const [nomResults, setNomResults] = useState<NomencladorOut[]>([]);
  const [nomLoading, setNomLoading] = useState(false);
  const nomDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ValorOut | null>(null);

  const { data: osList = [] } = useQuery({
    queryKey: ["obras-sociales"],
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: especialidades = [] } = useQuery({
    queryKey: ["especialidades"],
    queryFn: getEspecialidades,
    staleTime: 30 * 60 * 1000,
  });

  const espMap = useMemo(() => {
    const m: Record<number, string> = {};
    especialidades.forEach((e) => { m[e.id_colegio_espe] = e.nombre; });
    return m;
  }, [especialidades]);

  // IDs de nomenclador conectados a la especialidad elegida (para acotar el listado).
  // Se traen todos los pares de la especialidad (paginando) y se guardan como Set.
  const { data: codigosDeEspecialidad, isFetching: espFilterFetching } = useQuery({
    queryKey: ["nomenclador-especialidad-codigos", especialidadFilter],
    queryFn: async () => {
      const ids = new Set<number>();
      for (let p = 1; p <= 100; p++) {
        const batch = await listNomencladorEspecialidadesResumen({
          especialidad_id_colegio: especialidadFilter as number,
          page: p,
          size: 200,
        });
        batch.forEach((r) => ids.add(r.nomenclador_id));
        if (batch.length < 200) break;
      }
      return ids;
    },
    enabled: especialidadFilter !== "todos",
    staleTime: 5 * 60 * 1000,
  });

  const filteredOS = useMemo(() => {
    if (!osSearch.trim()) return osList.slice(0, 80);
    const q = osSearch.toLowerCase();
    return osList
      .filter((os) => os.nombre?.toLowerCase().includes(q) || String(os.nro_obra_social).includes(q))
      .slice(0, 80);
  }, [osList, osSearch]);

  const selectedOS = osList.find((os) => os.nro_obra_social === selectedNroOS);

  useEffect(() => {
    descAttempted.current = new Set();
    setNomDescMap({});
    if (!selectedNroOS) { setGalenos([]); setValores([]); return; }
    listGalenos({ obra_social_nro: selectedNroOS }).then(setGalenos).catch(() => {});
    loadValores(selectedNroOS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNroOS]);

  const loadValores = useCallback(async (osNro: number) => {
    setLoadingValores(true);
    try {
      // Traer TODOS los valores activos (paginando la API) para agrupar/filtrar/paginar bien.
      const all: ValorOut[] = [];
      for (let p = 1; p <= 100; p++) {
        const batch = await listValores({ obra_social_nro: osNro, estado: "activo", page: p, size: 200 });
        all.push(...batch);
        if (batch.length < 200) break;
      }
      setValores(all);
    } catch { showToast("error", "Error al cargar los valores."); }
    finally { setLoadingValores(false); }
  }, []);

  const resolvedDesc = useCallback((v: ValorOut) => v.descripcion ?? nomDescMap[v.nomenclador_id] ?? "", [nomDescMap]);

  const filteredValores = useMemo(() => {
    let list = valores;
    if (origenFilter !== "todos") list = list.filter((v) => v.origen === origenFilter);
    if (soloPresupuesto) list = list.filter((v) => v.por_presupuesto);
    if (especialidadFilter !== "todos") {
      // Mientras el set carga (undefined) no mostramos nada para no confundir.
      list = codigosDeEspecialidad ? list.filter((v) => codigosDeEspecialidad.has(v.nomenclador_id)) : [];
    }
    if (codeSearch.trim()) {
      const q = codeSearch.toLowerCase();
      list = list.filter((v) => v.codigo.toLowerCase().includes(q) || (v.descripcion ?? nomDescMap[v.nomenclador_id] ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [valores, codeSearch, origenFilter, soloPresupuesto, nomDescMap, especialidadFilter, codigosDeEspecialidad]);

  // Loading combinado: valores de la OS + resolución del set de la especialidad.
  const showLoading = loadingValores || (especialidadFilter !== "todos" && !codigosDeEspecialidad && espFilterFetching);

  const grouped = useMemo(() => {
    const map = new Map<number, ValorOut[]>();
    for (const v of filteredValores) {
      const arr = map.get(v.nomenclador_id) ?? [];
      arr.push(v);
      map.set(v.nomenclador_id, arr);
    }
    return Array.from(map.entries());
  }, [filteredValores]);

  const totalPages = Math.max(1, Math.ceil(grouped.length / PAGE_SIZE));
  const pageGroups = useMemo(
    () => grouped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [grouped, page],
  );

  // Volver a la página 1 cuando cambian OS, búsqueda o filtro de origen.
  useEffect(() => { setPage(1); }, [selectedNroOS, codeSearch, origenFilter, soloPresupuesto, especialidadFilter]);
  // Ajustar si la página quedó fuera de rango (p. ej. tras cerrar un valor).
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  // Resolver descripciones faltantes SOLO para los códigos visibles (lazy, acotado por página).
  useEffect(() => {
    const ids = [...new Set(
      pageGroups
        .flatMap(([, vs]) => vs)
        .filter((v) => !v.descripcion && !descAttempted.current.has(v.nomenclador_id))
        .map((v) => v.nomenclador_id),
    )];
    if (ids.length === 0) return;
    ids.forEach((id) => descAttempted.current.add(id));
    let alive = true;
    Promise.allSettled(ids.map(getNomencladorById)).then((results) => {
      if (!alive) return;
      const map: Record<number, string> = {};
      results.forEach((r, i) => { if (r.status === "fulfilled") map[ids[i]] = r.value.descripcion; });
      if (Object.keys(map).length) setNomDescMap((prev) => ({ ...prev, ...map }));
    });
    return () => { alive = false; };
  }, [pageGroups]);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  // ─── Nomenclador autocomplete ──────────────────────────────────────────────

  function searchNom(q: string) {
    setNomSearch(q);
    if (nomDebounce.current) clearTimeout(nomDebounce.current);
    if (q.trim().length < 2) { setNomResults([]); return; }
    setNomLoading(true);
    nomDebounce.current = setTimeout(async () => {
      try {
        const results = await listNomenclador({ q: q.trim(), activo: true, size: 12 });
        setNomResults(results);
      } catch { setNomResults([]); }
      finally { setNomLoading(false); }
    }, 300);
  }

  function selectNom(n: NomencladorOut) {
    setForm((prev) => ({ ...prev, nomencladorId: n.id, nomencladorLabel: `${n.codigo} — ${n.descripcion}` }));
    setNomSearch(""); setNomResults([]);
    setErrors((prev) => ({ ...prev, nomenclador: "" }));
  }

  function clearNom() {
    setForm((prev) => ({ ...prev, nomencladorId: null, nomencladorLabel: "" }));
    setNomSearch(""); setNomResults([]);
  }

  // ─── Especialidad filter ───────────────────────────────────────────────────

  const filteredEsp = useMemo(() => {
    if (!form.especialidadSearch.trim()) return especialidades.slice(0, 20);
    const q = form.especialidadSearch.toLowerCase();
    return especialidades
      .filter((e) => e.nombre.toLowerCase().includes(q) || String(e.id_colegio_espe).includes(q))
      .slice(0, 20);
  }, [especialidades, form.especialidadSearch]);

  // ─── Origin + modalidad rules ──────────────────────────────────────────────

  function changeOrigen(o: Origen) {
    setForm((prev) => {
      const next: ValorForm = { ...prev, origen: o };
      if (o === "NN") {
        next.modalidad = "calculable";
        next.porPresupuesto = false;
        next.especialidadId = null;
        next.especialidadSearch = "";
      }
      if (o === "NNE") {
        next.especialidadId = null;
        next.especialidadSearch = "";
      }
      return next;
    });
  }

  function changeModalidad(m: ModalidadValor) {
    setForm((prev) => ({
      ...prev, modalidad: m,
      componentes: prev.componentes.map((c) => ({
        ...c,
        galeno_id: m === "fijo" ? null : c.galeno_id,
        cantidad: m === "fijo" ? "" : c.cantidad,
        valor_unitario: m === "calculable" ? "" : c.valor_unitario,
      })),
    }));
  }

  function changeEditModalidad(m: ModalidadValor) {
    setEditEcu((prev) => ({
      ...prev, modalidad: m,
      componentes: prev.componentes.map((c) => ({
        ...c,
        galeno_id: m === "fijo" ? null : c.galeno_id,
        cantidad: m === "fijo" ? "" : c.cantidad,
        valor_unitario: m === "calculable" ? "" : c.valor_unitario,
      })),
    }));
  }

  // ─── Component update helpers ──────────────────────────────────────────────

  function updateComp<K extends keyof ComponenteForm>(idx: number, key: K, value: ComponenteForm[K]) {
    setForm((prev) => {
      const comps = [...prev.componentes];
      comps[idx] = { ...comps[idx], [key]: value };
      return { ...prev, componentes: comps };
    });
  }

  function updateEditComp<K extends keyof ComponenteForm>(idx: number, key: K, value: ComponenteForm[K]) {
    setEditEcu((prev) => {
      const comps = [...prev.componentes];
      comps[idx] = { ...comps[idx], [key]: value };
      return { ...prev, componentes: comps };
    });
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  function validateCreate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.nomencladorId) errs.nomenclador = "Seleccioná un código";
    if (!form.vigencia_desde) errs.vigencia_desde = "Requerido";
    if (!form.porPresupuesto) {
      const hon = form.componentes[0];
      if (form.modalidad === "calculable") {
        if (!hon.galeno_id) errs["comp_0_galeno"] = "Seleccioná un galeno";
      } else {
        if (!hon.valor_unitario.trim() || isNaN(parseFloat(hon.valor_unitario)))
          errs["comp_0_valor"] = "Valor inválido";
      }
      form.componentes.slice(1).forEach((c, i) => {
        const idx = i + 1;
        if (form.modalidad === "calculable" && c.cantidad && !c.galeno_id)
          errs[`comp_${idx}_galeno`] = "Seleccioná un galeno";
        if (form.modalidad === "fijo" && c.valor_unitario.trim() && isNaN(parseFloat(c.valor_unitario)))
          errs[`comp_${idx}_valor`] = "Valor inválido";
      });
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateEcuacion(): boolean {
    const errs: Record<string, string> = {};
    if (!editEcu.vigencia_desde) errs.vigencia_desde = "Requerido";
    const hon = editEcu.componentes[0];
    if (editEcu.modalidad === "calculable") {
      if (!hon.galeno_id) errs["comp_0_galeno"] = "Seleccioná un galeno";
    } else {
      if (!hon.valor_unitario.trim() || isNaN(parseFloat(hon.valor_unitario)))
        errs["comp_0_valor"] = "Valor inválido";
    }
    editEcu.componentes.slice(1).forEach((c, i) => {
      const idx = i + 1;
      if (editEcu.modalidad === "calculable" && c.cantidad && !c.galeno_id)
        errs[`comp_${idx}_galeno`] = "Seleccioná un galeno";
      if (editEcu.modalidad === "fijo" && c.valor_unitario.trim() && isNaN(parseFloat(c.valor_unitario)))
        errs[`comp_${idx}_valor`] = "Valor inválido";
    });
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Open modals ───────────────────────────────────────────────────────────

  function openCreate() {
    setForm({
      nomencladorId: null, nomencladorLabel: "", origen: "NNE",
      modalidad: "calculable", vigencia_desde: today(),
      porPresupuesto: false, nivel: "", complejidad: "", observacion: "",
      especialidadId: null, especialidadSearch: "", componentes: initComps(),
    });
    setNomSearch(""); setNomResults([]); setErrors({});
    setModalKind("create");
  }

  function openEdit(v: ValorOut) {
    const mod: ModalidadValor = v.modalidad === "galeno" ? "calculable" : "fijo";
    setEditTarget(v);
    setEditMeta({
      descripcion: v.descripcion ?? "",
      nivel: v.nivel != null ? String(v.nivel) : "",
      complejidad: v.complejidad ?? "",
      observacion: v.observacion ?? "",
    });
    setEditEcu({ vigencia_desde: today(), modalidad: mod, componentes: compsFromOut(v.componentes) });
    setEditErrors({});
    setModalKind("edit");
  }

  // ─── Save actions ──────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validateCreate() || !selectedNroOS) return;
    setSaving(true);
    try {
      let componentes: ComponentePayload[] = [];
      if (!form.porPresupuesto) {
        const filled = form.componentes.filter((c, i) => {
          if (i === 0) return true;
          if (form.modalidad === "calculable") return c.galeno_id != null;
          return c.valor_unitario.trim() !== "" && !isNaN(parseFloat(c.valor_unitario));
        });
        componentes = filled.map((c, i) => ({
          concepto: c.concepto,
          galeno_id: form.modalidad === "calculable" ? c.galeno_id : null,
          cantidad: form.modalidad === "calculable" ? (parseFloat(c.cantidad) || 0) : 0,
          valor_unitario: form.modalidad === "fijo" ? parseFloat(c.valor_unitario) : null,
          opcional: c.opcional,
          orden: i,
        }));
      }
      const v = await createValor({
        obra_social_nro: selectedNroOS,
        nomenclador_id: form.nomencladorId!,
        origen: form.origen,
        nivel: form.nivel ? parseInt(form.nivel, 10) : null,
        complejidad: form.complejidad || null,
        especialidad_id_colegio: form.origen === "NE" ? form.especialidadId : null,
        por_presupuesto: form.porPresupuesto,
        vigencia_desde: form.vigencia_desde,
        observacion: form.observacion || null,
        componentes,
      });
      setValores((prev) => [v, ...prev]);
      showToast("success", "Código agregado a la obra social.");
      setModalKind(null);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast("error", msg ?? "No se pudo guardar.");
    } finally { setSaving(false); }
  }

  async function handleSaveMeta() {
    if (!editTarget) return;
    setSavingMeta(true);
    try {
      const updated = await updateValorMetadata(editTarget.id, {
        descripcion: editMeta.descripcion || null,
        nivel: editMeta.nivel ? parseInt(editMeta.nivel, 10) : null,
        complejidad: editMeta.complejidad || null,
        observacion: editMeta.observacion || null,
      });
      setValores((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      setEditTarget(updated);
      showToast("success", "Metadatos actualizados.");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast("error", msg ?? "No se pudo actualizar.");
    } finally { setSavingMeta(false); }
  }

  async function handleActualizar() {
    if (!editTarget || !validateEcuacion()) return;
    setSavingEcu(true);
    try {
      const filled = editEcu.componentes.filter((c, i) => {
        if (i === 0) return true;
        if (editEcu.modalidad === "calculable") return c.galeno_id != null;
        return c.valor_unitario.trim() !== "" && !isNaN(parseFloat(c.valor_unitario));
      });
      const componentes: ComponentePayload[] = filled.map((c, i) => ({
        concepto: c.concepto,
        galeno_id: editEcu.modalidad === "calculable" ? c.galeno_id : null,
        cantidad: editEcu.modalidad === "calculable" ? (parseFloat(c.cantidad) || 0) : 0,
        valor_unitario: editEcu.modalidad === "fijo" ? parseFloat(c.valor_unitario) : null,
        opcional: c.opcional,
        orden: i,
      }));
      await actualizarValor(editTarget.id, { vigencia_desde: editEcu.vigencia_desde, componentes });
      showToast("success", "Ecuación actualizada. Recargando…");
      setModalKind(null);
      if (selectedNroOS) loadValores(selectedNroOS);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast("error", msg ?? "No se pudo actualizar la ecuación.");
    } finally { setSavingEcu(false); }
  }

  async function doDelete() {
    if (!deleteTarget) return;
    const v = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteValor(v.id);
      setValores((prev) => prev.filter((x) => x.id !== v.id));
      showToast("success", "Valor cerrado.");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast("error", msg ?? "No se pudo cerrar el valor.");
    }
  }

  function handleDelete(v: ValorOut) { setDeleteTarget(v); }

  // ─── Render ────────────────────────────────────────────────────────────────

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
        {/* ── OS panel ── */}
        <div className={styles.osPanel}>
          <div className={styles.osPanelHeader}>
            <p className={styles.osPanelTitle}>Obra social</p>
            <div className={styles.osSearchWrap}>
              <Search size={13} className={styles.osSearchIcon} />
              <input className={styles.osSearchInput} placeholder="Buscar…" value={osSearch} onChange={(e) => setOsSearch(e.target.value)} />
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

        {/* ── Content ── */}
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
                  <input className={styles.searchInput} placeholder="Buscar código…" value={codeSearch} onChange={(e) => setCodeSearch(e.target.value)} />
                </div>
                <div className={styles.filterGroup}>
                  {(["todos", "NNE", "NN", "NE"] as const).map((o) => (
                    <button
                      key={o}
                      className={`${styles.filterBtn} ${origenFilter === o ? styles.filterBtnActive : ""}`}
                      onClick={() => setOrigenFilter(o)}
                    >
                      {o === "todos" ? "Todos" : o === "NNE" ? "Valor Fijo" : o}
                    </button>
                  ))}
                </div>
                <div className={styles.filterGroup}>
                  <button
                    className={`${styles.filterBtn} ${soloPresupuesto ? styles.filterBtnActive : ""}`}
                    onClick={() => setSoloPresupuesto((v) => !v)}
                    title="Mostrar solo códigos por presupuesto"
                    aria-pressed={soloPresupuesto}
                  >
                    Por presupuesto
                  </button>
                </div>
                <EspecialidadCombo
                  especialidades={especialidades}
                  value={especialidadFilter === "todos" ? null : especialidadFilter}
                  onChange={(v) => setEspecialidadFilter(v === null ? "todos" : v)}
                />
                <button className={styles.btnPrimary} onClick={openCreate}><Plus size={14} /> Agregar código</button>
              </div>

              {/* Table */}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Origen</th>
                      <th>Especialidad</th>
                      <th>Nivel</th>
                      <th>Precio</th>
                      <th>Vigente desde</th>
                      <th className={styles.thActions}>Acc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showLoading ? (
                      <tr><td colSpan={6} className={styles.loadingCell}>Cargando…</td></tr>
                    ) : grouped.length === 0 ? (
                      <tr><td colSpan={6} className={styles.emptyCell}>
                        {especialidadFilter !== "todos" ? "Sin códigos de esta especialidad" : "Sin códigos cargados"}
                      </td></tr>
                    ) : pageGroups.map(([nomId, variants]) => {
                      const first = variants[0];
                      return (
                        <Fragment key={nomId}>
                          <tr className={styles.groupHeader}>
                            <td colSpan={6}>
                              <span className={styles.codeCell}>{first.codigo}</span>
                              {resolvedDesc(first) && <span className={styles.groupDesc}> — {resolvedDesc(first)}</span>}
                            </td>
                          </tr>
                          {variants.map((v) => (
                            <tr key={v.id} className={styles.variantRow}>
                              <td>
                                <span className={`${styles.origenBadge} ${styles[`origen${v.origen}` as keyof typeof styles]}`}>
                                  {origenBadgeLabel(v.origen)}
                                </span>
                              </td>
                              <td className={styles.mutedText}>
                                {v.especialidad_id_colegio
                                  ? (espMap[v.especialidad_id_colegio] ?? `Esp. ${v.especialidad_id_colegio}`)
                                  : "—"}
                              </td>
                              <td className={styles.mutedText}>{v.nivel != null ? `Niv. ${v.nivel}` : "—"}</td>
                              <td>
                                {v.por_presupuesto
                                  ? <span className={styles.presupuestoChip}>Por presupuesto</span>
                                  : <span className={styles.priceCell}>{fmt.format(sumValor(v))}</span>}
                              </td>
                              <td className={styles.mutedText}>{v.vigencia_desde}</td>
                              <td>
                                <div className={styles.actionsCell}>
                                  <button className={styles.btnEdit} onClick={() => openEdit(v)} title="Editar"><Edit2 size={12} /></button>
                                  <button className={styles.btnDanger} onClick={() => handleDelete(v)} title="Cerrar"><Trash2 size={12} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className={styles.cardList}>
                {pageGroups.flatMap(([, vs]) => vs).map((v) => (
                  <div key={v.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <span className={styles.codeCell}>{v.codigo}</span>
                      <span className={styles.priceCell}>
                        {v.por_presupuesto ? "Por presupuesto" : fmt.format(sumValor(v))}
                      </span>
                    </div>
                    <p className={styles.cardDesc}>{resolvedDesc(v)}</p>
                    <div className={styles.cardActions}>
                      <button className={styles.btnEdit} onClick={() => openEdit(v)}><Edit2 size={12} /> Editar</button>
                      <button className={styles.btnDanger} onClick={() => handleDelete(v)}><Trash2 size={12} /> Cerrar</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginación */}
              {!showLoading && grouped.length > 0 && (
                <div className={styles.pagination}>
                  <span className={styles.pageInfo}>
                    {grouped.length} código{grouped.length !== 1 ? "s" : ""}
                    {totalPages > 1 ? ` · Página ${page} de ${totalPages}` : ""}
                  </span>
                  {totalPages > 1 && (
                    <div className={styles.pageBtns}>
                      <button
                        className={styles.pageBtn}
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Anterior
                      </button>
                      <button
                        className={styles.pageBtn}
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Create modal ── */}
      <AnimatePresence>
        {modalKind === "create" && (
          <motion.div className={styles.backdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>Agregar código</h2>
                  <p className={styles.modalSubtitle}>{selectedOS?.nombre}</p>
                </div>
                <button className={styles.modalClose} onClick={() => setModalKind(null)}><XIcon size={18} /></button>
              </div>

              <div className={styles.modalBody}>
                {/* Nomenclador picker */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Código de nomenclador <span className={styles.req}>*</span></label>
                  {form.nomencladorId ? (
                    <div className={styles.selectedCode}>
                      <strong>{form.nomencladorLabel.split("—")[0].trim()}</strong>
                      <span style={{ color: "#4a5568" }}>{form.nomencladorLabel.split("—").slice(1).join("—").trim()}</span>
                      <button style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#718096" }} onClick={clearNom}>
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
                            <li key={n.id} className={styles.autocompleteItem} onMouseDown={(e) => { e.preventDefault(); selectNom(n); }}>
                              <strong>{n.codigo}</strong> — {n.descripcion}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {errors.nomenclador && <span className={styles.errorMsg}>{errors.nomenclador}</span>}
                </div>

                {/* Origen + nivel */}
                <div className={styles.formRow2}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Origen <span className={styles.req}>*</span></label>
                    <select className={styles.formSelect} value={form.origen} onChange={(e) => changeOrigen(e.target.value as Origen)}>
                      {(Object.entries(ORIGEN_LABELS) as [Origen, string][]).map(([k, label]) => (
                        <option key={k} value={k}>{label} ({k})</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Nivel</label>
                    <input
                      type="number" min="1" step="1" className={styles.formInput}
                      value={form.nivel}
                      onChange={(e) => setForm((p) => ({ ...p, nivel: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                {/* Especialidad — solo NE */}
                {form.origen === "NE" && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Especialidad</label>
                    {form.especialidadId ? (
                      <div className={styles.selectedCode}>
                        <span>{espMap[form.especialidadId] ?? `Esp. ${form.especialidadId}`}</span>
                        <button style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#718096" }} onClick={() => setForm((p) => ({ ...p, especialidadId: null, especialidadSearch: "" }))}>
                          <XIcon size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className={styles.autocompleteWrap}>
                        <input
                          className={styles.formInput}
                          value={form.especialidadSearch}
                          onChange={(e) => setForm((p) => ({ ...p, especialidadSearch: e.target.value }))}
                          placeholder="Buscar especialidad…"
                          style={{ width: "100%", boxSizing: "border-box" }}
                        />
                        {form.especialidadSearch.trim() && filteredEsp.length > 0 && (
                          <ul className={styles.autocompleteDropdown}>
                            {filteredEsp.map((e) => (
                              <li key={e.id} className={styles.autocompleteItem} onMouseDown={(ev) => { ev.preventDefault(); setForm((p) => ({ ...p, especialidadId: e.id_colegio_espe, especialidadSearch: "" })); }}>
                                {e.nombre} <span style={{ color: "#718096", fontSize: "0.75rem" }}>({e.id_colegio_espe})</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    <span className={styles.hintText}>Dejar vacío para variante base NE</span>
                  </div>
                )}

                {/* Vigencia + complejidad */}
                <div className={styles.formRow2}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Vigente desde <span className={styles.req}>*</span></label>
                    <input
                      type="date"
                      className={`${styles.formInput} ${errors.vigencia_desde ? styles.inputError : ""}`}
                      value={form.vigencia_desde}
                      onChange={(e) => { setForm((p) => ({ ...p, vigencia_desde: e.target.value })); setErrors((p) => ({ ...p, vigencia_desde: "" })); }}
                    />
                    {errors.vigencia_desde && <span className={styles.errorMsg}>{errors.vigencia_desde}</span>}
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Complejidad</label>
                    <select className={styles.formSelect} value={form.complejidad} onChange={(e) => setForm((p) => ({ ...p, complejidad: e.target.value }))}>
                      <option value="">— Hereda del nomenclador —</option>
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </div>

                {/* Por presupuesto toggle */}
                <label className={styles.toggleRow}>
                  <input
                    type="checkbox"
                    className={styles.toggleInput}
                    checked={form.porPresupuesto}
                    disabled={form.origen === "NN"}
                    onChange={(e) => setForm((p) => ({ ...p, porPresupuesto: e.target.checked }))}
                  />
                  <span className={styles.toggleLabel}>Por presupuesto</span>
                  {form.origen === "NN" && <span className={styles.hintText}>&nbsp;(no disponible para NN)</span>}
                </label>

                {!form.porPresupuesto && (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Tipo de valor</label>
                      <select
                        className={styles.formSelect}
                        value={form.modalidad}
                        disabled={form.origen === "NN"}
                        onChange={(e) => changeModalidad(e.target.value as ModalidadValor)}
                        style={{ maxWidth: 260 }}
                      >
                        <option value="calculable">Calculable (galeno × cantidad)</option>
                        <option value="fijo">Fijo ($)</option>
                      </select>
                      {form.origen === "NN" && <span className={styles.hintText}>NN siempre usa galenos calculables</span>}
                    </div>
                    <div className={styles.sectionTitle}>Componentes de precio</div>
                    <ComponentEditor modalidad={form.modalidad} componentes={form.componentes} galenos={galenos} errors={errors} onChange={updateComp} />
                  </>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Observación</label>
                  <input className={styles.formInput} value={form.observacion} onChange={(e) => setForm((p) => ({ ...p, observacion: e.target.value }))} placeholder="Opcional" />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.btnGhost} onClick={() => setModalKind(null)}>Cancelar</button>
                <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                  {saving ? <><span className={styles.spinner} /> Guardando…</> : <><Save size={15} /> Guardar</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit modal ── */}
      <AnimatePresence>
        {modalKind === "edit" && editTarget && (
          <motion.div className={styles.backdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className={`${styles.modal} ${styles.modalLg}`}
              initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>
                    Editar — <span className={styles.codeCell}>{editTarget.codigo}</span>
                  </h2>
                  <p className={styles.modalSubtitle}>
                    {origenBadgeLabel(editTarget.origen)}
                    {editTarget.especialidad_id_colegio ? ` · ${espMap[editTarget.especialidad_id_colegio] ?? `Esp. ${editTarget.especialidad_id_colegio}`}` : ""}
                    {editTarget.nivel != null ? ` · Niv. ${editTarget.nivel}` : ""}
                  </p>
                </div>
                <button className={styles.modalClose} onClick={() => setModalKind(null)}><XIcon size={18} /></button>
              </div>

              <div className={styles.modalBody}>
                {/* Metadatos section */}
                <div className={styles.editSection}>
                  <div className={styles.editSectionTitle}>Metadatos</div>
                  <div className={styles.formRow2}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Descripción</label>
                      <input className={styles.formInput} value={editMeta.descripcion} onChange={(e) => setEditMeta((p) => ({ ...p, descripcion: e.target.value }))} placeholder="Opcional" />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Nivel</label>
                      <input type="number" min="1" step="1" className={styles.formInput} value={editMeta.nivel} onChange={(e) => setEditMeta((p) => ({ ...p, nivel: e.target.value }))} placeholder="Opcional" />
                    </div>
                  </div>
                  <div className={styles.formRow2}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Complejidad</label>
                      <select className={styles.formSelect} value={editMeta.complejidad} onChange={(e) => setEditMeta((p) => ({ ...p, complejidad: e.target.value }))}>
                        <option value="">— Hereda del nomenclador —</option>
                        <option value="baja">Baja</option>
                        <option value="media">Media</option>
                        <option value="alta">Alta</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Observación</label>
                      <input className={styles.formInput} value={editMeta.observacion} onChange={(e) => setEditMeta((p) => ({ ...p, observacion: e.target.value }))} placeholder="Opcional" />
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button className={styles.btnPrimary} onClick={handleSaveMeta} disabled={savingMeta}>
                      {savingMeta ? <><span className={styles.spinner} /> Guardando…</> : <><Save size={14} /> Guardar metadatos</>}
                    </button>
                  </div>
                </div>

                {/* Actualizar ecuación section */}
                {!editTarget.por_presupuesto && (
                  <div className={styles.editSection}>
                    <div className={styles.editSectionTitle}>Actualizar ecuación de precio</div>
                    <p className={styles.hintText}>Cierra la vigencia actual y crea una nueva con la ecuación que ingreses.</p>
                    <div className={styles.formRow2}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Nueva vigencia desde <span className={styles.req}>*</span></label>
                        <input
                          type="date"
                          className={`${styles.formInput} ${editErrors.vigencia_desde ? styles.inputError : ""}`}
                          value={editEcu.vigencia_desde}
                          onChange={(e) => { setEditEcu((p) => ({ ...p, vigencia_desde: e.target.value })); setEditErrors((p) => ({ ...p, vigencia_desde: "" })); }}
                        />
                        {editErrors.vigencia_desde && <span className={styles.errorMsg}>{editErrors.vigencia_desde}</span>}
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Tipo de valor</label>
                        <select className={styles.formSelect} value={editEcu.modalidad} onChange={(e) => changeEditModalidad(e.target.value as ModalidadValor)}>
                          <option value="calculable">Calculable (galeno × cantidad)</option>
                          <option value="fijo">Fijo ($)</option>
                        </select>
                      </div>
                    </div>
                    <ComponentEditor modalidad={editEcu.modalidad} componentes={editEcu.componentes} galenos={galenos} errors={editErrors} onChange={updateEditComp} />
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                      <button className={styles.btnWarning} onClick={handleActualizar} disabled={savingEcu}>
                        {savingEcu ? <><span className={styles.spinner} /> Actualizando…</> : "Actualizar ecuación"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.btnGhost} onClick={() => setModalKind(null)}>Cerrar</button>
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

      <ConfirmModal
        isOpen={deleteTarget !== null}
        variant="danger"
        title="Cerrar valor"
        message={`¿Cerrar el valor del código ${deleteTarget?.codigo} para esta obra social? Esta acción no se puede deshacer.`}
        confirmLabel="Cerrar valor"
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

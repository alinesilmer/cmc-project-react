import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react";
import {
  Search, Plus, Trash2, X as XIcon, Save,
  Building2, CheckCircle2, AlertCircle, Loader2, Edit2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import styles from "./NomencladorPorOS.module.scss";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import {
  listGalenos, listValores, createValor, createValorMulti, deleteValor,
  listNomenclador, actualizarValor,
  listCodigosPorEspecialidad, getNomencladorById, updateNucleoPar,
  getFamiliaObraSocial, replicarValoresEnFamilia,
} from "../nomenclador.api";
import MultiSelectBuscable from "../../../components/molecules/MultiSelectBuscable/MultiSelectBuscable";
import ReplicarFamiliaBlock, {
  ErrorReplica, ResultadoReplica,
} from "../../../components/molecules/ReplicarFamilia/ReplicarFamiliaBlock";
import {
  REPLICA_INICIAL, destinosReplica, type ReplicaState,
} from "../../../components/molecules/ReplicarFamilia/replicaState";
import ConfirmModal from "../../../components/atoms/ConfirmModal/ConfirmModal";
import { getEspecialidades } from "../../Especialidades/especialidades.api";
import EspecialidadCombo from "../EspecialidadCombo";
import type {
  ValorOut, GalenoOut, NomencladorOut, ComponentePayload, Origen,
  ReplicaResultadoItem, ReplicarValoresFamiliaPayload,
} from "../nomenclador.types";
import { ORIGEN_LABELS } from "../nomenclador.types";
import { today, parseMonto, compararGalenos } from "../nomenclador.helpers";

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
  /** Obligatoria: cómo nombra esta obra social al código. */
  descripcion: string;
  porPresupuesto: boolean;
  nivel: string;
  complejidad: string;
  /** Máximo de ayudantes admitidos — vacío = no lleva. Es lo único que habilita
   * "Agregar ayudante" en Carga de Facturación (`precio.cantidad_ayudantes`). */
  cantidad_ayudantes: string;
  coseguro: string;
  observacion: string;
  /** Especialidades tildadas para la variante NE a crear — una fila por cada una
   * (ver POST /valores_nm/multi). Sin uso para NN. */
  especialidadesChecked: Set<number>;
  /** NE "sin restricción por especialidad": una sola fila, sin lista de especialidades. */
  sinRestriccion: boolean;
  componentes: ComponenteForm[];
};

type EditMode = "nucleo" | "variante";

type EditMetaForm = {
  descripcion: string;
  /** Dato del par (obra_social_nro, código) — se propaga en el back a todas las
   * variantes activas del mismo par (incluida la NN) al guardar. */
  sin_restriccion_especialidad: boolean;
  /** Especialidades habilitadas HOY para el par. Se reemplaza por completo al
   * guardar (no se suma) — único lugar del sistema donde se editan. */
  especialidades: number[];
  nivel: string;
  complejidad: string;
  cantidad_ayudantes: string;
  observacion: string;
};

type EditEcuForm = {
  vigencia_desde: string;
  modalidad: ModalidadValor;
  componentes: ComponenteForm[];
  coseguro: string;
  /** Propaga la nueva vigencia+ecuación a las demás variantes NE del mismo código+OS. */
  aplicarAVariantes: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

const PAGE_SIZE = 25;

function origenBadgeLabel(o: Origen): string {
  return ORIGEN_LABELS[o];
}

const MODALIDAD_LABELS: Record<ValorOut["modalidad"], string> = {
  galeno: "Calculable",
  fijo: "Fijo",
  por_presupuesto: "Por presupuesto",
};

const FIXED_CONCEPTOS: ComponenteForm["concepto"][] = ["Honorarios", "Gastos", "Ayudante"];

function initComps(): ComponenteForm[] {
  return FIXED_CONCEPTOS.map((concepto) => ({
    concepto, galeno_id: null, cantidad: "", valor_unitario: "",
    opcional: concepto !== "Honorarios",
  }));
}

/**
 * El importe de un concepto suelto, o `null` si el valor no lo tiene cargado.
 *
 * La tabla muestra los tres por separado —honorario, ayudante y gastos— en vez
 * del total sumado: se facturan y se cobran por separado, y el número que se
 * busca al mirar un código es el honorario, no la suma.
 *
 * En un componente calculable el monto es `subtotal` (cantidad × galeno); en uno
 * fijo es `valor_unitario`, porque esas filas guardan el importe ahí y dejan la
 * cantidad en 0 —su `subtotal` sería 0—.
 *
 * `null` y no `0` a propósito: "no tiene ayudante" y "el ayudante vale cero" se
 * muestran distinto (— contra $ 0,00).
 */
function montoDe(v: ValorOut, concepto: ComponenteForm["concepto"]): number | null {
  const c = v.componentes.find((x) => x.concepto === concepto && x.activo);
  if (!c) return null;
  return c.tipo === "calculable" ? parseMonto(c.subtotal) : parseMonto(c.valor_unitario);
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
  // Los activos, en el orden del boletín y con los niveles seguidos. El select
  // se recorre a ojo buscando un galeno puntual, así que el orden en que el
  // operador los tiene en la cabeza es el que importa.
  const galenosOrdenados = useMemo(
    () =>
      galenos
        .filter((g) => g.activo)
        .sort((a, b) => compararGalenos(a, b) || (a.nivel ?? 0) - (b.nivel ?? 0)),
    [galenos],
  );

  const galenoPorId = useMemo(() => new Map(galenos.map((g) => [g.id, g])), [galenos]);

  // Subtotal orientativo: galeno × cantidad (calculable) o el valor fijo. `null` = no se
  // puede calcular todavía (sin galeno, o cantidad en 0 = la completa el back).
  function subtotal(comp: ComponenteForm): number | null {
    if (modalidad === "fijo") {
      const v = parseFloat(comp.valor_unitario);
      return isNaN(v) ? null : v;
    }
    const g = comp.galeno_id != null ? galenoPorId.get(comp.galeno_id) : undefined;
    const cant = parseFloat(comp.cantidad);
    if (!g || isNaN(cant) || cant <= 0) return null;
    return parseMonto(g.valor_unitario) * cant;
  }

  const subtotales = componentes.map(subtotal);
  const total = subtotales.reduce<number>((acc, v) => acc + (v ?? 0), 0);
  const hayAuto = modalidad === "calculable" && componentes.some((c, i) => c.galeno_id != null && subtotales[i] == null);

  return (
    <div className={styles.componentRows}>
      {componentes.map((comp, i) => {
        const errGaleno = errors[`comp_${i}_galeno`];
        const errValor = errors[`comp_${i}_valor`];
        const sub = subtotales[i];
        return (
          <div key={comp.concepto} className={styles.componentCard}>
            <div className={styles.componentCardHead}>
              <span className={styles.compConceptLabel}>
                {comp.concepto}
                {i === 0 ? <span className={styles.req}> *</span> : <span className={styles.compOpcional}>opcional</span>}
              </span>
              <span className={styles.compSubtotal}>
                {sub != null
                  ? fmt.format(sub)
                  : modalidad === "calculable" && comp.galeno_id != null
                    ? "Unidades automáticas"
                    : "—"}
              </span>
            </div>

            {modalidad === "calculable" ? (
              <div className={styles.componentFields}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor={`comp-${i}-galeno`}>Galeno</label>
                  <select
                    id={`comp-${i}-galeno`}
                    className={`${styles.formSelect} ${styles.compControl} ${errGaleno ? styles.inputError : ""}`}
                    value={comp.galeno_id ?? ""}
                    onChange={(e) => onChange(i, "galeno_id", e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">— {i === 0 ? "Seleccionar" : "Sin galeno"} —</option>
                    {galenosOrdenados.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.codigo}{g.nivel != null ? ` (niv. ${g.nivel})` : ""} — {fmt.format(parseMonto(g.valor_unitario))}
                      </option>
                    ))}
                  </select>
                  {errGaleno && <span className={styles.errorMsg}>{errGaleno}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor={`comp-${i}-cantidad`}>Cantidad</label>
                  <input
                    id={`comp-${i}-cantidad`}
                    type="number" min="0" step="0.01"
                    className={`${styles.formInput} ${styles.compControl}`}
                    value={comp.cantidad}
                    onChange={(e) => onChange(i, "cantidad", e.target.value)}
                    placeholder="0 = automático"
                  />
                </div>
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor={`comp-${i}-valor`}>Valor fijo ($)</label>
                <input
                  id={`comp-${i}-valor`}
                  type="number" min="0" step="0.01"
                  className={`${styles.formInput} ${styles.compControl} ${errValor ? styles.inputError : ""}`}
                  value={comp.valor_unitario}
                  onChange={(e) => onChange(i, "valor_unitario", e.target.value)}
                  placeholder={i === 0 ? "0.00" : "Vacío si no aplica"}
                />
                {errValor && <span className={styles.errorMsg}>{errValor}</span>}
              </div>
            )}
          </div>
        );
      })}

      <div className={styles.componentTotal}>
        <span>Total estimado</span>
        <strong>{fmt.format(total)}</strong>
      </div>
      {hayAuto && (
        <span className={styles.hintText}>
          Los componentes con cantidad en 0 toman las unidades del galeno o del código al guardar; el total no las incluye.
        </span>
      )}
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
  const [origenFilter, setOrigenFilter] = useState<Origen | "todos">("todos");
  const [modalidadFilter, setModalidadFilter] = useState<ValorOut["modalidad"] | "todos">("todos");
  const [soloPresupuesto, setSoloPresupuesto] = useState(false);
  const [especialidadFilter, setEspecialidadFilter] = useState<number | "todos">("todos");
  const [page, setPage] = useState(1);

  // Modal
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [editTarget, setEditTarget] = useState<ValorOut | null>(null);

  // Create form
  const [form, setForm] = useState<ValorForm>({
    nomencladorId: null, nomencladorLabel: "", origen: "NE",
    modalidad: "calculable", vigencia_desde: today(), descripcion: "",
    porPresupuesto: false, nivel: "", complejidad: "", cantidad_ayudantes: "", coseguro: "", observacion: "",
    especialidadesChecked: new Set(), sinRestriccion: false, componentes: initComps(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [cargandoConfig, setCargandoConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ tipo: "ok" | "info" | "error"; texto: string } | null>(null);

  // Edit forms
  const [editMeta, setEditMeta] = useState<EditMetaForm>({
    descripcion: "", sin_restriccion_especialidad: false, especialidades: [],
    nivel: "", complejidad: "", cantidad_ayudantes: "", observacion: "",
  });
  const [editEcu, setEditEcu] = useState<EditEcuForm>({ vigencia_desde: today(), modalidad: "calculable", componentes: initComps(), coseguro: "", aplicarAVariantes: false });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [savingMeta, setSavingMeta] = useState(false);
  // "nucleo" = el código PARA TODAS sus especialidades; "variante" = una sola fila
  // (solo valores, vigencia y coseguro). El NN es una fila única: mismo valor para
  // cualquier especialidad, pero se gestiona por el núcleo igual que el NE.
  const [editMode, setEditMode] = useState<EditMode>("variante");
  const [ecuEnabled, setEcuEnabled] = useState(false);
  const [nucleoOrigen, setNucleoOrigen] = useState<"NE" | "NN">("NE");
  // Replicar en los otros planes de la familia de la OS (Swiss Medical, Medife…).
  const [replica, setReplica] = useState<ReplicaState>(REPLICA_INICIAL);
  const [replicaResultado, setReplicaResultado] = useState<ReplicaResultadoItem[] | null>(null);
  const [replicaError, setReplicaError] = useState<string | null>(null);
  const replicaTerminada = replicaResultado !== null || replicaError !== null;
  const [savingEcu, setSavingEcu] = useState(false);

  // Nomenclador search
  const [nomSearch, setNomSearch] = useState("");
  const [nomResults, setNomResults] = useState<NomencladorOut[]>([]);
  const [nomLoading, setNomLoading] = useState(false);
  const nomDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ValorOut | null>(null);

  const { data: osList = [] } = useObrasSociales();

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

  const { data: familia = [] } = useQuery({
    queryKey: ["familia-os", selectedNroOS],
    queryFn: () => getFamiliaObraSocial(selectedNroOS as number),
    enabled: selectedNroOS != null,
    staleTime: 5 * 60 * 1000,
  });

  const espOptions = useMemo(
    () => especialidades.map((e) => ({ value: e.id_colegio_espe, label: e.nombre })),
    [especialidades],
  );

  // Códigos habilitados para la especialidad elegida EN ESTA OS (para acotar el
  // listado). Se traen todos los pares (paginando) y se guardan como Set de códigos
  // en mayúsculas — las especialidades son un dato por obra social.
  const { data: codigosDeEspecialidad, isFetching: espFilterFetching } = useQuery({
    queryKey: ["nomenclador-especialidad-codigos", selectedNroOS, especialidadFilter],
    queryFn: async () => {
      const codigos = new Set<string>();
      for (let p = 1; p <= 100; p++) {
        const batch = await listCodigosPorEspecialidad({
          obra_social_nro: selectedNroOS as number,
          especialidad_id_colegio: especialidadFilter as number,
          page: p,
          size: 200,
        });
        batch.forEach((r) => codigos.add(r.codigo.toUpperCase()));
        if (batch.length < 200) break;
      }
      return codigos;
    },
    enabled: especialidadFilter !== "todos" && selectedNroOS != null,
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

  // Ya no hay fallback al catálogo del Colegio: descripcion es obligatoria en el
  // alta nueva, así que solo queda vacía en filas viejas (previas a la fase 2 de
  // la reestructura) que todavía no se editaron.
  const resolvedDesc = useCallback((v: ValorOut) => v.descripcion ?? "", []);

  const filteredValores = useMemo(() => {
    let list = valores;
    if (origenFilter !== "todos") list = list.filter((v) => v.origen === origenFilter);
    if (modalidadFilter !== "todos") list = list.filter((v) => v.modalidad === modalidadFilter);
    if (soloPresupuesto) list = list.filter((v) => v.por_presupuesto);
    if (especialidadFilter !== "todos") {
      // Mientras el set carga (undefined) no mostramos nada para no confundir.
      list = codigosDeEspecialidad
        ? list.filter((v) => codigosDeEspecialidad.has(v.codigo.toUpperCase()))
        : [];
    }
    if (codeSearch.trim()) {
      const q = codeSearch.toLowerCase();
      list = list.filter((v) => v.codigo.toLowerCase().includes(q) || (v.descripcion ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [valores, codeSearch, origenFilter, modalidadFilter, soloPresupuesto, especialidadFilter, codigosDeEspecialidad]);

  // Loading combinado: valores de la OS + resolución del set de la especialidad.
  const showLoading = loadingValores || (especialidadFilter !== "todos" && !codigosDeEspecialidad && espFilterFetching);

  const grouped = useMemo(() => {
    const map = new Map<number, ValorOut[]>();
    for (const v of filteredValores) {
      const arr = map.get(v.nomenclador_id) ?? [];
      arr.push(v);
      map.set(v.nomenclador_id, arr);
    }
    const nombreEsp = (v: ValorOut) =>
      v.especialidad_id_colegio != null ? (espMap[v.especialidad_id_colegio] ?? "") : "";
    map.forEach((arr) =>
      arr.sort((x, y) =>
        x.origen === y.origen
          ? nombreEsp(x).localeCompare(nombreEsp(y), "es", { sensitivity: "base" })
          : x.origen === "NE" ? -1 : 1,
      ),
    );
    return Array.from(map.entries());
  }, [filteredValores, espMap]);

  const totalPages = Math.max(1, Math.ceil(grouped.length / PAGE_SIZE));
  const pageGroups = useMemo(
    () => grouped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [grouped, page],
  );

  // Volver a la página 1 cuando cambian OS, búsqueda o filtro de origen.
  useEffect(() => { setPage(1); }, [selectedNroOS, codeSearch, origenFilter, modalidadFilter, soloPresupuesto, especialidadFilter]);
  // Ajustar si la página quedó fuera de rango (p. ej. tras cerrar un valor).
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

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
    setForm((prev) => ({ ...prev, nomencladorId: n.id, nomencladorLabel: n.codigo }));
    setConfigMsg(null);
    setNomSearch(""); setNomResults([]);
    setErrors((prev) => ({ ...prev, nomenclador: "" }));
  }

  async function cargarConfiguracionInicial() {
    if (!form.nomencladorId) return;
    setCargandoConfig(true);
    setConfigMsg(null);
    try {
      const nm = await getNomencladorById(form.nomencladorId);
      const conDescripcion = !!nm.descripcion;
      const conComplejidad = !!nm.complejidad;
      const conSinRestriccion = form.origen === "NE" && nm.sin_restriccion_especialidad === true;
      const conEspecialidades = form.origen === "NE" && !conSinRestriccion && nm.especialidades.length > 0;
      setForm((prev) => ({
        ...prev,
        ...(conDescripcion ? { descripcion: nm.descripcion as string } : {}),
        ...(conComplejidad ? { complejidad: nm.complejidad as string } : {}),
        ...(conSinRestriccion ? { sinRestriccion: true, especialidadesChecked: new Set<number>() } : {}),
        ...(conEspecialidades ? { sinRestriccion: false, especialidadesChecked: new Set(nm.especialidades) } : {}),
      }));
      setErrors((p) => ({ ...p, descripcion: "", especialidades: "" }));
      setConfigMsg(
        conDescripcion || conComplejidad || conEspecialidades || conSinRestriccion
          ? { tipo: "ok", texto: "Configuración inicial cargada correctamente" }
          : { tipo: "info", texto: `El código ${nm.codigo} no tiene configuración inicial cargada.` },
      );
    } catch {
      setConfigMsg({ tipo: "error", texto: "No se pudo cargar la configuración inicial." });
    } finally {
      setCargandoConfig(false);
    }
  }

  function clearNom() {
    setConfigMsg(null);
    setForm((prev) => ({ ...prev, nomencladorId: null, nomencladorLabel: "" }));
    setNomSearch(""); setNomResults([]);
  }

  // ─── Origin + modalidad rules ──────────────────────────────────────────────

  function changeOrigen(o: Origen) {
    setForm((prev) => {
      const next: ValorForm = { ...prev, origen: o };
      if (o === "NN") {
        next.modalidad = "calculable";
        next.porPresupuesto = false;
        next.especialidadesChecked = new Set();
        next.sinRestriccion = false;
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
    if (!form.descripcion.trim()) errs.descripcion = "Requerido";
    if (!form.vigencia_desde) errs.vigencia_desde = "Requerido";
    if (form.origen === "NE" && !form.sinRestriccion && form.especialidadesChecked.size === 0) {
      errs.especialidades = "Tildá al menos una especialidad o marcá 'Sin restricción por especialidad'";
    }
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
    // Por presupuesto no tiene ecuación propia (H/G/A van en 0, ver `_crear_valor_con_
    // componentes` en el back) — solo importan vigencia_desde y coseguro, ya chequeados.
    if (!editTarget?.por_presupuesto) {
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
    }
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Open modals ───────────────────────────────────────────────────────────

  function openCreate() {
    setForm({
      nomencladorId: null, nomencladorLabel: "", origen: "NE",
      modalidad: "calculable", vigencia_desde: today(), descripcion: "",
      porPresupuesto: false, nivel: "", complejidad: "", cantidad_ayudantes: "", coseguro: "", observacion: "",
      especialidadesChecked: new Set(), sinRestriccion: false, componentes: initComps(),
    });
    setNomSearch(""); setNomResults([]); setErrors({}); setConfigMsg(null);
    resetReplica();
    setModalKind("create");
  }

  function cargarFormsDeEdicion(v: ValorOut, mod: ModalidadValor) {
    setEditTarget(v);
    setEditMeta({
      descripcion: resolvedDesc(v),
      sin_restriccion_especialidad: v.sin_restriccion_especialidad,
      especialidades: v.especialidades,
      nivel: v.nivel != null ? String(v.nivel) : "",
      complejidad: v.complejidad ?? "",
      cantidad_ayudantes: v.cantidad_ayudantes != null ? String(v.cantidad_ayudantes) : "",
      observacion: v.observacion ?? "",
    });
    setEditEcu({
      vigencia_desde: today(), modalidad: mod, componentes: compsFromOut(v.componentes),
      coseguro: v.coseguro && parseMonto(v.coseguro) !== 0 ? v.coseguro : "",
      aplicarAVariantes: false,
    });
    setEditErrors({});
  }

  /** Lápiz de UNA fila: solo valores, vigencia y coseguro. */
  function openEdit(v: ValorOut) {
    const mod: ModalidadValor = v.modalidad === "galeno" ? "calculable" : "fijo";
    cargarFormsDeEdicion(v, mod);
    resetReplica();
    setEcuEnabled(false);
    setEditMode("variante");
    setModalKind("edit");
  }

  /** Lápiz del código "núcleo": edita TODAS las especialidades a la vez. */
  function openEditNucleo(nomencladorId: number, origen: "NE" | "NN") {
    // NE: las variantes por especialidad. NN: su fila única (mismo valor para cualquier
    // especialidad); se gestiona igual pero sin filas por especialidad.
    const grupo = valores
      .filter((v) => v.nomenclador_id === nomencladorId && v.origen === origen)
      .sort((x, y) => x.id - y.id);
    if (grupo.length === 0) return;
    setNucleoOrigen(origen);
    const base = grupo[0];
    const mod: ModalidadValor = base.modalidad === "galeno" ? "calculable" : "fijo";
    cargarFormsDeEdicion(base, mod);
    setEditMeta((p) => ({
      ...p,
      // Datos del PAR (OS + código), no de cada fila: la NN nunca tiene especialidad,
      // así que no se pueden deducir de las filas.
      sin_restriccion_especialidad: grupo.some((v) => v.sin_restriccion_especialidad),
      especialidades: base.especialidades,
    }));
    resetReplica();
    setEcuEnabled(false);
    setEditMode("nucleo");
    setModalKind("edit");
  }

  function leyendaEdicion(): string | null {
    if (editMode === "nucleo") {
      return nucleoOrigen === "NN"
        ? "Estás modificando este código PARA TODAS LAS ESPECIALIDADES (Nomenclador Nacional: mismo valor para cualquier especialidad)"
        : "Estás modificando este código PARA TODAS LAS ESPECIALIDADES";
    }
    if (editMode === "variante" && editTarget?.origen === "NN") {
      return "Estás modificando los valores del NOMENCLADOR NACIONAL de este código (mismo valor para todas sus especialidades)";
    }
    if (editMode === "variante" && editTarget) {
      const nombre = editTarget.especialidad_id_colegio != null
        ? (espMap[editTarget.especialidad_id_colegio] ?? `Esp. ${editTarget.especialidad_id_colegio}`)
        : null;
      return nombre
        ? `Estás modificando este código PARA LA ESPECIALIDAD DE ${nombre}`
        : "Estás modificando este código SIN ESPECIALIDAD (sin restricción)";
    }
    return null;
  }

  function resetReplica() {
    setReplica(REPLICA_INICIAL);
    setReplicaResultado(null);
    setReplicaError(null);
  }

  /** Replica en la familia lo recién guardado. true = hubo replicación (el modal queda
   * abierto mostrando el resultado); false = no había nada que replicar. */
  async function replicarSiCorresponde(
    payload: Omit<ReplicarValoresFamiliaPayload, "origen_obra_social_nro" | "destinos">,
  ): Promise<boolean> {
    const destinos = destinosReplica(replica);
    if (!selectedNroOS || destinos.length === 0) return false;
    try {
      const r = await replicarValoresEnFamilia({
        ...payload, origen_obra_social_nro: selectedNroOS, destinos,
      });
      setReplicaResultado(r.resultados);
    } catch (e: unknown) {
      setReplicaError(errMsg(e, "Error de red o del servidor."));
    }
    return true;
  }

  const replicaActiva = replica.activo && replica.destinos.length > 0;

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
      const base = {
        descripcion: form.descripcion.trim(),
        nivel: form.nivel ? parseInt(form.nivel, 10) : null,
        complejidad: form.complejidad || null,
        por_presupuesto: form.porPresupuesto,
        cantidad_ayudantes: form.cantidad_ayudantes.trim() ? parseInt(form.cantidad_ayudantes, 10) : null,
        coseguro: form.coseguro.trim() ? parseMonto(form.coseguro) : 0,
        vigencia_desde: form.vigencia_desde,
        observacion: form.observacion || null,
        componentes,
      };
      const especialidadesAlta =
        form.origen === "NE" && !form.sinRestriccion ? [...form.especialidadesChecked] : [];
      if (form.origen === "NE" && form.sinRestriccion) {
        // Sin restricción: UNA sola fila "sin especialidad".
        const v = await createValor({
          ...base,
          obra_social_nro: selectedNroOS,
          nomenclador_id: form.nomencladorId!,
          origen: "NE",
          especialidad_id_colegio: null,
          sin_restriccion_especialidad: true,
        });
        setValores((prev) => [v, ...prev]);
        showToast("success", "Código agregado sin restricción por especialidad.");
      } else if (form.origen === "NE") {
        const nuevos = await createValorMulti({
          ...base,
          obra_social_nro: selectedNroOS,
          nomenclador_id: form.nomencladorId!,
          origen: "NE",
          especialidades_id_colegio: [...form.especialidadesChecked],
        });
        setValores((prev) => [...nuevos, ...prev]);
        showToast(
          "success",
          nuevos.length > 1
            ? `Código agregado para ${nuevos.length} especialidades.`
            : "Código agregado a la obra social.",
        );
      } else {
        const v = await createValor({
          ...base,
          obra_social_nro: selectedNroOS,
          nomenclador_id: form.nomencladorId!,
          origen: form.origen,
          especialidad_id_colegio: null,
        });
        setValores((prev) => [v, ...prev]);
        showToast("success", "Código agregado a la obra social.");
      }
      const replicado = await replicarSiCorresponde({
        nomenclador_id: form.nomencladorId!,
        operacion: "alta",
        alta: {
          ...base,
          origen: form.origen,
          especialidades_id_colegio: especialidadesAlta,
          sin_restriccion_especialidad: form.origen === "NE" && form.sinRestriccion ? true : null,
        },
      });
      if (!replicado) setModalKind(null);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast("error", msg ?? "No se pudo guardar.");
    } finally { setSaving(false); }
  }

  function buildEcuComponentes(): ComponentePayload[] {
    if (editTarget?.por_presupuesto) return [];
    const filled = editEcu.componentes.filter((c, i) => {
      if (i === 0) return true;
      if (editEcu.modalidad === "calculable") return c.galeno_id != null;
      return c.valor_unitario.trim() !== "" && !isNaN(parseFloat(c.valor_unitario));
    });
    return filled.map((c, i) => ({
      concepto: c.concepto,
      galeno_id: editEcu.modalidad === "calculable" ? c.galeno_id : null,
      cantidad: editEcu.modalidad === "calculable" ? (parseFloat(c.cantidad) || 0) : 0,
      valor_unitario: editEcu.modalidad === "fijo" ? parseFloat(c.valor_unitario) : null,
      opcional: c.opcional,
      orden: i,
    }));
  }

  function errMsg(e: unknown, fallback: string): string {
    return (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback;
  }

  // Núcleo: metadatos + (opcional) ecuación + especialidades, todo para TODAS las variantes.
  async function handleSaveNucleo() {
    if (!editTarget || !selectedNroOS) return;
    if (!editMeta.sin_restriccion_especialidad && editMeta.especialidades.length === 0) {
      showToast("error", "Elegí al menos una especialidad o marcá 'Sin restricción por especialidad'.");
      return;
    }
    if (ecuEnabled && !validateEcuacion()) return;
    setSavingMeta(true);
    try {
      const nucleoPayload = {
        descripcion: editMeta.descripcion,
        nivel: editMeta.nivel ? parseInt(editMeta.nivel, 10) : null,
        complejidad: editMeta.complejidad || null,
        cantidad_ayudantes: editMeta.cantidad_ayudantes.trim() ? parseInt(editMeta.cantidad_ayudantes, 10) : null,
        observacion: editMeta.observacion || null,
        ecuacion: ecuEnabled
          ? {
              vigencia_desde: editEcu.vigencia_desde,
              componentes: buildEcuComponentes(),
              coseguro: editEcu.coseguro.trim() ? parseMonto(editEcu.coseguro) : 0,
              por_presupuesto: editTarget.por_presupuesto,
            }
          : null,
        sin_restriccion_especialidad: editMeta.sin_restriccion_especialidad,
        especialidades: editMeta.sin_restriccion_especialidad ? [] : editMeta.especialidades,
        origen: nucleoOrigen,
      };
      await updateNucleoPar(selectedNroOS, editTarget.nomenclador_id, nucleoPayload);
      showToast("success", "Código actualizado para todas las especialidades. Recargando…");
      const replicado = await replicarSiCorresponde({
        nomenclador_id: editTarget.nomenclador_id, operacion: "nucleo", nucleo: nucleoPayload,
      });
      if (!replicado) setModalKind(null);
      loadValores(selectedNroOS);
    } catch (e: unknown) {
      showToast("error", errMsg(e, "No se pudo actualizar el código."));
    } finally { setSavingMeta(false); }
  }

  // Una sola variante: solo valores, vigencia y coseguro.
  async function handleActualizar() {
    if (!editTarget || !validateEcuacion()) return;
    setSavingEcu(true);
    try {
      const ecuacion = {
        vigencia_desde: editEcu.vigencia_desde,
        componentes: buildEcuComponentes(),
        coseguro: editEcu.coseguro.trim() ? parseMonto(editEcu.coseguro) : 0,
        // Explícito: el back NO lo hereda del valor que cierra, así que si no se manda
        // un código por_presupuesto pierde esa condición al rotar vigencia.
        por_presupuesto: editTarget.por_presupuesto,
        aplicar_a_variantes: false,
      };
      await actualizarValor(editTarget.id, ecuacion);
      showToast("success", "Valores actualizados. Recargando…");
      const replicado = await replicarSiCorresponde({
        nomenclador_id: editTarget.nomenclador_id,
        operacion: "variante",
        variante: {
          origen: editTarget.origen,
          especialidad_id_colegio: editTarget.especialidad_id_colegio,
          ecuacion,
        },
      });
      if (!replicado) setModalKind(null);
      if (selectedNroOS) loadValores(selectedNroOS);
    } catch (e: unknown) {
      showToast("error", errMsg(e, "No se pudo actualizar la ecuación."));
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
                  {(["todos", "NN", "NE"] as const).map((o) => (
                    <button
                      key={o}
                      className={`${styles.filterBtn} ${origenFilter === o ? styles.filterBtnActive : ""}`}
                      onClick={() => setOrigenFilter(o)}
                    >
                      {o === "todos" ? "Todos" : o}
                    </button>
                  ))}
                </div>
                <div className={styles.filterGroup}>
                  {(["todos", "galeno", "fijo", "por_presupuesto"] as const).map((m) => (
                    <button
                      key={m}
                      className={`${styles.filterBtn} ${modalidadFilter === m ? styles.filterBtnActive : ""}`}
                      onClick={() => setModalidadFilter(m)}
                    >
                      {m === "todos" ? "Toda modalidad" : MODALIDAD_LABELS[m]}
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
                      <th>Modalidad</th>
                      <th>Especialidad</th>
                      <th>Nivel</th>
                      <th>Precio</th>
                      <th>Ayudante</th>
                      <th>Gastos</th>
                      <th>Coseguro</th>
                      <th>Vigente desde</th>
                      <th className={styles.thActions}>Acc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showLoading ? (
                      <tr><td colSpan={10} className={styles.loadingCell}>Cargando…</td></tr>
                    ) : grouped.length === 0 ? (
                      <tr><td colSpan={10} className={styles.emptyCell}>
                        {especialidadFilter !== "todos" ? "Sin códigos de esta especialidad" : "Sin códigos cargados"}
                      </td></tr>
                    ) : pageGroups.map(([nomId, variants]) => {
                      const first = variants[0];
                      return (
                        <Fragment key={nomId}>
                          <tr className={styles.groupHeader}>
                            <td colSpan={10}>
                              <span className={styles.codeCell}>{first.codigo}</span>
                              {resolvedDesc(first) && <span className={styles.groupDesc}> — {resolvedDesc(first)}</span>}
                              {(
                                <button
                                  className={styles.btnEdit}
                                  style={{ marginLeft: 10 }}
                                  onClick={() => openEditNucleo(nomId, variants.some((x) => x.origen === "NE") ? "NE" : "NN")}
                                  title="Editar el código para todas las especialidades"
                                >
                                  <Edit2 size={12} />
                                </button>
                              )}
                            </td>
                          </tr>
                          {variants.map((v) => (
                            <tr key={v.id} className={styles.variantRow}>
                              <td>
                                <span className={`${styles.origenBadge} ${styles[`origen${v.origen}` as keyof typeof styles]}`}>
                                  {origenBadgeLabel(v.origen)}
                                </span>
                              </td>
                              <td className={styles.mutedText}>{MODALIDAD_LABELS[v.modalidad]}</td>
                              <td className={styles.mutedText}>
                                {v.especialidad_id_colegio
                                  ? (espMap[v.especialidad_id_colegio] ?? `Esp. ${v.especialidad_id_colegio}`)
                                  : v.origen === "NE"
                                    ? "Sin especialidad"
                                    : v.sin_restriccion_especialidad
                                      ? "Mismo valor · Sin restricción"
                                      : `Mismo valor · ${v.especialidades.length} especialidad${v.especialidades.length === 1 ? "" : "es"}`}
                              </td>
                              <td className={styles.mutedText}>{v.nivel != null ? `Niv. ${v.nivel}` : "—"}</td>
                              {v.por_presupuesto ? (
                                // El chip ocupa las tres columnas de importe:
                                // sin precio pactado no hay nada que desglosar.
                                <td colSpan={3}>
                                  <span className={styles.presupuestoChip}>Por presupuesto</span>
                                </td>
                              ) : (
                                <>
                                  <td>
                                    <span className={styles.priceCell}>
                                      {fmt.format(montoDe(v, "Honorarios") ?? 0)}
                                    </span>
                                  </td>
                                  <td className={styles.mutedText}>
                                    {montoDe(v, "Ayudante") == null
                                      ? "—"
                                      : fmt.format(montoDe(v, "Ayudante")!)}
                                  </td>
                                  <td className={styles.mutedText}>
                                    {montoDe(v, "Gastos") == null
                                      ? "—"
                                      : fmt.format(montoDe(v, "Gastos")!)}
                                  </td>
                                </>
                              )}
                              <td className={styles.mutedText}>
                                {parseMonto(v.coseguro) === 0 ? "—" : fmt.format(parseMonto(v.coseguro))}
                              </td>
                              <td className={styles.mutedText}>{v.vigencia_desde}</td>
                              <td>
                                <div className={styles.actionsCell}>
                                  <button
                                    className={styles.btnEdit}
                                    onClick={() => openEdit(v)}
                                    title="Editar valores y vigencia"
                                  >
                                    <Edit2 size={12} />
                                  </button>
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
                        {v.por_presupuesto
                          ? "Por presupuesto"
                          : fmt.format(montoDe(v, "Honorarios") ?? 0)}
                      </span>
                    </div>
                    <p className={styles.cardDesc}>{resolvedDesc(v)}</p>
                    {/* En mobile el honorario va arriba, junto al código, y los
                        otros dos conceptos abajo sólo si el valor los tiene. */}
                    {!v.por_presupuesto && (
                      <p className={styles.cardConceptos}>
                        {montoDe(v, "Ayudante") != null && (
                          <span>Ayudante {fmt.format(montoDe(v, "Ayudante")!)}</span>
                        )}
                        {montoDe(v, "Gastos") != null && (
                          <span>Gastos {fmt.format(montoDe(v, "Gastos")!)}</span>
                        )}
                      </p>
                    )}
                    {parseMonto(v.coseguro) > 0 && (
                      <p className={styles.cardConceptos}>
                        <span>Coseguro {fmt.format(parseMonto(v.coseguro))}</span>
                      </p>
                    )}
                    <div className={styles.cardActions}>
                      <button
                        className={styles.btnEdit}
                        onClick={() => openEditNucleo(
                          v.nomenclador_id,
                          valores.some((x) => x.nomenclador_id === v.nomenclador_id && x.origen === "NE") ? "NE" : "NN",
                        )}
                      >
                        <Edit2 size={12} /> Código
                      </button>
                      <button
                        className={styles.btnEdit}
                        onClick={() => openEdit(v)}
                      >
                        <Edit2 size={12} /> Editar
                      </button>
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
                      <strong>{form.nomencladorLabel}</strong>
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
                          placeholder="Escribí el código para buscar…"
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
                              <strong>{n.codigo}</strong>{n.categoria ? ` — ${n.categoria}` : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {errors.nomenclador && <span className={styles.errorMsg}>{errors.nomenclador}</span>}
                  {form.nomencladorId && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={cargarConfiguracionInicial}
                        disabled={cargandoConfig}
                      >
                        {cargandoConfig && <Loader2 size={14} style={{ animation: "spin .7s linear infinite" }} />}
                        Cargar configuración inicial de {form.nomencladorLabel}
                      </button>
                      {configMsg && (
                        <span
                          className={configMsg.tipo === "error" ? styles.errorMsg : styles.hintText}
                          style={configMsg.tipo === "ok" ? { color: "#2f855a", fontWeight: 500 } : undefined}
                        >
                          {configMsg.texto}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Descripción — obligatoria: cómo nombra ESTA obra social al código. */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Descripción <span className={styles.req}>*</span></label>
                  <input
                    className={`${styles.formInput} ${errors.descripcion ? styles.inputError : ""}`}
                    value={form.descripcion}
                    onChange={(e) => { setForm((p) => ({ ...p, descripcion: e.target.value })); setErrors((p) => ({ ...p, descripcion: "" })); }}
                    placeholder="Cómo nombra esta obra social al código"
                  />
                  {errors.descripcion && <span className={styles.errorMsg}>{errors.descripcion}</span>}
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

                {/* Especialidades — solo NE. Una fila por cada tildada (POST /valores_nm/multi):
                    mismo precio, misma vigencia, filas separadas. Se puede elegir
                    cualquier especialidad del catálogo: crear la variante la habilita
                    automáticamente para este código en esta OS si todavía no lo estaba. */}
                {form.origen === "NE" && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Especialidades {!form.sinRestriccion && <span className={styles.req}>*</span>}
                    </label>
                    {!form.nomencladorId ? (
                      <span className={styles.hintText}>Elegí un código primero</span>
                    ) : (
                      <>
                        <label className={styles.toggleRow}>
                          <input
                            type="checkbox"
                            className={styles.toggleInput}
                            checked={form.sinRestriccion}
                            onChange={(e) => {
                              setForm((p) => ({ ...p, sinRestriccion: e.target.checked }));
                              setErrors((p) => ({ ...p, especialidades: "" }));
                            }}
                          />
                          <span className={styles.toggleLabel}>Sin restricción por especialidad</span>
                        </label>
                        {form.sinRestriccion ? (
                          <span className={styles.hintText}>
                            Se crea una sola fila "sin especialidad": vale para cualquier médico.
                          </span>
                        ) : (
                          <MultiSelectBuscable
                            options={espOptions}
                            selected={[...form.especialidadesChecked]}
                            onChange={(next) => {
                              setForm((p) => ({ ...p, especialidadesChecked: new Set(next) }));
                              setErrors((p) => ({ ...p, especialidades: "" }));
                            }}
                            noun="especialidades"
                          />
                        )}
                      </>
                    )}
                    {errors.especialidades && <span className={styles.errorMsg}>{errors.especialidades}</span>}
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

                <div className={styles.formRow2}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Coseguro ($)</label>
                    <input
                      type="number" min="0" step="0.01"
                      className={styles.formInput}
                      value={form.coseguro}
                      onChange={(e) => setForm((p) => ({ ...p, coseguro: e.target.value }))}
                      placeholder="0.00"
                    />
                    <span className={styles.hintText}>
                      Lo que el afiliado paga de su bolsillo; se descuenta del total al facturar
                    </span>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Cantidad de ayudantes</label>
                    <input
                      type="number" min="0" step="1"
                      className={styles.formInput}
                      value={form.cantidad_ayudantes}
                      onChange={(e) => setForm((p) => ({ ...p, cantidad_ayudantes: e.target.value }))}
                      placeholder="0"
                    />
                    <span className={styles.hintText}>
                      Máximo admitido para este código+OS. Vacío = no lleva — sin esto no
                      aparece "Agregar ayudante" en Carga de Facturación.
                    </span>
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

                {replicaTerminada ? (
                  <>
                    {replicaResultado && <ResultadoReplica resultados={replicaResultado} />}
                    {replicaError && <ErrorReplica mensaje={replicaError} />}
                  </>
                ) : (
                  <ReplicarFamiliaBlock
                    familia={familia}
                    value={replica}
                    onChange={setReplica}
                    disabled={saving}
                    descripcion="Se da de alta igual en los planes elegidos. Los valores fijos se copian; los calculables usan el galeno de cada obra social."
                  />
                )}
              </div>

              <div className={styles.modalFooter}>
                {replicaTerminada ? (
                  <button className={styles.btnPrimary} onClick={() => setModalKind(null)}>Cerrar</button>
                ) : (
                  <>
                    <button className={styles.btnGhost} onClick={() => setModalKind(null)}>Cancelar</button>
                    <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                      {saving
                        ? <><span className={styles.spinner} /> Guardando…</>
                        : <><Save size={15} /> {replicaActiva ? "Guardar y replicar" : "Guardar"}</>}
                    </button>
                  </>
                )}
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
                    Editar — <span className={styles.codeCell}>{editTarget.codigo}</span>{editMode === "nucleo" ? " (código)" : ""}
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
                {leyendaEdicion() && (
                  <div
                    role="note"
                    style={{
                      background: "#ebf4ff", border: "1px solid #bee3f8", color: "#2c5282",
                      borderRadius: 6, padding: "8px 12px", fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {leyendaEdicion()}
                  </div>
                )}

                {/* Metadatos: núcleo (todas las especialidades) o fila NN. La variante suelta
                    NO los tiene: solo valores, vigencia y coseguro. */}
                {editMode === "nucleo" && (
                  <div className={styles.editSection}>
                    <div className={styles.editSectionTitle}>Datos del código</div>
                    <div className={styles.formRow2}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Descripción</label>
                        <input className={styles.formInput} value={editMeta.descripcion} onChange={(e) => setEditMeta((p) => ({ ...p, descripcion: e.target.value }))} placeholder="Cómo nombra esta obra social al código" />
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
                    <div className={styles.formRow2}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Cantidad de ayudantes</label>
                        <input
                          type="number" min="0" step="1"
                          className={styles.formInput}
                          value={editMeta.cantidad_ayudantes}
                          onChange={(e) => setEditMeta((p) => ({ ...p, cantidad_ayudantes: e.target.value }))}
                          placeholder="0"
                          style={{ maxWidth: 200 }}
                        />
                        <span className={styles.hintText}>
                          Vacío = no lleva ayudantes en Carga de Facturación.
                        </span>
                      </div>
                    </div>

                    {(
                      <>
                        <label className={styles.toggleRow}>
                          <input
                            type="checkbox"
                            className={styles.toggleInput}
                            checked={editMeta.sin_restriccion_especialidad}
                            onChange={(e) => setEditMeta((p) => ({ ...p, sin_restriccion_especialidad: e.target.checked }))}
                          />
                          <span className={styles.toggleLabel}>Sin restricción por especialidad</span>
                        </label>
                        {editMeta.sin_restriccion_especialidad ? (
                          <p className={styles.hintText}>
                            {nucleoOrigen === "NN"
                              ? "Cualquier especialidad puede facturar este código."
                              : 'Al guardar, las variantes por especialidad se cierran y queda una sola fila "sin especialidad".'}
                          </p>
                        ) : (
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Especialidades</label>
                            <p className={styles.hintText}>
                              {nucleoOrigen === "NN"
                                ? "Quién puede facturar este código en esta obra social. Son las mismas especialidades que usan las variantes NE del código."
                                : "Las que tildes y no tengan fila se crean con el precio y la vigencia de la primera variante; las que destildes se cierran."}
                            </p>
                            <MultiSelectBuscable
                              options={espOptions}
                              selected={editMeta.especialidades}
                              onChange={(next) => setEditMeta((p) => ({ ...p, especialidades: next }))}
                              noun="especialidades"
                            />
                          </div>
                        )}
                      </>
                    )}

                  </div>
                )}

                {/* Valores, vigencia y coseguro. En el núcleo es opcional (abre una vigencia
                    nueva en TODAS las variantes); en una variante suelta es lo único editable. */}
                <div className={styles.editSection}>
                  <div className={styles.editSectionTitle}>
                    {editMode === "nucleo" ? "Valores, vigencia y coseguro" : "Actualizar ecuación de precio"}
                  </div>
                  {editMode === "nucleo" && !ecuEnabled ? (
                    <div>
                      <p className={styles.hintText}>
                        Si no los modificás, los valores y la vigencia actuales se mantienen.
                      </p>
                      <button className={styles.btnGhost} type="button" onClick={() => setEcuEnabled(true)}>
                        Modificar valores, vigencia y coseguro
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className={styles.hintText}>
                        {editTarget.por_presupuesto
                          ? "Este código es por presupuesto (sin fórmula fija). Cambiar el coseguro cierra la vigencia actual y abre una nueva."
                          : "Cierra la vigencia actual y crea una nueva con la ecuación que ingreses."}
                      </p>
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
                          <label className={styles.formLabel}>Coseguro ($)</label>
                          <input
                            type="number" min="0" step="0.01"
                            className={styles.formInput}
                            value={editEcu.coseguro}
                            onChange={(e) => setEditEcu((p) => ({ ...p, coseguro: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      {!editTarget.por_presupuesto && (
                        <>
                          <div className={styles.formRow2}>
                            <div className={styles.formGroup}>
                              <label className={styles.formLabel}>Tipo de valor</label>
                              <select className={styles.formSelect} value={editEcu.modalidad} onChange={(e) => changeEditModalidad(e.target.value as ModalidadValor)}>
                                <option value="calculable">Calculable (galeno × cantidad)</option>
                                <option value="fijo">Fijo ($)</option>
                              </select>
                            </div>
                          </div>
                          <ComponentEditor modalidad={editEcu.modalidad} componentes={editEcu.componentes} galenos={galenos} errors={editErrors} onChange={updateEditComp} />
                        </>
                      )}
                      {editMode === "nucleo" ? (
                        <div style={{ marginTop: 8 }}>
                          <button className={styles.btnGhost} type="button" onClick={() => setEcuEnabled(false)}>
                            No modificar valores
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                          <button className={styles.btnWarning} onClick={handleActualizar} disabled={savingEcu}>
                            {savingEcu ? <><span className={styles.spinner} /> Actualizando…</> : replicaActiva ? "Actualizar y replicar" : "Actualizar"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {replicaTerminada ? (
                  <>
                    {replicaResultado && <ResultadoReplica resultados={replicaResultado} />}
                    {replicaError && <ErrorReplica mensaje={replicaError} />}
                  </>
                ) : (
                  <ReplicarFamiliaBlock
                    familia={familia}
                    value={replica}
                    onChange={setReplica}
                    disabled={savingMeta || savingEcu}
                    descripcion={
                      editMode === "nucleo"
                        ? "Los mismos cambios se aplican en los planes elegidos. Si alguno no tiene el código, se crea igual al de esta obra social."
                        : "Se rota la misma variante en los planes elegidos con los mismos valores, vigencia y coseguro. Si alguno no la tiene, se crea."
                    }
                  />
                )}
              </div>

              <div className={styles.modalFooter}>
                {replicaTerminada ? (
                  <button className={styles.btnPrimary} onClick={() => setModalKind(null)}>Cerrar</button>
                ) : (
                  <>
                    <button className={styles.btnGhost} onClick={() => setModalKind(null)}>{editMode === "nucleo" ? "Cancelar" : "Cerrar"}</button>
                    {editMode === "nucleo" && (
                      <button className={styles.btnPrimary} onClick={handleSaveNucleo} disabled={savingMeta}>
                        {savingMeta
                          ? <><span className={styles.spinner} /> Guardando…</>
                          : <><Save size={15} /> {replicaActiva ? "Guardar y replicar" : "Guardar"}</>}
                      </button>
                    )}
                  </>
                )}
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

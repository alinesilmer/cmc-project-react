import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Fragment,
} from "react";
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
  Edit2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import styles from "./NomencladorPorOS.module.scss";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import {
  listGalenos,
  listValores,
  createValor,
  createValorMulti,
  deleteValor,
  listNomenclador,
  actualizarValor,
  listCodigosPorEspecialidad,
  getCodigoOS,
  listCodigosPorOS,
  revalorizarPrestaciones,
  updateNucleoPar,
  getFamiliaObraSocial,
  replicarValoresEnFamilia,
  getComponentesNN,
} from "../nomenclador.api";
import MultiSelectBuscable from "../../../components/molecules/MultiSelectBuscable/MultiSelectBuscable";
import ReplicarFamiliaBlock, {
  ErrorReplica,
  ResultadoReplica,
} from "../../../components/molecules/ReplicarFamilia/ReplicarFamiliaBlock";
import {
  REPLICA_INICIAL,
  destinosReplica,
  type ReplicaState,
} from "../../../components/molecules/ReplicarFamilia/replicaState";
import ConfirmModal from "@/app/components/ui/ConfirmModal/ConfirmModal";
import Modal from "@/app/components/ui/Modal/Modal";
import EstadoCodigoPill from "../components/EstadoCodigoPill";
import { getEspecialidades } from "../../Especialidades/especialidades.api";
import EspecialidadCombo from "../EspecialidadCombo";
import type {
  CodigoObraSocialOut,
  RevalorizarResult,
  ValorOut,
  GalenoOut,
  NomencladorOut,
  ComponentePayload,
  Origen,
  ReplicaResultadoItem,
  ReplicarValoresFamiliaPayload,
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

/** Lo que se cotiza: tipo de valor, componentes y coseguro. En "Cargar precio" hay
 * uno compartido (el del form) o uno por especialidad. */
type PrecioForm = {
  modalidad: ModalidadValor;
  componentes: ComponenteForm[];
  coseguro: string;
};

/** Precios activos que el código ya tiene en la O.S. (para no duplicarlos). */
type PreciosExistentes = {
  nn: boolean;
  /** NE sin especialidad (par sin restricción). */
  sinEspecialidad: boolean;
  especialidades: Set<number>;
};

type ValorForm = {
  nomencladorId: number | null;
  nomencladorLabel: string;
  /** Descripción por defecto del catálogo, sólo para mostrar el código elegido. */
  nomencladorDesc: string;
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
  /** NE con varias especialidades: un solo precio para todas (default) o uno por cada una. */
  mismoPrecio: boolean;
  /** Precio de cada especialidad cuando `mismoPrecio` está destildado. */
  precios: Record<number, PrecioForm>;
};

function formVacio(): ValorForm {
  return {
    nomencladorId: null,
    nomencladorLabel: "",
    nomencladorDesc: "",
    origen: "NE",
    modalidad: "calculable",
    vigencia_desde: today(),
    descripcion: "",
    porPresupuesto: false,
    nivel: "",
    complejidad: "",
    cantidad_ayudantes: "",
    coseguro: "",
    observacion: "",
    especialidadesChecked: new Set(),
    sinRestriccion: false,
    componentes: initComps(),
    mismoPrecio: true,
    precios: {},
  };
}

/** Componentes a mandar: Honorarios siempre; Gastos/Ayudante sólo si están cargados. */
function componentesPayload(
  modalidad: ModalidadValor,
  comps: ComponenteForm[],
): ComponentePayload[] {
  return comps
    .filter((c, i) => {
      if (i === 0) return true;
      if (modalidad === "calculable") return c.galeno_id != null;
      return c.valor_unitario.trim() !== "" && !isNaN(parseFloat(c.valor_unitario));
    })
    .map((c, i) => ({
      concepto: c.concepto,
      galeno_id: modalidad === "calculable" ? c.galeno_id : null,
      cantidad: modalidad === "calculable" ? parseFloat(c.cantidad) || 0 : 0,
      valor_unitario: modalidad === "fijo" ? parseFloat(c.valor_unitario) : null,
      opcional: c.opcional,
      orden: i,
    }));
}

/** "" o un importe ≥ 0; si no, el mensaje de error. */
function errorCoseguro(v: string): string | null {
  if (!v.trim()) return null;
  const n = parseFloat(v);
  if (isNaN(n)) return "Importe inválido";
  return n < 0 ? "El coseguro no puede ser negativo" : null;
}

/** "2026-10-03" → "03/10/2026". */
const fechaCorta = (iso: string) => iso.split("-").reverse().join("/");

/** El galeno nivelado que usa la ecuación (el primero), o null. Con galeno nivelado
 * el nivel del precio es el suyo: no se carga aparte. */
function galenoNivelado(
  comps: ComponenteForm[],
  galenoPorId: Map<number, GalenoOut>,
): GalenoOut | null {
  for (const c of comps) {
    const g = c.galeno_id != null ? galenoPorId.get(c.galeno_id) : undefined;
    if (g && g.nivel != null) return g;
  }
  return null;
}

/** Errores de un precio, con `prefijo` delante de cada clave (`""` para el compartido). */
function erroresPrecio(p: PrecioForm, prefijo: string): Record<string, string> {
  const errs: Record<string, string> = {};
  const cos = errorCoseguro(p.coseguro);
  if (cos) errs[`${prefijo}coseguro`] = cos;
  const hon = p.componentes[0];
  if (p.modalidad === "calculable") {
    if (!hon.galeno_id) errs[`${prefijo}comp_0_galeno`] = "Seleccioná un galeno";
  } else if (!hon.valor_unitario.trim() || isNaN(parseFloat(hon.valor_unitario))) {
    errs[`${prefijo}comp_0_valor`] = "Valor inválido";
  }
  p.componentes.slice(1).forEach((c, i) => {
    const idx = i + 1;
    if (p.modalidad === "calculable" && c.cantidad && !c.galeno_id)
      errs[`${prefijo}comp_${idx}_galeno`] = "Seleccioná un galeno";
    if (p.modalidad === "fijo" && c.valor_unitario.trim() && isNaN(parseFloat(c.valor_unitario)))
      errs[`${prefijo}comp_${idx}_valor`] = "Valor inválido";
  });
  return errs;
}

/** Los errores de un prefijo, sin el prefijo (lo que espera `ComponentEditor`). */
function erroresDe(errors: Record<string, string>, prefijo: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errors)) {
    if (k.startsWith(prefijo)) out[k.slice(prefijo.length)] = v;
  }
  return out;
}

function clonarPrecio(p: PrecioForm): PrecioForm {
  return { ...p, componentes: p.componentes.map((c) => ({ ...c })) };
}

/** El precio vigente de una fila, como formulario. */
function precioDeValor(v: ValorOut): PrecioForm {
  return {
    modalidad: v.modalidad === "galeno" ? "calculable" : "fijo",
    componentes: compsFromOut(v.componentes),
    coseguro: v.coseguro && parseMonto(v.coseguro) !== 0 ? v.coseguro : "",
  };
}

/** Para comparar contra lo que había al abrir: sólo rota lo que cambió. */
const firmaPrecio = (p: PrecioForm) => JSON.stringify(p);

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

const fmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

const PAGE_SIZE = 25;

function origenBadgeLabel(o: Origen): string {
  return ORIGEN_LABELS[o];
}

const MODALIDAD_LABELS: Record<ValorOut["modalidad"], string> = {
  galeno: "Calculable",
  fijo: "Fijo",
  por_presupuesto: "Por presupuesto",
};

const FIXED_CONCEPTOS: ComponenteForm["concepto"][] = [
  "Honorarios",
  "Gastos",
  "Ayudante",
];

function initComps(): ComponenteForm[] {
  return FIXED_CONCEPTOS.map((concepto) => ({
    concepto,
    galeno_id: null,
    cantidad: "",
    valor_unitario: "",
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
function montoDe(
  v: ValorOut,
  concepto: ComponenteForm["concepto"],
): number | null {
  const c = v.componentes.find((x) => x.concepto === concepto && x.activo);
  if (!c) return null;
  return c.tipo === "calculable"
    ? parseMonto(c.subtotal)
    : parseMonto(c.valor_unitario);
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
  onChange: (
    idx: number,
    key: keyof ComponenteForm,
    value: ComponenteForm[keyof ComponenteForm],
  ) => void;
};

function ComponentEditor({
  modalidad,
  componentes,
  galenos,
  errors,
  onChange,
}: CompEditorProps) {
  // Los activos, en el orden del boletín y con los niveles seguidos. El select
  // se recorre a ojo buscando un galeno puntual, así que el orden en que el
  // operador los tiene en la cabeza es el que importa.
  const galenosOrdenados = useMemo(
    () =>
      galenos
        .filter((g) => g.activo)
        .sort(
          (a, b) => compararGalenos(a, b) || (a.nivel ?? 0) - (b.nivel ?? 0),
        ),
    [galenos],
  );

  const galenoPorId = useMemo(
    () => new Map(galenos.map((g) => [g.id, g])),
    [galenos],
  );

  // Subtotal orientativo: galeno × cantidad (calculable) o el valor fijo. `null` = no se
  // puede calcular todavía (sin galeno, o cantidad en 0 = la completa el back).
  function subtotal(comp: ComponenteForm): number | null {
    if (modalidad === "fijo") {
      const v = parseFloat(comp.valor_unitario);
      return isNaN(v) ? null : v;
    }
    const g =
      comp.galeno_id != null ? galenoPorId.get(comp.galeno_id) : undefined;
    const cant = parseFloat(comp.cantidad);
    if (!g || isNaN(cant) || cant <= 0) return null;
    return parseMonto(g.valor_unitario) * cant;
  }

  const subtotales = componentes.map(subtotal);
  const total = subtotales.reduce<number>((acc, v) => acc + (v ?? 0), 0);
  const hayAuto =
    modalidad === "calculable" &&
    componentes.some((c, i) => c.galeno_id != null && subtotales[i] == null);

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
                {i === 0 ? (
                  <span className={styles.req}> *</span>
                ) : (
                  <span className={styles.compOpcional}>opcional</span>
                )}
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
                  <label
                    className={styles.formLabel}
                    htmlFor={`comp-${i}-galeno`}
                  >
                    Galeno
                  </label>
                  <select
                    id={`comp-${i}-galeno`}
                    className={`${styles.formSelect} ${styles.compControl} ${errGaleno ? styles.inputError : ""}`}
                    value={comp.galeno_id ?? ""}
                    onChange={(e) =>
                      onChange(
                        i,
                        "galeno_id",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  >
                    <option value="">
                      — {i === 0 ? "Seleccionar" : "Sin galeno"} —
                    </option>
                    {galenosOrdenados.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.codigo}
                        {g.nivel != null ? ` (niv. ${g.nivel})` : ""} —{" "}
                        {fmt.format(parseMonto(g.valor_unitario))}
                      </option>
                    ))}
                  </select>
                  {errGaleno && (
                    <span className={styles.errorMsg}>{errGaleno}</span>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label
                    className={styles.formLabel}
                    htmlFor={`comp-${i}-cantidad`}
                  >
                    Cantidad
                  </label>
                  <input
                    id={`comp-${i}-cantidad`}
                    type="number"
                    min="0"
                    step="0.01"
                    className={`${styles.formInput} ${styles.compControl}`}
                    value={comp.cantidad}
                    onChange={(e) => onChange(i, "cantidad", e.target.value)}
                    placeholder="0 = automático"
                  />
                </div>
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor={`comp-${i}-valor`}>
                  Valor fijo ($)
                </label>
                <input
                  id={`comp-${i}-valor`}
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${styles.formInput} ${styles.compControl} ${errValor ? styles.inputError : ""}`}
                  value={comp.valor_unitario}
                  onChange={(e) =>
                    onChange(i, "valor_unitario", e.target.value)
                  }
                  placeholder={i === 0 ? "0.00" : "Vacío si no aplica"}
                />
                {errValor && (
                  <span className={styles.errorMsg}>{errValor}</span>
                )}
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
          Los componentes con cantidad en 0 toman las unidades del galeno o del
          código al guardar; si no tienen, quedan en 0. El total no las incluye.
        </span>
      )}
    </div>
  );
}

// ─── BloquePrecio: tipo de valor + componentes + coseguro ──────────────────────

function BloquePrecio({
  precio,
  conTipo,
  soloCoseguro = false,
  galenos,
  errors,
  onModalidad,
  onCoseguro,
  onComp,
}: {
  precio: PrecioForm;
  /** NN no elige tipo: siempre galeno × unidades. */
  conTipo: boolean;
  /** Por presupuesto: no hay fórmula, sólo coseguro. */
  soloCoseguro?: boolean;
  galenos: GalenoOut[];
  errors: Record<string, string>;
  onModalidad: (m: ModalidadValor) => void;
  onCoseguro: (v: string) => void;
  onComp: CompEditorProps["onChange"];
}) {
  return (
    <>
      <div className={styles.formRow2}>
        {conTipo && !soloCoseguro && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tipo de valor</label>
            <select
              className={styles.formSelect}
              value={precio.modalidad}
              onChange={(e) => onModalidad(e.target.value as ModalidadValor)}
            >
              <option value="calculable">Calculable (galeno × cantidad)</option>
              <option value="fijo">Fijo ($)</option>
            </select>
          </div>
        )}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Coseguro ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={`${styles.formInput} ${errors.coseguro ? styles.inputError : ""}`}
            value={precio.coseguro}
            onChange={(e) => onCoseguro(e.target.value)}
            placeholder="0.00"
          />
          {errors.coseguro ? (
            <span className={styles.errorMsg}>{errors.coseguro}</span>
          ) : (
            <span className={styles.hintText}>
              Lo que el afiliado paga de su bolsillo; se descuenta del total al facturar
            </span>
          )}
        </div>
      </div>
      {!soloCoseguro && (
        <ComponentEditor
          modalidad={precio.modalidad}
          componentes={precio.componentes}
          galenos={galenos}
          errors={errors}
          onChange={onComp}
        />
      )}
    </>
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
  const [modalidadFilter, setModalidadFilter] = useState<
    ValorOut["modalidad"] | "todos"
  >("todos");
  const [soloPresupuesto, setSoloPresupuesto] = useState(false);
  const [especialidadFilter, setEspecialidadFilter] = useState<
    number | "todos"
  >("todos");
  const [page, setPage] = useState(1);

  // Modal
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [editTarget, setEditTarget] = useState<ValorOut | null>(null);

  // Create form
  const [form, setForm] = useState<ValorForm>(formVacio);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // Etapa 3: el alta del código elegido en esta O.S. (descripción, quién factura).
  // Sin alta no se puede cargar precio (etapa 4).
  const [parAlta, setParAlta] = useState<CodigoObraSocialOut | null>(null);
  const [parCargando, setParCargando] = useState(false);
  const [existentes, setExistentes] = useState<PreciosExistentes | null>(null);
  // Prestaciones cargadas en $0 para revalorizar después de guardar el precio.
  const [revalorizar, setRevalorizar] = useState<RevalorizarResult | null>(null);
  const [revalorizando, setRevalorizando] = useState(false)
  /** Resultado de precargar los componentes NN (unidades del Nomenclador Nacional). */
  const [nnMsg, setNnMsg] = useState<{
    tipo: "ok" | "error" | "cargando";
    texto: string;
  } | null>(null);

  // Edit forms
  const [editMeta, setEditMeta] = useState<EditMetaForm>({
    descripcion: "",
    sin_restriccion_especialidad: false,
    especialidades: [],
    nivel: "",
    complejidad: "",
    cantidad_ayudantes: "",
    observacion: "",
  });
  const [editEcu, setEditEcu] = useState<EditEcuForm>({
    vigencia_desde: today(),
    modalidad: "calculable",
    componentes: initComps(),
    coseguro: "",
    aplicarAVariantes: false,
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [savingMeta, setSavingMeta] = useState(false);
  // "nucleo" = el código PARA TODAS sus especialidades; "variante" = una sola fila
  // (solo valores, vigencia y coseguro). El NN es una fila única: mismo valor para
  // cualquier especialidad, pero se gestiona por el núcleo igual que el NE.
  const [editMode, setEditMode] = useState<EditMode>("variante");
  const [nucleoOrigen, setNucleoOrigen] = useState<"NE" | "NN">("NE");
  // Lápiz del código = rotar precios. Las filas del código (una por especialidad en
  // NE), el precio de cada una y si se cargan todas con el mismo.
  const [nucleoVariantes, setNucleoVariantes] = useState<ValorOut[]>([]);
  const [nucleoMismo, setNucleoMismo] = useState(true);
  const [nucleoComun, setNucleoComun] = useState<PrecioForm>(() => ({
    modalidad: "calculable",
    componentes: initComps(),
    coseguro: "",
  }));
  const [nucleoPrecios, setNucleoPrecios] = useState<Record<number, PrecioForm>>({});
  const nucleoInicial = useRef<{ comun: string; porFila: Record<number, string> }>({
    comun: "",
    porFila: {},
  });
  // Replicar en los otros planes de la familia de la OS (Swiss Medical, Medife…).
  const [replica, setReplica] = useState<ReplicaState>(REPLICA_INICIAL);
  const [replicaResultado, setReplicaResultado] = useState<
    ReplicaResultadoItem[] | null
  >(null);
  const [replicaError, setReplicaError] = useState<string | null>(null);
  const replicaTerminada = replicaResultado !== null || replicaError !== null;
  const [savingEcu, setSavingEcu] = useState(false);

  // Nomenclador search
  const [nomSearch, setNomSearch] = useState("");
  const [nomResults, setNomResults] = useState<NomencladorOut[]>([]);
  const [nomLoading, setNomLoading] = useState(false);
  const nomDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ValorOut | null>(null);

  const { data: osList = [] } = useObrasSociales();

  const { data: especialidades = [] } = useQuery({
    queryKey: ["especialidades"],
    queryFn: getEspecialidades,
    staleTime: 30 * 60 * 1000,
  });

  const espMap = useMemo(() => {
    const m: Record<number, string> = {};
    especialidades.forEach((e) => {
      m[e.id_colegio_espe] = e.nombre;
    });
    return m;
  }, [especialidades]);

  const { data: familia = [] } = useQuery({
    queryKey: ["familia-os", selectedNroOS],
    queryFn: () => getFamiliaObraSocial(selectedNroOS as number),
    enabled: selectedNroOS != null,
    staleTime: 5 * 60 * 1000,
  });

  const espOptions = useMemo(
    () =>
      especialidades.map((e) => ({
        value: e.id_colegio_espe,
        label: e.nombre,
      })),
    [especialidades],
  );

  // Códigos habilitados para la especialidad elegida EN ESTA OS (para acotar el
  // listado). Se traen todos los pares (paginando) y se guardan como Set de códigos
  // en mayúsculas — las especialidades son un dato por obra social.
  const { data: codigosDeEspecialidad, isFetching: espFilterFetching } =
    useQuery({
      queryKey: [
        "nomenclador-especialidad-codigos",
        selectedNroOS,
        especialidadFilter,
      ],
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
      .filter(
        (os) =>
          os.nombre?.toLowerCase().includes(q) ||
          String(os.nro_obra_social).includes(q),
      )
      .slice(0, 80);
  }, [osList, osSearch]);

  const selectedOS = osList.find((os) => os.nro_obra_social === selectedNroOS);

  // ─── Flujo en etapas ──────────────────────────────────────────────────────
  const bloqueadoPorAlta =
    !!form.nomencladorId && !!parAlta && (parAlta.estado === "sin_alta" || parAlta.estado === "suspendido");
  // NE: se elige entre las especialidades habilitadas en el alta (etapa 3).
  const espOptionsAlta = useMemo(
    () =>
      parAlta && !parAlta.sin_restriccion_especialidad && parAlta.especialidades.length > 0
        ? espOptions.filter((o) => parAlta.especialidades.includes(o.value))
        : espOptions,
    [parAlta, espOptions],
  );
  const bloqueadasPorPrecio = useMemo(
    () => new Map([...(existentes?.especialidades ?? [])].map((e) => [e, "Ya tiene precio"])),
    [existentes],
  );
  // Con "Mismos precios" destildado y más de una especialidad: un precio por cada una.
  const preciosSeparados =
    form.origen === "NE" &&
    !form.sinRestriccion &&
    !form.porPresupuesto &&
    !form.mismoPrecio &&
    form.especialidadesChecked.size > 1;
  const espSeleccionadas = useMemo(
    () =>
      [...form.especialidadesChecked].sort((a, b) =>
        (espMap[a] ?? "").localeCompare(espMap[b] ?? "", "es", { sensitivity: "base" }),
      ),
    [form.especialidadesChecked, espMap],
  );
  const galenoPorId = useMemo(() => new Map(galenos.map((g) => [g.id, g])), [galenos]);
  // Con galeno nivelado el nivel es el del galeno (se completa solo).
  const nivelCreate = useMemo(() => {
    const comps = preciosSeparados
      ? espSeleccionadas.flatMap((e) => form.precios[e]?.componentes ?? [])
      : form.componentes;
    return galenoNivelado(comps, galenoPorId);
  }, [preciosSeparados, espSeleccionadas, form.precios, form.componentes, galenoPorId]);
  // Códigos dados de alta en la O.S. que todavía no tienen precio.
  const pendientesQuery = useQuery({
    queryKey: ["codigos-sin-precio", selectedNroOS],
    queryFn: () => listCodigosPorOS({ obra_social_nro: selectedNroOS as number, estado: "sin_precio", size: 200 }),
    enabled: selectedNroOS !== null,
  });
  const pendientes = pendientesQuery.data?.items ?? [];

  // `?os=…&codigo=…` (desde la Ficha del código o Códigos por obra social).
  const [params] = useSearchParams();
  const paramsConsumidos = useRef(false);
  useEffect(() => {
    if (paramsConsumidos.current) return;
    const os = params.get("os");
    if (os && selectedNroOS === null) {
      setSelectedNroOS(Number(os));
      return;
    }
    const codigo = params.get("codigo");
    if (!codigo || selectedNroOS === null || !pendientesQuery.isFetched) return;
    paramsConsumidos.current = true;
    const pendiente = pendientes.find((p) => p.codigo === codigo);
    if (pendiente) abrirCargaPrecio(pendiente.nomenclador_id, pendiente.codigo, pendiente.descripcion_colegio);
    else setCodeSearch(codigo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, selectedNroOS, pendientesQuery.isFetched]);

  useEffect(() => {
    if (!selectedNroOS) {
      setGalenos([]);
      setValores([]);
      return;
    }
    listGalenos({ obra_social_nro: selectedNroOS })
      .then(setGalenos)
      .catch(() => {});
    loadValores(selectedNroOS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNroOS]);

  const loadValores = useCallback(
    async (osNro: number) => {
      setLoadingValores(true);
      try {
        // Sólo los precios en vigor (`estado: "activo"`): lo que se cerró al rotar un
        // precio es historial y no se lista acá.
        const all: ValorOut[] = [];
        for (let p = 1; p <= 100; p++) {
          const batch = await listValores({
            obra_social_nro: osNro,
            estado: "activo",
            page: p,
            size: 200,
          });
          all.push(...batch);
          if (batch.length < 200) break;
        }
        setValores(all);
      } catch {
        showToast("error", "Error al cargar los valores.");
      } finally {
        setLoadingValores(false);
      }
    },
    [],
  );

  // Ya no hay fallback al catálogo del Colegio: descripcion es obligatoria en el
  // alta nueva, así que solo queda vacía en filas viejas (previas a la fase 2 de
  // la reestructura) que todavía no se editaron.
  const resolvedDesc = useCallback((v: ValorOut) => v.descripcion ?? "", []);

  const filteredValores = useMemo(() => {
    let list = valores;
    if (origenFilter !== "todos")
      list = list.filter((v) => v.origen === origenFilter);
    if (modalidadFilter !== "todos")
      list = list.filter((v) => v.modalidad === modalidadFilter);
    if (soloPresupuesto) list = list.filter((v) => v.por_presupuesto);
    if (especialidadFilter !== "todos") {
      // Mientras el set carga (undefined) no mostramos nada para no confundir.
      list = codigosDeEspecialidad
        ? list.filter((v) => codigosDeEspecialidad.has(v.codigo.toUpperCase()))
        : [];
    }
    if (codeSearch.trim()) {
      const q = codeSearch.toLowerCase();
      list = list.filter(
        (v) =>
          v.codigo.toLowerCase().includes(q) ||
          (v.descripcion ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [
    valores,
    codeSearch,
    origenFilter,
    modalidadFilter,
    soloPresupuesto,
    especialidadFilter,
    codigosDeEspecialidad,
  ]);

  // Loading combinado: valores de la OS + resolución del set de la especialidad.
  const showLoading =
    loadingValores ||
    (especialidadFilter !== "todos" &&
      !codigosDeEspecialidad &&
      espFilterFetching);

  const grouped = useMemo(() => {
    const map = new Map<number, ValorOut[]>();
    for (const v of filteredValores) {
      const arr = map.get(v.nomenclador_id) ?? [];
      arr.push(v);
      map.set(v.nomenclador_id, arr);
    }
    const nombreEsp = (v: ValorOut) =>
      v.especialidad_id_colegio != null
        ? (espMap[v.especialidad_id_colegio] ?? "")
        : "";
    map.forEach((arr) =>
      arr.sort((x, y) =>
        x.origen === y.origen
          ? nombreEsp(x).localeCompare(nombreEsp(y), "es", {
              sensitivity: "base",
            })
          : x.origen === "NE"
            ? -1
            : 1,
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
  useEffect(() => {
    setPage(1);
  }, [
    selectedNroOS,
    codeSearch,
    origenFilter,
    modalidadFilter,
    soloPresupuesto,
    especialidadFilter,
  ]);
  // Ajustar si la página quedó fuera de rango (p. ej. tras cerrar un valor).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  // ─── Nomenclador autocomplete ──────────────────────────────────────────────

  function searchNom(q: string) {
    setNomSearch(q);
    if (nomDebounce.current) clearTimeout(nomDebounce.current);
    if (q.trim().length < 2) {
      setNomResults([]);
      return;
    }
    setNomLoading(true);
    nomDebounce.current = setTimeout(async () => {
      try {
        const results = await listNomenclador({
          q: q.trim(),
          en_descripcion: true,
          activo: true,
          size: 20,
        });
        setNomResults(results);
      } catch {
        setNomResults([]);
      } finally {
        setNomLoading(false);
      }
    }, 300);
  }

  function selectNom(n: Pick<NomencladorOut, "id" | "codigo"> & { descripcion?: string | null }) {
    setForm((prev) => ({
      ...prev,
      nomencladorId: n.id,
      nomencladorLabel: n.codigo,
      nomencladorDesc: n.descripcion ?? "",
    }));
    setNomSearch("");
    setNomResults([]);
    setErrors((prev) => ({ ...prev, nomenclador: "" }));
    void cargarAlta(n.id);
  }

  /** Trae el alta del código en la O.S. y precarga lo que viene de ahí: descripción,
   * quién factura, complejidad y ayudantes. */
  async function cargarAlta(nomencladorId: number) {
    if (!selectedNroOS) return;
    setParCargando(true);
    setParAlta(null);
    setExistentes(null);
    try {
      const p = await getCodigoOS(selectedNroOS, nomencladorId);
      // Precios activos del código en la O.S.: las especialidades que ya tienen
      // no se vuelven a cargar acá (se rotan con el lápiz).
      const activos = (
        await listValores({ obra_social_nro: selectedNroOS, codigo: p.codigo, estado: "activo", size: 200 })
      ).filter((v) => v.nomenclador_id === nomencladorId);
      const ex: PreciosExistentes = {
        nn: activos.some((v) => v.origen === "NN"),
        sinEspecialidad: activos.some((v) => v.origen === "NE" && v.especialidad_id_colegio == null),
        especialidades: new Set(
          activos
            .filter((v) => v.origen === "NE" && v.especialidad_id_colegio != null)
            .map((v) => v.especialidad_id_colegio as number),
        ),
      };
      setExistentes(ex);
      setParAlta(p);
      if (p.estado === "sin_precio" || p.estado === "con_precio") {
        setForm((prev) => ({
          ...prev,
          descripcion: p.descripcion ?? p.descripcion_colegio ?? prev.descripcion,
          nomencladorDesc: prev.nomencladorDesc || (p.descripcion_colegio ?? ""),
          complejidad: p.complejidad ?? prev.complejidad,
          cantidad_ayudantes:
            p.cantidad_ayudantes != null ? String(p.cantidad_ayudantes) : prev.cantidad_ayudantes,
          sinRestriccion: p.sin_restriccion_especialidad,
          especialidadesChecked: new Set(p.especialidades.filter((e) => !ex.especialidades.has(e))),
          precios: {},
        }));
        setErrors((prev) => ({ ...prev, descripcion: "", especialidades: "" }));
      }
    } catch {
      setParAlta(null);
    } finally {
      setParCargando(false);
    }
  }

  function clearNom() {
    setParAlta(null);
    setExistentes(null);
    setForm((prev) => ({ ...prev, nomencladorId: null, nomencladorLabel: "", nomencladorDesc: "" }));
    setNomSearch("");
    setNomResults([]);
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

  // Alta NN: con el código elegido, precarga Honorarios/Gastos/Ayudante con el
  // galeno que corresponde al rango del código y las unidades del Nomenclador
  // Nacional — la misma regla con la que se generan los NN al crear la OS.
  // Se dispara al elegir el código o al pasar a NN (en cualquier orden).
  const nnCreateOrigen = modalKind === "create" ? form.origen : null;
  const nnCreateNomId = modalKind === "create" ? form.nomencladorId : null;
  useEffect(() => {
    if (nnCreateOrigen !== "NN" || !nnCreateNomId || !selectedNroOS) {
      setNnMsg(null);
      return;
    }
    let vigente = true;
    setNnMsg({ tipo: "cargando", texto: "Cargando unidades del Nomenclador Nacional…" });
    getComponentesNN(selectedNroOS, nnCreateNomId)
      .then((r) => {
        if (!vigente) return;
        if (!r.disponible) {
          setNnMsg({
            tipo: "error",
            texto: `No se pudieron precargar las unidades: ${r.motivo ?? "sin datos"}. Cargalas a mano.`,
          });
          return;
        }
        setForm((prev) => ({
          ...prev,
          modalidad: "calculable",
          componentes: FIXED_CONCEPTOS.map((concepto) => {
            const s = r.componentes.find((c) => c.concepto === concepto);
            return {
              concepto,
              galeno_id: s?.galeno_id ?? null,
              cantidad: s ? String(Number(s.cantidad)) : "",
              valor_unitario: "",
              opcional: concepto !== "Honorarios",
            };
          }),
        }));
        setNnMsg({
          tipo: "ok",
          texto: "Unidades del Nomenclador Nacional cargadas: "
            + r.componentes
              .map((c) => `${c.concepto} ${Number(c.cantidad)} × ${c.galeno_nombre}`)
              .join(" · "),
        });
      })
      .catch(() => {
        if (vigente) {
          setNnMsg({ tipo: "error", texto: "No se pudieron cargar las unidades del Nomenclador Nacional." });
        }
      });
    return () => {
      vigente = false;
    };
  }, [nnCreateOrigen, nnCreateNomId, selectedNroOS]);

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

  function changeEditModalidad(m: ModalidadValor) {
    setEditEcu((prev) => ({
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

  /** Precio compartido (el del form) como `PrecioForm`. */
  const precioComun: PrecioForm = {
    modalidad: form.modalidad,
    componentes: form.componentes,
    coseguro: form.coseguro,
  };

  /** Tilda/destilda "Mismos precios". Al separar, cada especialidad arranca con
   * una copia de lo que ya estaba cargado en el precio común. */
  function cambiarMismoPrecio(mismo: boolean) {
    setForm((prev) => {
      if (mismo) return { ...prev, mismoPrecio: true };
      const precios: Record<number, PrecioForm> = {};
      const base = { modalidad: prev.modalidad, componentes: prev.componentes, coseguro: prev.coseguro };
      prev.especialidadesChecked.forEach((e) => {
        precios[e] = prev.precios[e] ?? clonarPrecio(base);
      });
      return { ...prev, mismoPrecio: false, precios };
    });
    setErrors({});
  }

  function cambiarEspecialidades(next: number[]) {
    setForm((prev) => {
      const precios = { ...prev.precios };
      if (!prev.mismoPrecio) {
        const base = { modalidad: prev.modalidad, componentes: prev.componentes, coseguro: prev.coseguro };
        next.forEach((e) => {
          if (!precios[e]) precios[e] = clonarPrecio(base);
        });
      }
      return { ...prev, especialidadesChecked: new Set(next), precios };
    });
    setErrors((p) => ({ ...p, especialidades: "" }));
  }

  function actualizarPrecioEsp(esp: number, cambio: (p: PrecioForm) => PrecioForm) {
    setForm((prev) => ({
      ...prev,
      precios: { ...prev.precios, [esp]: cambio(prev.precios[esp]) },
    }));
  }

  function cambiarModalidadEsp(esp: number, m: ModalidadValor) {
    actualizarPrecioEsp(esp, (p) => ({
      ...p,
      modalidad: m,
      componentes: p.componentes.map((c) => ({
        ...c,
        galeno_id: m === "fijo" ? null : c.galeno_id,
        cantidad: m === "fijo" ? "" : c.cantidad,
        valor_unitario: m === "calculable" ? "" : c.valor_unitario,
      })),
    }));
  }

  // ─── Component update helpers ──────────────────────────────────────────────

  function updateComp<K extends keyof ComponenteForm>(
    idx: number,
    key: K,
    value: ComponenteForm[K],
  ) {
    setForm((prev) => {
      const comps = [...prev.componentes];
      comps[idx] = { ...comps[idx], [key]: value };
      return { ...prev, componentes: comps };
    });
  }

  function updateEditComp<K extends keyof ComponenteForm>(
    idx: number,
    key: K,
    value: ComponenteForm[K],
  ) {
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
    if (
      form.origen === "NE" &&
      !form.sinRestriccion &&
      form.especialidadesChecked.size === 0
    ) {
      errs.especialidades =
        existentes && existentes.especialidades.size > 0
          ? "Tildá al menos una especialidad sin precio. Las que ya tienen se cambian con el lápiz del código."
          : "Tildá al menos una especialidad o marcá 'Sin restricción por especialidad'";
    }
    if (form.origen === "NN" && existentes?.nn) {
      errs.origen = "Este código ya tiene precio NN en esta obra social: se cambia con el lápiz.";
    }
    if (form.origen === "NE" && form.sinRestriccion && existentes?.sinEspecialidad) {
      errs.especialidades = "Este código ya tiene precio sin restricción: se cambia con el lápiz.";
    }
    if (form.porPresupuesto) {
      const cos = errorCoseguro(form.coseguro);
      if (cos) errs.coseguro = cos;
    } else {
      if (preciosSeparados) {
        espSeleccionadas.forEach((e) => {
          Object.assign(errs, erroresPrecio(form.precios[e], `esp_${e}_`));
        });
      } else {
        Object.assign(errs, erroresPrecio(precioComun, ""));
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateEcuacion(): boolean {
    const errs: Record<string, string> = {};
    if (!editEcu.vigencia_desde) errs.vigencia_desde = "Requerido";
    else if (editTarget && editEcu.vigencia_desde <= editTarget.vigencia_desde) {
      errs.vigencia_desde = `Tiene que ser posterior al ${fechaCorta(editTarget.vigencia_desde)}, desde cuando rige el precio actual.`;
    }
    const cos = errorCoseguro(editEcu.coseguro);
    if (cos) errs.coseguro = cos;
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
        if (
          editEcu.modalidad === "fijo" &&
          c.valor_unitario.trim() &&
          isNaN(parseFloat(c.valor_unitario))
        )
          errs[`comp_${idx}_valor`] = "Valor inválido";
      });
    }
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Open modals ───────────────────────────────────────────────────────────

  function openCreate() {
    setForm(formVacio());
    setNomSearch("");
    setNomResults([]);
    setErrors({});
    setParAlta(null);
    setExistentes(null);
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
      cantidad_ayudantes:
        v.cantidad_ayudantes != null ? String(v.cantidad_ayudantes) : "",
      observacion: v.observacion ?? "",
    });
    setEditEcu({
      vigencia_desde: today(),
      modalidad: mod,
      componentes: compsFromOut(v.componentes),
      coseguro: v.coseguro && parseMonto(v.coseguro) !== 0 ? v.coseguro : "",
      aplicarAVariantes: false,
    });
    setEditErrors({});
  }

  /** Lápiz de UNA fila: solo valores, vigencia y coseguro. */
  function openEdit(v: ValorOut) {
    const mod: ModalidadValor =
      v.modalidad === "galeno" ? "calculable" : "fijo";
    cargarFormsDeEdicion(v, mod);
    resetReplica();
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
    const mod: ModalidadValor =
      base.modalidad === "galeno" ? "calculable" : "fijo";
    cargarFormsDeEdicion(base, mod);
    const nombreFila = (v: ValorOut) =>
      v.especialidad_id_colegio != null ? (espMap[v.especialidad_id_colegio] ?? "") : "";
    const filas = [...grupo].sort((x, y) =>
      nombreFila(x).localeCompare(nombreFila(y), "es", { sensitivity: "base" }),
    );
    const porFila: Record<number, PrecioForm> = {};
    filas.forEach((v) => {
      porFila[v.id] = precioDeValor(v);
    });
    const comun = precioDeValor(base);
    // "Mismo precio" arranca tildado si hoy todas valen lo mismo; si no, cada
    // especialidad muestra el suyo.
    const firmas = new Set(filas.map((v) => firmaPrecio(porFila[v.id])));
    nucleoInicial.current = {
      comun: firmaPrecio(comun),
      porFila: Object.fromEntries(filas.map((v) => [v.id, firmaPrecio(porFila[v.id])])),
    };
    setNucleoVariantes(filas);
    setNucleoPrecios(porFila);
    setNucleoComun(comun);
    setNucleoMismo(firmas.size <= 1);
    resetReplica();
    setEditMode("nucleo");
    setModalKind("edit");
  }

  function cambiarNucleoMismo(mismo: boolean) {
    setNucleoMismo(mismo);
    setEditErrors({});
  }

  function actualizarNucleoPrecio(
    fila: number | "comun",
    cambio: (p: PrecioForm) => PrecioForm,
  ) {
    if (fila === "comun") setNucleoComun(cambio);
    else setNucleoPrecios((prev) => ({ ...prev, [fila]: cambio(prev[fila]) }));
  }

  function cambiarModalidadNucleo(fila: number | "comun", m: ModalidadValor) {
    actualizarNucleoPrecio(fila, (p) => ({
      ...p,
      modalidad: m,
      componentes: p.componentes.map((c) => ({
        ...c,
        galeno_id: m === "fijo" ? null : c.galeno_id,
        cantidad: m === "fijo" ? "" : c.cantidad,
        valor_unitario: m === "calculable" ? "" : c.valor_unitario,
      })),
    }));
  }

  function cambiarCompNucleo<K extends keyof ComponenteForm>(
    fila: number | "comun",
    idx: number,
    key: K,
    value: ComponenteForm[K],
  ) {
    actualizarNucleoPrecio(fila, (p) => {
      const comps = [...p.componentes];
      comps[idx] = { ...comps[idx], [key]: value };
      return { ...p, componentes: comps };
    });
  }

  /** Un solo formulario para todas: con una sola fila (o NN) no hay qué elegir. */
  const nucleoUnico = nucleoMismo || nucleoVariantes.length <= 1;
  const nucleoFilasCambiadas = nucleoUnico
    ? []
    : nucleoVariantes.filter(
        (v) => firmaPrecio(nucleoPrecios[v.id]) !== nucleoInicial.current.porFila[v.id],
      );
  const nucleoComunCambio =
    nucleoUnico && firmaPrecio(nucleoComun) !== nucleoInicial.current.comun;
  const nivelNucleo = galenoNivelado(
    nucleoUnico
      ? nucleoComun.componentes
      : nucleoVariantes.flatMap((v) => nucleoPrecios[v.id]?.componentes ?? []),
    galenoPorId,
  );

  function leyendaEdicion(): string | null {
    if (editMode === "nucleo") {
      return nucleoOrigen === "NN"
        ? "Estás modificando el precio del NOMENCLADOR NACIONAL de este código (mismo valor para cualquier especialidad)"
        : nucleoUnico
          ? "Estás modificando este código PARA TODAS LAS ESPECIALIDADES con precio"
          : "Estás modificando el precio de CADA ESPECIALIDAD de este código";
    }
    if (editMode === "variante" && editTarget?.origen === "NN") {
      return "Estás modificando los valores del NOMENCLADOR NACIONAL de este código (mismo valor para todas sus especialidades)";
    }
    if (editMode === "variante" && editTarget) {
      const nombre =
        editTarget.especialidad_id_colegio != null
          ? (espMap[editTarget.especialidad_id_colegio] ??
            `Esp. ${editTarget.especialidad_id_colegio}`)
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
    ...payloads: Omit<
      ReplicarValoresFamiliaPayload,
      "origen_obra_social_nro" | "destinos"
    >[]
  ): Promise<boolean> {
    const destinos = destinosReplica(replica);
    if (!selectedNroOS || destinos.length === 0) return false;
    try {
      // Precios distintos por especialidad: una réplica por cada una.
      const resultados: ReplicaResultadoItem[] = [];
      for (const payload of payloads) {
        const r = await replicarValoresEnFamilia({
          ...payload,
          origen_obra_social_nro: selectedNroOS,
          destinos,
        });
        resultados.push(...r.resultados);
      }
      setReplicaResultado(resultados);
    } catch (e: unknown) {
      setReplicaError(errMsg(e, "Error de red o del servidor."));
    }
    return true;
  }

  const replicaActiva = replica.activo && replica.destinos.length > 0;

  // ─── Prestaciones cargadas en $0 (código dado de alta sin precio) ───────────

  async function ofrecerRevalorizar(codigo: string) {
    if (!selectedNroOS) return;
    try {
      const r = await revalorizarPrestaciones({
        cod_obra: String(selectedNroOS), codigo, dry_run: true,
      });
      if (r.total > 0) setRevalorizar(r);
    } catch {
      /* sin prestaciones para revalorizar o sin permiso: no se ofrece */
    }
  }

  async function confirmarRevalorizar() {
    if (!revalorizar) return;
    setRevalorizando(true);
    try {
      const r = await revalorizarPrestaciones({
        cod_obra: revalorizar.cod_obra, codigo: revalorizar.codigo, dry_run: false,
      });
      showToast("success", `${r.revalorizadas} prestación${r.revalorizadas === 1 ? "" : "es"} revalorizada${r.revalorizadas === 1 ? "" : "s"}.`);
      setRevalorizar(null);
    } catch (e: unknown) {
      showToast("error", errMsg(e, "No se pudo revalorizar."));
    } finally {
      setRevalorizando(false);
    }
  }

  /** Abre "Cargar precio" con el código ya elegido (desde el aviso de pendientes o la URL). */
  function abrirCargaPrecio(nomencladorId: number, codigo: string, descripcion?: string | null) {
    openCreate();
    selectNom({ id: nomencladorId, codigo, descripcion });
  }

  // ─── Save actions ──────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validateCreate() || !selectedNroOS) return;
    setSaving(true);
    try {
      const componentes = form.porPresupuesto
        ? []
        : componentesPayload(form.modalidad, form.componentes);
      const base = {
        descripcion: form.descripcion.trim(),
        nivel: nivelCreate
          ? nivelCreate.nivel
          : form.nivel
            ? parseInt(form.nivel, 10)
            : null,
        complejidad: form.complejidad || null,
        por_presupuesto: form.porPresupuesto,
        cantidad_ayudantes: form.cantidad_ayudantes.trim()
          ? parseInt(form.cantidad_ayudantes, 10)
          : null,
        coseguro: form.coseguro.trim() ? parseMonto(form.coseguro) : 0,
        vigencia_desde: form.vigencia_desde,
        observacion: form.observacion || null,
        componentes,
      };
      const especialidadesAlta =
        form.origen === "NE" && !form.sinRestriccion
          ? [...form.especialidadesChecked]
          : [];
      if (preciosSeparados) {
        // Un precio por especialidad: una alta por cada una. Si una falla, las
        // anteriores quedan guardadas y se avisa cuál no entró.
        const creados: ValorOut[] = [];
        const replicas: Parameters<typeof replicarSiCorresponde> = [];
        try {
          for (const e of espSeleccionadas) {
            const p = form.precios[e];
            const propio = {
              ...base,
              coseguro: p.coseguro.trim() ? parseMonto(p.coseguro) : 0,
              componentes: componentesPayload(p.modalidad, p.componentes),
            };
            const nuevos = await createValorMulti({
              ...propio,
              obra_social_nro: selectedNroOS,
              nomenclador_id: form.nomencladorId!,
              origen: "NE",
              especialidades_id_colegio: [e],
            });
            creados.push(...nuevos);
            replicas.push({
              nomenclador_id: form.nomencladorId!,
              operacion: "alta",
              alta: { ...propio, origen: "NE", especialidades_id_colegio: [e], sin_restriccion_especialidad: null },
            });
          }
        } finally {
          if (creados.length > 0) setValores((prev) => [...creados, ...prev]);
        }
        showToast("success", `Precio cargado para ${creados.length} especialidades.`);
        void ofrecerRevalorizar(form.nomencladorLabel);
        void pendientesQuery.refetch();
        const replicado = await replicarSiCorresponde(...replicas);
        if (!replicado) setModalKind(null);
        return;
      }
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
        showToast(
          "success",
          "Código agregado sin restricción por especialidad.",
        );
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
      void ofrecerRevalorizar(form.nomencladorLabel);
      void pendientesQuery.refetch();
      const replicado = await replicarSiCorresponde({
        nomenclador_id: form.nomencladorId!,
        operacion: "alta",
        alta: {
          ...base,
          origen: form.origen,
          especialidades_id_colegio: especialidadesAlta,
          sin_restriccion_especialidad:
            form.origen === "NE" && form.sinRestriccion ? true : null,
        },
      });
      if (!replicado) setModalKind(null);
    } catch (e: unknown) {
      showToast("error", errMsg(e, "No se pudo guardar."));
      // Con precios por especialidad, las anteriores al error ya quedaron guardadas.
      if (preciosSeparados && selectedNroOS) void loadValores(selectedNroOS);
    } finally {
      setSaving(false);
    }
  }

  function buildEcuComponentes(): ComponentePayload[] {
    if (editTarget?.por_presupuesto) return [];
    const filled = editEcu.componentes.filter((c, i) => {
      if (i === 0) return true;
      if (editEcu.modalidad === "calculable") return c.galeno_id != null;
      return (
        c.valor_unitario.trim() !== "" && !isNaN(parseFloat(c.valor_unitario))
      );
    });
    return filled.map((c, i) => ({
      concepto: c.concepto,
      galeno_id: editEcu.modalidad === "calculable" ? c.galeno_id : null,
      cantidad:
        editEcu.modalidad === "calculable" ? parseFloat(c.cantidad) || 0 : 0,
      valor_unitario:
        editEcu.modalidad === "fijo" ? parseFloat(c.valor_unitario) : null,
      opcional: c.opcional,
      orden: i,
    }));
  }

  /** El motivo que manda el servidor, sólo si es texto. Los errores de validación
   * llegan como lista de objetos: mostrarlos tal cual rompía el aviso. */
  function errMsg(e: unknown, fallback: string): string {
    const d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    if (typeof d === "string") return d;
    if (d && typeof d === "object" && typeof (d as { mensaje?: unknown }).mensaje === "string") {
      return (d as { mensaje: string }).mensaje;
    }
    return fallback;
  }

  // Lápiz del código: datos del código + rotar precios (de todas juntas o de cada
  // especialidad). Quién factura no se toca acá: es del alta (etapa 3).
  async function handleSaveNucleo() {
    if (!editTarget || !selectedNroOS) return;
    const errs: Record<string, string> = {};
    const rota = nucleoComunCambio || nucleoFilasCambiadas.length > 0;
    if (rota && !editEcu.vigencia_desde) errs.vigencia_desde = "Requerido";
    // La nueva vigencia tiene que ser posterior a la de los precios que se rotan.
    const rotadas = nucleoComunCambio ? nucleoVariantes : nucleoFilasCambiadas;
    const ultima = rotadas.map((v) => v.vigencia_desde).sort().pop();
    if (rota && editEcu.vigencia_desde && ultima && editEcu.vigencia_desde <= ultima) {
      errs.vigencia_desde = `Tiene que ser posterior al ${fechaCorta(ultima)}, desde cuando rige el precio actual.`;
    }
    if (editTarget.por_presupuesto) {
      if (nucleoComunCambio) {
        const c = errorCoseguro(nucleoComun.coseguro);
        if (c) errs.comun_coseguro = c;
      }
      nucleoFilasCambiadas.forEach((v) => {
        const c = errorCoseguro(nucleoPrecios[v.id].coseguro);
        if (c) errs[`fila_${v.id}_coseguro`] = c;
      });
    }
    if (!editTarget.por_presupuesto) {
      if (nucleoComunCambio) Object.assign(errs, erroresPrecio(nucleoComun, "comun_"));
      nucleoFilasCambiadas.forEach((v) => {
        Object.assign(errs, erroresPrecio(nucleoPrecios[v.id], `fila_${v.id}_`));
      });
    }
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const ecuacionDe = (p: PrecioForm, porPresupuesto: boolean) => ({
      vigencia_desde: editEcu.vigencia_desde,
      componentes: porPresupuesto ? [] : componentesPayload(p.modalidad, p.componentes),
      coseguro: p.coseguro.trim() ? parseMonto(p.coseguro) : 0,
      por_presupuesto: porPresupuesto,
    });

    setSavingMeta(true);
    try {
      const nucleoPayload = {
        descripcion: editMeta.descripcion,
        // Con galeno nivelado el nivel sale del galeno: no se manda suelto.
        nivel: nivelNucleo ? null : editMeta.nivel ? parseInt(editMeta.nivel, 10) : null,
        complejidad: editMeta.complejidad || null,
        cantidad_ayudantes: editMeta.cantidad_ayudantes.trim()
          ? parseInt(editMeta.cantidad_ayudantes, 10)
          : null,
        observacion: editMeta.observacion || null,
        ecuacion: nucleoComunCambio
          ? ecuacionDe(nucleoComun, editTarget.por_presupuesto)
          : null,
        sin_restriccion_especialidad: false,
        especialidades: [],
        tocar_especialidades: false,
        origen: nucleoOrigen,
      };
      await updateNucleoPar(selectedNroOS, editTarget.nomenclador_id, nucleoPayload);
      const replicas: Parameters<typeof replicarSiCorresponde> = [
        { nomenclador_id: editTarget.nomenclador_id, operacion: "nucleo", nucleo: nucleoPayload },
      ];
      for (const v of nucleoFilasCambiadas) {
        const ecuacion = {
          ...ecuacionDe(nucleoPrecios[v.id], v.por_presupuesto),
          aplicar_a_variantes: false,
        };
        await actualizarValor(v.id, ecuacion);
        replicas.push({
          nomenclador_id: v.nomenclador_id,
          operacion: "variante",
          variante: { origen: v.origen, especialidad_id_colegio: v.especialidad_id_colegio, ecuacion },
        });
      }
      showToast(
        "success",
        rota ? "Precios actualizados. Recargando…" : "Código actualizado. Recargando…",
      );
      const replicado = await replicarSiCorresponde(...replicas);
      if (!replicado) setModalKind(null);
      loadValores(selectedNroOS);
    } catch (e: unknown) {
      showToast("error", errMsg(e, "No se pudo actualizar el código."));
      loadValores(selectedNroOS);
    } finally {
      setSavingMeta(false);
    }
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
    } finally {
      setSavingEcu(false);
    }
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
      showToast("error", errMsg(e, "No se pudo cerrar el valor."));
    }
  }

  function handleDelete(v: ValorOut) {
    setDeleteTarget(v);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <Building2 size={20} />
        </span>
        <div>
          <h1 className={styles.title}>Valores por Obra Social</h1>
          <p className={styles.subtitle}>
            Listado y carga de los valores de cada código por obra social
          </p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── OS panel ── */}
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
                onClick={() => {
                  setSelectedNroOS(os.nro_obra_social);
                  setCodeSearch("");
                }}
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
                <h2 className={styles.contentTitle}>
                  {selectedOS?.nombre ?? `OS ${selectedNroOS}`}
                </h2>
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
                  {(
                    ["todos", "galeno", "fijo", "por_presupuesto"] as const
                  ).map((m) => (
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
                  value={
                    especialidadFilter === "todos" ? null : especialidadFilter
                  }
                  onChange={(v) =>
                    setEspecialidadFilter(v === null ? "todos" : v)
                  }
                />
                <button className={styles.btnPrimary} onClick={openCreate}>
                  <Plus size={14} /> Cargar precio
                </button>
              </div>

              {pendientes.length > 0 && (
                <div className={styles.pendientes} role="status">
                  <span>
                    <strong>{pendientes.length} código{pendientes.length === 1 ? "" : "s"} dado{pendientes.length === 1 ? "" : "s"} de alta sin precio.</strong>{" "}
                    Facturación ya los puede cargar (en $0, si está habilitado); cargales el precio:
                  </span>
                  <div className={styles.pendientesChips}>
                    {pendientes.slice(0, 30).map((p) => (
                      <button
                        key={p.nomenclador_id}
                        type="button"
                        className={styles.pendienteChip}
                        title={p.descripcion_os ?? p.descripcion_colegio ?? ""}
                        onClick={() => abrirCargaPrecio(p.nomenclador_id, p.codigo, p.descripcion_colegio)}
                      >
                        {p.codigo}
                      </button>
                    ))}
                    {pendientes.length > 30 && (
                      <Link to={`/panel/nomenclador/codigos-por-os?os=${selectedNroOS}`} className={styles.hintText}>
                        y {pendientes.length - 30} más…
                      </Link>
                    )}
                  </div>
                </div>
              )}

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
                      <tr>
                        <td colSpan={10} className={styles.loadingCell}>
                          Cargando…
                        </td>
                      </tr>
                    ) : grouped.length === 0 ? (
                      <tr>
                        <td colSpan={10} className={styles.emptyCell}>
                          {especialidadFilter !== "todos"
                            ? "Sin códigos de esta especialidad"
                            : "Sin códigos cargados"}
                        </td>
                      </tr>
                    ) : (
                      pageGroups.map(([nomId, variants]) => {
                        const first = variants[0];
                        return (
                          <Fragment key={nomId}>
                            <tr className={styles.groupHeader}>
                              <td colSpan={10}>
                                <span className={styles.codeCell}>
                                  {first.codigo}
                                </span>
                                {resolvedDesc(first) && (
                                  <span className={styles.groupDesc}>
                                    {" "}
                                    — {resolvedDesc(first)}
                                  </span>
                                )}
                                {
                                  <button
                                    className={styles.btnEdit}
                                    style={{ marginLeft: 10 }}
                                    onClick={() =>
                                      openEditNucleo(
                                        nomId,
                                        variants.some((x) => x.origen === "NE")
                                          ? "NE"
                                          : "NN",
                                      )
                                    }
                                    title="Editar el código para todas las especialidades"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                }
                              </td>
                            </tr>
                            {variants.map((v) => (
                              <tr key={v.id} className={styles.variantRow}>
                                <td>
                                  <span
                                    className={`${styles.origenBadge} ${styles[`origen${v.origen}` as keyof typeof styles]}`}
                                  >
                                    {origenBadgeLabel(v.origen)}
                                  </span>
                                </td>
                                <td className={styles.mutedText}>
                                  {MODALIDAD_LABELS[v.modalidad]}
                                </td>
                                <td className={styles.mutedText}>
                                  {v.especialidad_id_colegio
                                    ? (espMap[v.especialidad_id_colegio] ??
                                      `Esp. ${v.especialidad_id_colegio}`)
                                    : v.origen === "NE"
                                      ? "Sin especialidad"
                                      : v.sin_restriccion_especialidad
                                        ? "Mismo valor · Sin restricción"
                                        : `Mismo valor · ${v.especialidades.length} especialidad${v.especialidades.length === 1 ? "" : "es"}`}
                                </td>
                                <td className={styles.mutedText}>
                                  {v.nivel != null ? `Niv. ${v.nivel}` : "—"}
                                </td>
                                {v.por_presupuesto ? (
                                  // El chip ocupa las tres columnas de importe:
                                  // sin precio pactado no hay nada que desglosar.
                                  <td colSpan={3}>
                                    <span className={styles.presupuestoChip}>
                                      Por presupuesto
                                    </span>
                                  </td>
                                ) : (
                                  <>
                                    <td>
                                      <span className={styles.priceCell}>
                                        {fmt.format(
                                          montoDe(v, "Honorarios") ?? 0,
                                        )}
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
                                  {parseMonto(v.coseguro) === 0
                                    ? "—"
                                    : fmt.format(parseMonto(v.coseguro))}
                                </td>
                                <td className={styles.mutedText}>
                                  {v.vigencia_desde}
                                </td>
                                <td>
                                  <div className={styles.actionsCell}>
                                    <button
                                      className={styles.btnEdit}
                                      onClick={() => openEdit(v)}
                                      title="Editar valores y vigencia"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      className={styles.btnDanger}
                                      onClick={() => handleDelete(v)}
                                      title="Cerrar"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className={styles.cardList}>
                {pageGroups
                  .flatMap(([, vs]) => vs)
                  .map((v) => (
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
                            <span>
                              Ayudante {fmt.format(montoDe(v, "Ayudante")!)}
                            </span>
                          )}
                          {montoDe(v, "Gastos") != null && (
                            <span>
                              Gastos {fmt.format(montoDe(v, "Gastos")!)}
                            </span>
                          )}
                        </p>
                      )}
                      {parseMonto(v.coseguro) > 0 && (
                        <p className={styles.cardConceptos}>
                          <span>
                            Coseguro {fmt.format(parseMonto(v.coseguro))}
                          </span>
                        </p>
                      )}
                      <div className={styles.cardActions}>
                        <button
                          className={styles.btnEdit}
                          onClick={() =>
                            openEditNucleo(
                              v.nomenclador_id,
                              valores.some(
                                (x) =>
                                  x.nomenclador_id === v.nomenclador_id &&
                                  x.origen === "NE",
                              )
                                ? "NE"
                                : "NN",
                            )
                          }
                        >
                          <Edit2 size={12} /> Código
                        </button>
                        <button
                          className={styles.btnEdit}
                          onClick={() => openEdit(v)}
                        >
                          <Edit2 size={12} /> Editar
                        </button>
                        <button
                          className={styles.btnDanger}
                          onClick={() => handleDelete(v)}
                        >
                          <Trash2 size={12} /> Cerrar
                        </button>
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
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
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
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`${styles.modal} ${styles.modalXl}`}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>Cargar precio</h2>
                  <p className={styles.modalSubtitle}>{selectedOS?.nombre}</p>
                </div>
                <button
                  className={styles.modalClose}
                  onClick={() => setModalKind(null)}
                >
                  <XIcon size={18} />
                </button>
              </div>

              <div className={styles.modalBody}>
                {/* Nomenclador picker */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Código de nomenclador <span className={styles.req}>*</span>
                  </label>
                  {form.nomencladorId ? (
                    <div className={styles.selectedCode}>
                      <strong>{form.nomencladorLabel}</strong>
                      {form.nomencladorDesc && (
                        <span className={styles.selectedCodeDesc}>{form.nomencladorDesc}</span>
                      )}
                      <button
                        style={{
                          marginLeft: "auto",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#718096",
                        }}
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
                          placeholder="Buscá por código o por nombre…"
                          style={{
                            paddingRight: nomLoading ? 36 : 12,
                            width: "100%",
                            boxSizing: "border-box",
                          }}
                        />
                        {nomLoading && (
                          <span
                            style={{
                              position: "absolute",
                              right: 10,
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#718096",
                            }}
                          >
                            <Loader2
                              size={14}
                              style={{ animation: "spin .7s linear infinite" }}
                            />
                          </span>
                        )}
                      </div>
                      {nomResults.length > 0 && (
                        <ul className={styles.autocompleteDropdown}>
                          {nomResults.map((n) => (
                            <li
                              key={n.id}
                              className={styles.autocompleteItem}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectNom(n);
                              }}
                            >
                              <strong>{n.codigo}</strong>
                              {" - "}
                              {n.descripcion ?? ""}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {errors.nomenclador && (
                    <span className={styles.errorMsg}>
                      {errors.nomenclador}
                    </span>
                  )}
                  {form.nomencladorId && (
                    <div className={styles.altaBox}>
                      {parCargando ? (
                        <span className={styles.hintText}>Revisando el alta del código en la obra social…</span>
                      ) : bloqueadoPorAlta && parAlta ? (
                        <div className={styles.altaBloqueo}>
                          <strong>
                            {parAlta.estado === "suspendido"
                              ? `${form.nomencladorLabel} está suspendido en ${selectedOS?.nombre ?? "esta obra social"}.`
                              : `${selectedOS?.nombre ?? "Esta obra social"} no tiene dado de alta el código ${form.nomencladorLabel}.`}
                          </strong>
                          <span>
                            Para cargarle un precio primero tiene que reconocer el código: descripción,
                            quién lo factura y condiciones. Es un paso corto y no pide importes.
                          </span>
                          <Link
                            className={styles.btnPrimary}
                            to={`/panel/nomenclador/codigos-por-os?os=${selectedNroOS}&codigo=${form.nomencladorLabel}`}
                          >
                            {parAlta.estado === "suspendido" ? "Reactivar en Códigos por obra social" : "Dar de alta en Códigos por obra social"}
                          </Link>
                        </div>
                      ) : parAlta ? (
                        <div className={styles.altaOk}>
                          <EstadoCodigoPill estado={parAlta.estado} />
                          <span>
                            {parAlta.sin_restriccion_especialidad
                              ? "Lo factura cualquier especialidad"
                              : `Lo facturan ${parAlta.especialidades.length} especialidades`}
                            {" · "}
                            <Link to={`/panel/nomenclador/codigos-por-os?os=${selectedNroOS}&codigo=${form.nomencladorLabel}`}>
                              Editar el alta
                            </Link>
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Descripción — obligatoria: cómo nombra ESTA obra social al código. */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Descripción <span className={styles.req}>*</span>
                  </label>
                  <input
                    className={`${styles.formInput} ${errors.descripcion ? styles.inputError : ""}`}
                    value={form.descripcion}
                    readOnly={!!parAlta?.descripcion}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, descripcion: e.target.value }));
                      setErrors((p) => ({ ...p, descripcion: "" }));
                    }}
                    placeholder="Cómo nombra esta obra social al código"
                  />
                  {parAlta?.descripcion && (
                    <span className={styles.hintText}>Viene del alta del código en la obra social; se edita en Códigos por obra social.</span>
                  )}
                  {errors.descripcion && (
                    <span className={styles.errorMsg}>
                      {errors.descripcion}
                    </span>
                  )}
                </div>

                {/* Origen */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Origen <span className={styles.req}>*</span>
                  </label>
                  <select
                    className={`${styles.formSelect} ${errors.origen ? styles.inputError : ""}`}
                    value={form.origen}
                    onChange={(e) => {
                      changeOrigen(e.target.value as Origen);
                      setErrors((p) => ({ ...p, origen: "" }));
                    }}
                  >
                    {(
                      Object.entries(ORIGEN_LABELS) as [Origen, string][]
                    ).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label} ({k})
                      </option>
                    ))}
                  </select>
                  {form.origen === "NN" && existentes?.nn && (
                    <span className={styles.avisoPrecio}>
                      Este código ya tiene precio NN en esta obra social. Para cambiarlo usá el lápiz del código.
                    </span>
                  )}
                  {errors.origen && !existentes?.nn && (
                    <span className={styles.errorMsg}>{errors.origen}</span>
                  )}
                </div>

                {/* Especialidades — solo NE. Una fila por cada tildada (POST /valores_nm/multi):
                    mismo precio, misma vigencia, filas separadas. Se puede elegir
                    cualquier especialidad del catálogo: crear la variante la habilita
                    automáticamente para este código en esta OS si todavía no lo estaba. */}
                {form.origen === "NE" && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Especialidades{" "}
                      {!form.sinRestriccion && (
                        <span className={styles.req}>*</span>
                      )}
                    </label>
                    {!form.nomencladorId ? (
                      <span className={styles.hintText}>
                        Elegí un código primero
                      </span>
                    ) : (
                      <>
                        <label className={styles.toggleRow}>
                          <input
                            type="checkbox"
                            className={styles.toggleInput}
                            checked={form.sinRestriccion}
                            disabled={!!parAlta}
                            onChange={(e) => {
                              setForm((p) => ({
                                ...p,
                                sinRestriccion: e.target.checked,
                              }));
                              setErrors((p) => ({ ...p, especialidades: "" }));
                            }}
                          />
                          <span className={styles.toggleLabel}>
                            Sin restricción por especialidad
                          </span>
                        </label>
                        {form.sinRestriccion ? (
                          existentes?.sinEspecialidad ? (
                            <span className={styles.avisoPrecio}>
                              Este código ya tiene precio sin restricción. Para cambiarlo usá el lápiz del código.
                            </span>
                          ) : (
                            <span className={styles.hintText}>
                              Se crea una sola fila "sin especialidad": vale para
                              cualquier médico.
                            </span>
                          )
                        ) : (
                          <>
                            <MultiSelectBuscable
                              options={espOptionsAlta}
                              selected={[...form.especialidadesChecked]}
                              onChange={cambiarEspecialidades}
                              bloqueadas={bloqueadasPorPrecio}
                              noun="especialidades"
                            />
                            {bloqueadasPorPrecio.size > 0 && (
                              <span className={styles.hintText}>
                                Las que dicen «Ya tiene precio» no se cargan acá: su precio se cambia con el lápiz del código.
                              </span>
                            )}
                          </>
                        )}
                      </>
                    )}
                    {errors.especialidades && (
                      <span className={styles.errorMsg}>
                        {errors.especialidades}
                      </span>
                    )}
                  </div>
                )}

                {/* Nivel + complejidad */}
                <div className={styles.formRow2}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Nivel</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className={styles.formInput}
                      value={nivelCreate ? String(nivelCreate.nivel) : form.nivel}
                      disabled={!!nivelCreate}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, nivel: e.target.value }))
                      }
                      placeholder="Opcional"
                    />
                    {nivelCreate && (
                      <span className={styles.hintText}>
                        Lo define el galeno {nivelCreate.nombre}.
                      </span>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Complejidad</label>
                    <select
                      className={styles.formSelect}
                      value={form.complejidad}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, complejidad: e.target.value }))
                      }
                    >
                      <option value="">— Hereda del nomenclador —</option>
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </div>

                {/* Vigencia + ayudantes */}
                <div className={styles.formRow2}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Vigente desde <span className={styles.req}>*</span>
                    </label>
                    <input
                      type="date"
                      className={`${styles.formInput} ${errors.vigencia_desde ? styles.inputError : ""}`}
                      value={form.vigencia_desde}
                      onChange={(e) => {
                        setForm((p) => ({
                          ...p,
                          vigencia_desde: e.target.value,
                        }));
                        setErrors((p) => ({ ...p, vigencia_desde: "" }));
                      }}
                    />
                    {errors.vigencia_desde && (
                      <span className={styles.errorMsg}>
                        {errors.vigencia_desde}
                      </span>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Cantidad de ayudantes
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={styles.formInput}
                      value={form.cantidad_ayudantes}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          cantidad_ayudantes: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                    <span className={styles.hintText}>
                      Máximo admitido para este código+OS. Vacío = no lleva —
                      sin esto no aparece "Agregar ayudante" en Carga de
                      Facturación.
                    </span>
                  </div>
                </div>

                {/* Por presupuesto: no existe para NN (siempre galeno × unidades). */}
                {form.origen !== "NN" && (
                  <label className={styles.toggleRow}>
                    <input
                      type="checkbox"
                      className={styles.toggleInput}
                      checked={form.porPresupuesto}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          porPresupuesto: e.target.checked,
                        }))
                      }
                    />
                    <span className={styles.toggleLabel}>Por presupuesto</span>
                  </label>
                )}

                {form.porPresupuesto ? (
                  <div className={styles.formGroup} style={{ maxWidth: 320 }}>
                    <label className={styles.formLabel}>Coseguro ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={`${styles.formInput} ${errors.coseguro ? styles.inputError : ""}`}
                      value={form.coseguro}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, coseguro: e.target.value }))
                      }
                      placeholder="0.00"
                    />
                    {errors.coseguro && (
                      <span className={styles.errorMsg}>{errors.coseguro}</span>
                    )}
                  </div>
                ) : (
                  <>
                    <div className={styles.sectionTitle}>Precio</div>
                    {form.origen === "NE" &&
                      !form.sinRestriccion &&
                      form.especialidadesChecked.size > 1 && (
                        <label className={styles.toggleRow}>
                          <input
                            type="checkbox"
                            className={styles.toggleInput}
                            checked={form.mismoPrecio}
                            onChange={(e) => cambiarMismoPrecio(e.target.checked)}
                          />
                          <span className={styles.toggleLabel}>
                            Mismos precios para todas las especialidades
                          </span>
                        </label>
                      )}
                    {preciosSeparados ? (
                      espSeleccionadas.map((e) => {
                        const p = form.precios[e];
                        const prefijo = `esp_${e}_`;
                        return (
                          <div key={e} className={styles.precioEsp}>
                            <div className={styles.precioEspTitulo}>
                              {espMap[e] ?? `Esp. ${e}`}
                            </div>
                            <BloquePrecio
                              precio={p}
                              conTipo
                              galenos={galenos}
                              errors={erroresDe(errors, prefijo)}
                              onModalidad={(m) => cambiarModalidadEsp(e, m)}
                              onCoseguro={(v) => actualizarPrecioEsp(e, (x) => ({ ...x, coseguro: v }))}
                              onComp={(idx, key, value) =>
                                actualizarPrecioEsp(e, (x) => {
                                  const comps = [...x.componentes];
                                  comps[idx] = { ...comps[idx], [key]: value };
                                  return { ...x, componentes: comps };
                                })
                              }
                            />
                          </div>
                        );
                      })
                    ) : (
                      <>
                    {nnMsg && (
                      <span
                        className={
                          nnMsg.tipo === "error" ? styles.errorMsg : styles.hintText
                        }
                        style={
                          nnMsg.tipo === "ok"
                            ? { color: "#2f855a", fontWeight: 500, display: "block", marginBottom: 8 }
                            : { display: "block", marginBottom: 8 }
                        }
                      >
                        {nnMsg.texto}
                      </span>
                    )}
                    <BloquePrecio
                      precio={precioComun}
                      conTipo={form.origen !== "NN"}
                      galenos={galenos}
                      errors={errors}
                      onModalidad={changeModalidad}
                      onCoseguro={(v) => setForm((p) => ({ ...p, coseguro: v }))}
                      onComp={updateComp}
                    />
                      </>
                    )}
                  </>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Observación</label>
                  <input
                    className={styles.formInput}
                    value={form.observacion}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, observacion: e.target.value }))
                    }
                    placeholder="Opcional"
                  />
                </div>

                {replicaTerminada ? (
                  <>
                    {replicaResultado && (
                      <ResultadoReplica resultados={replicaResultado} />
                    )}
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
                  <button
                    className={styles.btnPrimary}
                    onClick={() => setModalKind(null)}
                  >
                    Cerrar
                  </button>
                ) : (
                  <>
                    <button
                      className={styles.btnGhost}
                      onClick={() => setModalKind(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      className={styles.btnPrimary}
                      onClick={handleSave}
                      disabled={saving || parCargando || bloqueadoPorAlta}
                    >
                      {saving ? (
                        <>
                          <span className={styles.spinner} /> Guardando…
                        </>
                      ) : (
                        <>
                          <Save size={15} />{" "}
                          {replicaActiva ? "Guardar y replicar" : "Guardar"}
                        </>
                      )}
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
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`${styles.modal} ${editMode === "nucleo" ? styles.modalXl : styles.modalLg}`}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>
                    Editar —{" "}
                    <span className={styles.codeCell}>{editTarget.codigo}</span>
                    {editMode === "nucleo" ? " (código)" : ""}
                  </h2>
                  <p className={styles.modalSubtitle}>
                    {origenBadgeLabel(editTarget.origen)}
                    {editTarget.especialidad_id_colegio
                      ? ` · ${espMap[editTarget.especialidad_id_colegio] ?? `Esp. ${editTarget.especialidad_id_colegio}`}`
                      : ""}
                    {editTarget.nivel != null
                      ? ` · Niv. ${editTarget.nivel}`
                      : ""}
                  </p>
                </div>
                <button
                  className={styles.modalClose}
                  onClick={() => setModalKind(null)}
                >
                  <XIcon size={18} />
                </button>
              </div>

              <div className={styles.modalBody}>
                {leyendaEdicion() && (
                  <div
                    role="note"
                    style={{
                      background: "#ebf4ff",
                      border: "1px solid #bee3f8",
                      color: "#2c5282",
                      borderRadius: 6,
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {leyendaEdicion()}
                  </div>
                )}

                {/* Metadatos: núcleo (todas las especialidades) o fila NN. La variante suelta
                    NO los tiene: solo valores, vigencia y coseguro. */}
                {editMode === "nucleo" && (
                  <div className={styles.editSection}>
                    <div className={styles.editSectionTitle}>
                      Datos del código
                    </div>
                    <div className={styles.formRow2}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Descripción</label>
                        <input
                          className={styles.formInput}
                          value={editMeta.descripcion}
                          onChange={(e) =>
                            setEditMeta((p) => ({
                              ...p,
                              descripcion: e.target.value,
                            }))
                          }
                          placeholder="Cómo nombra esta obra social al código"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Nivel</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className={styles.formInput}
                          value={nivelNucleo ? String(nivelNucleo.nivel) : editMeta.nivel}
                          disabled={!!nivelNucleo}
                          onChange={(e) =>
                            setEditMeta((p) => ({
                              ...p,
                              nivel: e.target.value,
                            }))
                          }
                          placeholder="Opcional"
                        />
                        {nivelNucleo && (
                          <span className={styles.hintText}>
                            Lo define el galeno {nivelNucleo.nombre}: cambia si cambiás el galeno.
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.formRow2}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Complejidad</label>
                        <select
                          className={styles.formSelect}
                          value={editMeta.complejidad}
                          onChange={(e) =>
                            setEditMeta((p) => ({
                              ...p,
                              complejidad: e.target.value,
                            }))
                          }
                        >
                          <option value="">— Hereda del nomenclador —</option>
                          <option value="baja">Baja</option>
                          <option value="media">Media</option>
                          <option value="alta">Alta</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Observación</label>
                        <input
                          className={styles.formInput}
                          value={editMeta.observacion}
                          onChange={(e) =>
                            setEditMeta((p) => ({
                              ...p,
                              observacion: e.target.value,
                            }))
                          }
                          placeholder="Opcional"
                        />
                      </div>
                    </div>
                    <div className={styles.formRow2}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                          Cantidad de ayudantes
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className={styles.formInput}
                          value={editMeta.cantidad_ayudantes}
                          onChange={(e) =>
                            setEditMeta((p) => ({
                              ...p,
                              cantidad_ayudantes: e.target.value,
                            }))
                          }
                          placeholder="0"
                          style={{ maxWidth: 200 }}
                        />
                        <span className={styles.hintText}>
                          Vacío = no lleva ayudantes en Carga de Facturación.
                        </span>
                      </div>
                    </div>

                    <p className={styles.hintText}>
                      Quién lo factura se edita en{" "}
                      <Link to={`/panel/nomenclador/codigos-por-os?os=${selectedNroOS}&codigo=${editTarget.codigo}`}>
                        Códigos por obra social
                      </Link>
                      . Para darle precio a otra especialidad, usá «Cargar precio».
                    </p>
                  </div>
                )}

                {/* Valores, vigencia y coseguro. En el núcleo es opcional (abre una vigencia
                    nueva en TODAS las variantes); en una variante suelta es lo único editable. */}
                {editMode === "nucleo" && (
                  <div className={styles.editSection}>
                    <div className={styles.editSectionTitle}>Precios</div>
                    <p className={styles.hintText}>
                      Vienen con el precio vigente. Los que cambies cierran su vigencia y
                      abren una nueva desde la fecha de abajo; los que no toques quedan igual.
                    </p>
                    <div className={styles.formGroup} style={{ maxWidth: 320 }}>
                      <label className={styles.formLabel}>
                        Nueva vigencia desde <span className={styles.req}>*</span>
                      </label>
                      <input
                        type="date"
                        className={`${styles.formInput} ${editErrors.vigencia_desde ? styles.inputError : ""}`}
                        value={editEcu.vigencia_desde}
                        onChange={(e) => {
                          setEditEcu((p) => ({ ...p, vigencia_desde: e.target.value }));
                          setEditErrors((p) => ({ ...p, vigencia_desde: "" }));
                        }}
                      />
                      {editErrors.vigencia_desde && (
                        <span className={styles.errorMsg}>{editErrors.vigencia_desde}</span>
                      )}
                    </div>
                    {nucleoVariantes.length > 1 && (
                      <label className={styles.toggleRow}>
                        <input
                          type="checkbox"
                          className={styles.toggleInput}
                          checked={nucleoMismo}
                          onChange={(e) => cambiarNucleoMismo(e.target.checked)}
                        />
                        <span className={styles.toggleLabel}>
                          Mismo precio para todas las especialidades
                        </span>
                      </label>
                    )}
                    {nucleoUnico ? (
                      <BloquePrecio
                        precio={nucleoComun}
                        conTipo={nucleoOrigen !== "NN"}
                        soloCoseguro={editTarget.por_presupuesto}
                        galenos={galenos}
                        errors={erroresDe(editErrors, "comun_")}
                        onModalidad={(m) => cambiarModalidadNucleo("comun", m)}
                        onCoseguro={(v) => actualizarNucleoPrecio("comun", (x) => ({ ...x, coseguro: v }))}
                        onComp={(idx, key, value) => cambiarCompNucleo("comun", idx, key, value)}
                      />
                    ) : (
                      nucleoVariantes.map((v) => (
                        <div key={v.id} className={styles.precioEsp}>
                          <div className={styles.precioEspTitulo}>
                            {v.especialidad_id_colegio != null
                              ? (espMap[v.especialidad_id_colegio] ?? `Esp. ${v.especialidad_id_colegio}`)
                              : "Sin especialidad"}
                            <span className={styles.precioEspVigencia}>vigente desde {v.vigencia_desde}</span>
                          </div>
                          <BloquePrecio
                            precio={nucleoPrecios[v.id]}
                            conTipo
                            soloCoseguro={v.por_presupuesto}
                            galenos={galenos}
                            errors={erroresDe(editErrors, `fila_${v.id}_`)}
                            onModalidad={(m) => cambiarModalidadNucleo(v.id, m)}
                            onCoseguro={(c) => actualizarNucleoPrecio(v.id, (x) => ({ ...x, coseguro: c }))}
                            onComp={(idx, key, value) => cambiarCompNucleo(v.id, idx, key, value)}
                          />
                        </div>
                      ))
                    )}
                  </div>
                )}

                {editMode === "variante" && (
                <div className={styles.editSection}>
                  <div className={styles.editSectionTitle}>
                    Actualizar ecuación de precio
                  </div>
                  {(
                    <>
                      <p className={styles.hintText}>
                        {editTarget.por_presupuesto
                          ? "Este código es por presupuesto (sin fórmula fija). Cambiar el coseguro cierra la vigencia actual y abre una nueva."
                          : "Cierra la vigencia actual y crea una nueva con la ecuación que ingreses."}
                      </p>
                      <div className={styles.formRow2}>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>
                            Nueva vigencia desde{" "}
                            <span className={styles.req}>*</span>
                          </label>
                          <input
                            type="date"
                            className={`${styles.formInput} ${editErrors.vigencia_desde ? styles.inputError : ""}`}
                            value={editEcu.vigencia_desde}
                            onChange={(e) => {
                              setEditEcu((p) => ({
                                ...p,
                                vigencia_desde: e.target.value,
                              }));
                              setEditErrors((p) => ({
                                ...p,
                                vigencia_desde: "",
                              }));
                            }}
                          />
                          {editErrors.vigencia_desde && (
                            <span className={styles.errorMsg}>
                              {editErrors.vigencia_desde}
                            </span>
                          )}
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>
                            Coseguro ($)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className={`${styles.formInput} ${editErrors.coseguro ? styles.inputError : ""}`}
                            value={editEcu.coseguro}
                            onChange={(e) =>
                              setEditEcu((p) => ({
                                ...p,
                                coseguro: e.target.value,
                              }))
                            }
                            placeholder="0.00"
                          />
                          {editErrors.coseguro && (
                            <span className={styles.errorMsg}>{editErrors.coseguro}</span>
                          )}
                        </div>
                      </div>
                      {!editTarget.por_presupuesto && (
                        <>
                          <div className={styles.formRow2}>
                            <div className={styles.formGroup}>
                              <label className={styles.formLabel}>
                                Tipo de valor
                              </label>
                              <select
                                className={styles.formSelect}
                                value={editEcu.modalidad}
                                onChange={(e) =>
                                  changeEditModalidad(
                                    e.target.value as ModalidadValor,
                                  )
                                }
                              >
                                <option value="calculable">
                                  Calculable (galeno × cantidad)
                                </option>
                                <option value="fijo">Fijo ($)</option>
                              </select>
                            </div>
                          </div>
                          <ComponentEditor
                            modalidad={editEcu.modalidad}
                            componentes={editEcu.componentes}
                            galenos={galenos}
                            errors={editErrors}
                            onChange={updateEditComp}
                          />
                        </>
                      )}
                      {(
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            marginTop: 8,
                          }}
                        >
                          <button
                            className={styles.btnWarning}
                            onClick={handleActualizar}
                            disabled={savingEcu}
                          >
                            {savingEcu ? (
                              <>
                                <span className={styles.spinner} />{" "}
                                Actualizando…
                              </>
                            ) : replicaActiva ? (
                              "Actualizar y replicar"
                            ) : (
                              "Actualizar"
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                )}

                {replicaTerminada ? (
                  <>
                    {replicaResultado && (
                      <ResultadoReplica resultados={replicaResultado} />
                    )}
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
                  <button
                    className={styles.btnPrimary}
                    onClick={() => setModalKind(null)}
                  >
                    Cerrar
                  </button>
                ) : (
                  <>
                    <button
                      className={styles.btnGhost}
                      onClick={() => setModalKind(null)}
                    >
                      {editMode === "nucleo" ? "Cancelar" : "Cerrar"}
                    </button>
                    {editMode === "nucleo" && (
                      <button
                        className={styles.btnPrimary}
                        onClick={handleSaveNucleo}
                        disabled={savingMeta}
                      >
                        {savingMeta ? (
                          <>
                            <span className={styles.spinner} /> Guardando…
                          </>
                        ) : (
                          <>
                            <Save size={15} />{" "}
                            {replicaActiva ? "Guardar y replicar" : "Guardar"}
                          </>
                        )}
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={15} />
            ) : (
              <AlertCircle size={15} />
            )}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={revalorizar !== null}
        onClose={() => setRevalorizar(null)}
        title="Revalorizar prestaciones cargadas en $0"
        size="large"
      >
        {revalorizar && (
          <div className={styles.revalorizar}>
            <p>
              Hay <strong>{revalorizar.total} prestación{revalorizar.total === 1 ? "" : "es"} abierta{revalorizar.total === 1 ? "" : "s"}</strong>{" "}
              del código {revalorizar.codigo} cargada{revalorizar.total === 1 ? "" : "s"} sin precio. Con el precio nuevo quedarían así
              (las de períodos cerrados no se tocan):
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Período</th><th>Médico</th><th>Fecha</th><th className={styles.num}>Antes</th><th className={styles.num}>Después</th><th /></tr>
                </thead>
                <tbody>
                  {revalorizar.items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.periodo}</td>
                      <td>Socio {it.cod_med}</td>
                      <td>{it.fecha_practica ?? "—"}</td>
                      <td className={styles.num}>{fmt.format(parseMonto(it.importe_antes))}</td>
                      <td className={styles.num}>{it.estado === "revalorizada" ? fmt.format(parseMonto(it.importe_despues)) : "—"}</td>
                      <td>{it.estado !== "revalorizada" && <span className={styles.hintText}>{it.motivo}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.revalorizarAcciones}>
              <button type="button" className={styles.btnGhost} onClick={() => setRevalorizar(null)}>Ahora no</button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={confirmarRevalorizar}
                disabled={revalorizando || revalorizar.items.every((i) => i.estado !== "revalorizada")}
              >
                {revalorizando ? "Revalorizando…" : `Revalorizar ${revalorizar.items.filter((i) => i.estado === "revalorizada").length}`}
              </button>
            </div>
          </div>
        )}
      </Modal>

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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type CodigoObraSocialOut, type ComponentePayload, type ComponentesNNSugeridos, type GalenoOut, type NomencladorOut, type Origen, type ReplicaResultadoItem, type ReplicarValoresFamiliaPayload, type RevalorizarResult, type TipoCodigo, type ValorOut } from "../nomenclador.types";
import { type ComoFactura, type ComponenteForm, type EditEcuForm, type EditMetaForm, type EditMode, type ModalKind, type ModalidadValor, type PrecioForm, type PreciosExistentes, type ValorForm } from "./porOS.types";
import { FIXED_CONCEPTOS, PAGE_SIZE, clonarPrecio, comoFacturaDe, componentesPayload, compsFromOut, errorCoseguro, erroresPrecio, firmaPrecio, formVacio, galenoNivelado, initComps, nomencladorPayload, precioDeValor } from "./porOS.helpers";
import { parseMonto, today } from "../nomenclador.helpers";
import { REPLICA_INICIAL, destinosReplica, type ReplicaState } from "@/app/components/molecules/ReplicarFamilia/replicaState";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import { useQuery } from "@tanstack/react-query";
import { getEspecialidades } from "../../Especialidades/especialidades.api";
import { actualizarValor, createValor, createValorMulti, deleteValor, getCodigoOS, getComponentesNN, getComponentesNomenclador, getFamiliaObraSocial, getNomencladoresDeCodigo, listCodigosPorOS, listGalenos, listNivelados, listNomenclador, listValores, replicarValoresEnFamilia, revalorizarPrestaciones, updateNucleoPar } from "../nomenclador.api";
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "../../Reportes/useDebounce";

/** La lógica de NomencladorPorOS: estado, consultas y acciones. El texto es el del componente original. */
export function useNomencladorPorOS() {
  const [selectedNroOS, setSelectedNroOS] = useState<number | null>(null);
  const [osSearch, setOsSearch] = useState("");
  const [galenos, setGalenos] = useState<GalenoOut[]>([]);
  const [valores, setValores] = useState<ValorOut[]>([]);
  const [loadingValores, setLoadingValores] = useState(false);
  const [codeSearch, setCodeSearch] = useState("");
  const [soloPresupuesto, setSoloPresupuesto] = useState(false);
  const [tipoFilter, setTipoFilter] = useState<TipoCodigo | "todos">("todos");
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
  const [parAlta, setParAlta] = useState<CodigoObraSocialOut | null>(null);
  const [parCargando, setParCargando] = useState(false);
  // Alta del código en la O.S. que se está editando con el lápiz del núcleo (para avisar
  // quién lo factura y llevar a editarla).
  const [altaEdicion, setAltaEdicion] = useState<CodigoObraSocialOut | null>(null);
  const [existentes, setExistentes] = useState<PreciosExistentes | null>(null);
  // Prestaciones cargadas en $0 para revalorizar después de guardar el precio.
  const [revalorizar, setRevalorizar] = useState<RevalorizarResult | null>(null);
  const [revalorizando, setRevalorizando] = useState(false)
  /** Valor "por nomenclador": componentes calculados por el servidor (sólo lectura). */
  const [nomCalc, setNomCalc] = useState<ComponentesNNSugeridos | null>(null);
  const [nomCalcCargando, setNomCalcCargando] = useState(false);
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
  // "nucleo" = el código PARA TODAS sus especialidades; "variante" = una sola fila (solo valores, vigencia y coseguro).
  const [editMode, setEditMode] = useState<EditMode>("variante");
  const [nucleoOrigen, setNucleoOrigen] = useState<"NE" | "NN">("NE");
  // Lápiz del código = rotar precios.
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

  // Hay algún filtro activo (búsqueda, tipo, especialidad o «Por presupuesto»). Sin filtros la
  // tabla no trae nada. Los filtros los aplica el servidor: sólo baja lo que coincide.
  const busqueda = useDebounce(codeSearch.trim(), 350);
  const hayFiltros =
    busqueda !== "" ||
    tipoFilter !== "todos" ||
    especialidadFilter !== "todos" ||
    soloPresupuesto;
  const filtrosServidor = {
    q: busqueda || undefined,
    tipo: tipoFilter === "todos" ? undefined : tipoFilter,
    especialidad_habilitada: especialidadFilter === "todos" ? undefined : especialidadFilter,
    por_presupuesto: soloPresupuesto ? true : undefined,
  };
  // Los filtros vigentes, para que cualquier recarga (tras guardar o rotar un precio) los respete.
  const filtrosRef = useRef({ hayFiltros, filtrosServidor });
  filtrosRef.current = { hayFiltros, filtrosServidor };
  // Descarta la respuesta de una consulta vieja si ya se pidió otra.
  const cargaVigente = useRef(0);

  useEffect(() => {
    if (!selectedNroOS) {
      setGalenos([]);
      return;
    }
    listGalenos({ obra_social_nro: selectedNroOS })
      .then(setGalenos)
      .catch(() => {});
  }, [selectedNroOS]);

  useEffect(() => {
    if (selectedNroOS && hayFiltros) {
      void loadValores(selectedNroOS);
    } else {
      cargaVigente.current += 1;
      setValores([]);
      setLoadingValores(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNroOS, hayFiltros, busqueda, tipoFilter, especialidadFilter, soloPresupuesto]);

  const loadValores = useCallback(
    async (osNro: number) => {
      const { hayFiltros: conFiltros, filtrosServidor: filtros } = filtrosRef.current;
      if (!conFiltros) return;
      const id = ++cargaVigente.current;
      setLoadingValores(true);
      try {
        // Sólo los precios en vigor (`estado: "activo"`): lo que se cerró al rotar un precio es historial y no se lista acá.
        const all: ValorOut[] = [];
        for (let p = 1; p <= 100; p++) {
          const batch = await listValores({
            obra_social_nro: osNro,
            estado: "activo",
            ...filtros,
            page: p,
            size: 200,
          });
          if (id !== cargaVigente.current) return;
          all.push(...batch);
          if (batch.length < 200) break;
        }
        setValores(all);
      } catch {
        if (id === cargaVigente.current) showToast("error", "Error al cargar los valores.");
      } finally {
        if (id === cargaVigente.current) setLoadingValores(false);
      }
    },
    [],
  );

  // Ya no hay fallback al catálogo del Colegio: descripcion es obligatoria en el alta nueva, así que solo queda vacía en filas viejas.
  const resolvedDesc = useCallback((v: ValorOut) => v.descripcion ?? "", []);

  // Lo que llega del servidor ya viene filtrado; sin filtros no se muestra nada.
  const filteredValores = useMemo(() => (hayFiltros ? valores : []), [hayFiltros, valores]);
  const showLoading = loadingValores;

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
    soloPresupuesto,
    tipoFilter,
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

  /** Trae el alta del código en la O.S. y precarga lo que viene de ahí: descripción, quién factura, complejidad y ayudantes. */
  async function cargarAlta(nomencladorId: number) {
    if (!selectedNroOS) return;
    setParCargando(true);
    setParAlta(null);
    setExistentes(null);
    try {
      const p = await getCodigoOS(selectedNroOS, nomencladorId);
      // Precios activos del código en la O.S.: las especialidades que ya tienen no se vuelven a cargar acá (se rotan con el lápiz).
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

  const nomencladorEnEdicion = modalKind === "edit" && editMode === "nucleo" ? editTarget?.nomenclador_id : undefined;
  useEffect(() => {
    setAltaEdicion(null);
    if (!selectedNroOS || nomencladorEnEdicion == null) return;
    let vigente = true;
    getCodigoOS(selectedNroOS, nomencladorEnEdicion)
      .then((p) => { if (vigente) setAltaEdicion(p); })
      .catch(() => { /* sin alta legible: no se muestra el aviso */ });
    return () => { vigente = false; };
  }, [selectedNroOS, nomencladorEnEdicion]);

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

  // Alta NN: con el código elegido, precarga Honorarios/Gastos/Ayudante con el galeno que corresponde al rango del código y las unidades del Nomenclador Nacional .
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

  // Alta NE "por nomenclador": con qué nomencladores se puede facturar el código elegido.
  const nomencladoresQuery = useQuery({
    queryKey: ["nomencladores-de-codigo", nnCreateNomId],
    queryFn: () => getNomencladoresDeCodigo(nnCreateNomId as number),
    enabled: nnCreateNomId != null && nnCreateOrigen === "NE",
    staleTime: 5 * 60 * 1000,
  });
  const nomencladoresDelCodigo = useMemo(
    () => (nomencladoresQuery.data ?? []).filter((n) => n.tipo === "nivelado"),
    [nomencladoresQuery.data],
  );
  // El Nacional tiene su propia regla (rango del código): el NN lo usa solo; acá se ofrece sólo
  // para valores NE calculados como el nacional.
  const nomencladoresOpciones = nomencladoresQuery.data ?? [];

  // Al elegir un código con nomenclador, "Por nomenclador" queda preseleccionado.
  useEffect(() => {
    if (nnCreateOrigen !== "NE" || nomencladoresDelCodigo.length === 0) return;
    setForm((prev) =>
      prev.comoFactura === "manual" && !prev.nomencladorSlug && !prev.porPresupuesto
        ? { ...prev, comoFactura: "nomenclador", nomencladorSlug: nomencladoresDelCodigo[0].slug }
        : prev,
    );
  }, [nnCreateOrigen, nomencladoresDelCodigo]);

  // Componentes del valor "por nomenclador" (nivel del código + escala + galeno de la OS).
  const comoFacturaCreate = modalKind === "create" ? form.comoFactura : null;
  const nomSlugCreate = modalKind === "create" ? form.nomencladorSlug : "";
  useEffect(() => {
    if (comoFacturaCreate !== "nomenclador" || !nnCreateNomId || !selectedNroOS || !nomSlugCreate) {
      setNomCalc(null);
      return;
    }
    let vigente = true;
    setNomCalcCargando(true);
    getComponentesNomenclador(selectedNroOS, nnCreateNomId, nomSlugCreate)
      .then((r) => {
        if (!vigente) return;
        setNomCalc(r);
        if (!r.disponible) return;
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
      })
      .catch(() => {
        if (vigente) setNomCalc({ disponible: false, motivo: "No se pudieron calcular los componentes.", componentes: [] });
      })
      .finally(() => {
        if (vigente) setNomCalcCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [comoFacturaCreate, nomSlugCreate, nnCreateNomId, selectedNroOS]);

  /** Elige cómo se factura. "Fijo" y "Manual" usan el editor de siempre; "Por nomenclador" arma
   * los componentes con el servidor. */
  function changeComoFactura(c: ComoFactura) {
    setForm((prev) => ({
      ...prev,
      comoFactura: c,
      nomencladorSlug: c === "nomenclador" ? (prev.nomencladorSlug || nomencladoresDelCodigo[0]?.slug || "") : prev.nomencladorSlug,
      modalidad: c === "fijo" ? "fijo" : "calculable",
      componentes: prev.componentes.map((x) => ({
        ...x,
        galeno_id: c === "fijo" ? null : x.galeno_id,
        cantidad: c === "fijo" ? "" : x.cantidad,
        valor_unitario: c === "fijo" ? x.valor_unitario : "",
      })),
    }));
  }

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

  /** Tilda/destilda "Mismos precios". Al separar, cada especialidad arranca con una copia de lo que ya estaba cargado en el precio común. */
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
        if (form.origen === "NE" && form.comoFactura === "nomenclador") {
          // El editor de componentes está oculto: el error es el del cálculo por nomenclador.
          for (const k of Object.keys(errs)) if (k.startsWith("comp_")) delete errs[k];
          if (!nomCalc?.disponible) {
            errs.calculo = nomCalc?.motivo ?? "Elegí un nomenclador con el que se pueda calcular el valor.";
          }
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateEcuacion(): boolean {
    const errs: Record<string, string> = {};
    if (!editEcu.vigencia_desde) errs.vigencia_desde = "Requerido";
    const cos = errorCoseguro(editEcu.coseguro);
    if (cos) errs.coseguro = cos;
    // Por presupuesto no tiene ecuación propia (H/G/A van en 0, ver `_crear_valor_con_ componentes` en el back) — solo importan vigencia_desde y coseguro, ya chequeados.
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
      ...comoFacturaDe(v),
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
    // NE: las variantes por especialidad.
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
    // "Mismo precio" arranca tildado si hoy todas valen lo mismo; si no, cada especialidad muestra el suyo.
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
  /** Se eligió una fecha distinta de la de por defecto (hoy): aunque no se toque ningún
   * precio, es una vigencia nueva y la toman TODAS las especialidades del código. */
  const nucleoVigenciaCambio = !!editEcu.vigencia_desde && editEcu.vigencia_desde !== today();
  const nucleoFilasCambiadas = nucleoUnico
    ? []
    : nucleoVariantes.filter(
        (v) =>
          nucleoVigenciaCambio ||
          firmaPrecio(nucleoPrecios[v.id]) !== nucleoInicial.current.porFila[v.id],
      );
  const nucleoComunCambio =
    nucleoUnico &&
    (nucleoVigenciaCambio || firmaPrecio(nucleoComun) !== nucleoInicial.current.comun);
  /** La vigencia más nueva de los precios que se rotan (para el aviso de la fecha). */
  const ultimaNucleo = (nucleoComunCambio ? nucleoVariantes : nucleoFilasCambiadas)
    .map((v) => v.vigencia_desde).sort().pop();
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

  /** Replica en la familia lo recién guardado. true = hubo replicación (el modal queda abierto mostrando el resultado); false = no había nada que replicar. */
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

  // ─── Prestaciones abiertas del código que cambian con el precio nuevo ───────

  async function ofrecerRevalorizar(codigo: string) {
    if (!selectedNroOS) return;
    try {
      const r = await revalorizarPrestaciones({
        cod_obra: String(selectedNroOS), codigo, dry_run: true,
      });
      if (r.revalorizadas > 0) setRevalorizar(r);
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
      // NN: siempre por el Nacional. NE: el nomenclador elegido (sin él: valor fijo o manual).
      let nomencladorNiveladoId: number | null = null;
      if (!form.porPresupuesto && form.origen === "NN") {
        nomencladorNiveladoId = (await listNivelados()).find((n) => n.tipo === "nacional")?.id ?? null;
      } else if (!form.porPresupuesto && form.comoFactura === "nomenclador") {
        nomencladorNiveladoId = nomCalc?.nomenclador_nivelado_id ?? null;
      }
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
        nomenclador_nivelado_id: preciosSeparados ? null : nomencladorNiveladoId,
      };
      const especialidadesAlta =
        form.origen === "NE" && !form.sinRestriccion
          ? [...form.especialidadesChecked]
          : [];
      if (preciosSeparados) {
        // Un precio por especialidad: una alta por cada una.
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
          if (creados.length > 0 && selectedNroOS) void loadValores(selectedNroOS);
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
        await createValor({
          ...base,
          obra_social_nro: selectedNroOS,
          nomenclador_id: form.nomencladorId!,
          origen: "NE",
          especialidad_id_colegio: null,
          sin_restriccion_especialidad: true,
        });
        void loadValores(selectedNroOS);
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
        void loadValores(selectedNroOS);
        showToast(
          "success",
          nuevos.length > 1
            ? `Código agregado para ${nuevos.length} especialidades.`
            : "Código agregado a la obra social.",
        );
      } else {
        await createValor({
          ...base,
          obra_social_nro: selectedNroOS,
          nomenclador_id: form.nomencladorId!,
          origen: form.origen,
          especialidad_id_colegio: null,
        });
        void loadValores(selectedNroOS);
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

  /** El motivo que manda el servidor, sólo si es texto. */
  function errMsg(e: unknown, fallback: string): string {
    const d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    if (typeof d === "string") return d;
    if (d && typeof d === "object" && typeof (d as { mensaje?: unknown }).mensaje === "string") {
      return (d as { mensaje: string }).mensaje;
    }
    return fallback;
  }

  // Lápiz del código: datos del código + rotar precios (de todas juntas o de cada especialidad).
  async function handleSaveNucleo() {
    if (!editTarget || !selectedNroOS) return;
    const errs: Record<string, string> = {};
    const rota = nucleoComunCambio || nucleoFilasCambiadas.length > 0;
    if (rota && !editEcu.vigencia_desde) errs.vigencia_desde = "Requerido";
    // Cualquier fecha vale: igual o anterior a la vigente sólo avisa (`avisoVigencia`).
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
      ...(porPresupuesto ? {} : nomencladorPayload(p)),
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
        // Explícito: el back NO lo hereda del valor que cierra, así que si no se manda un código por_presupuesto pierde esa condición al rotar vigencia.
        por_presupuesto: editTarget.por_presupuesto,
        aplicar_a_variantes: false,
        ...(editTarget.por_presupuesto ? {} : nomencladorPayload(editEcu)),
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

  return {
    selectedNroOS,
    setSelectedNroOS,
    osSearch,
    setOsSearch,
    galenos,
    setGalenos,
    valores,
    setValores,
    loadingValores,
    setLoadingValores,
    codeSearch,
    setCodeSearch,
    soloPresupuesto,
    setSoloPresupuesto,
    tipoFilter,
    setTipoFilter,
    especialidadFilter,
    setEspecialidadFilter,
    page,
    setPage,
    modalKind,
    setModalKind,
    editTarget,
    setEditTarget,
    form,
    setForm,
    errors,
    setErrors,
    saving,
    setSaving,
    parAlta,
    setParAlta,
    parCargando,
    setParCargando,
    altaEdicion,
    setAltaEdicion,
    existentes,
    setExistentes,
    revalorizar,
    setRevalorizar,
    revalorizando,
    setRevalorizando,
    nomCalc,
    setNomCalc,
    nomCalcCargando,
    setNomCalcCargando,
    nnMsg,
    setNnMsg,
    editMeta,
    setEditMeta,
    editEcu,
    setEditEcu,
    editErrors,
    setEditErrors,
    savingMeta,
    setSavingMeta,
    editMode,
    setEditMode,
    nucleoOrigen,
    setNucleoOrigen,
    nucleoVariantes,
    setNucleoVariantes,
    nucleoMismo,
    setNucleoMismo,
    nucleoComun,
    setNucleoComun,
    nucleoPrecios,
    setNucleoPrecios,
    nucleoInicial,
    replica,
    setReplica,
    replicaResultado,
    setReplicaResultado,
    replicaError,
    setReplicaError,
    replicaTerminada,
    savingEcu,
    setSavingEcu,
    nomSearch,
    setNomSearch,
    nomResults,
    setNomResults,
    nomLoading,
    setNomLoading,
    nomDebounce,
    toast,
    setToast,
    deleteTarget,
    setDeleteTarget,
    osList,
    especialidades,
    espMap,
    familia,
    espOptions,
    filteredOS,
    selectedOS,
    bloqueadoPorAlta,
    espOptionsAlta,
    bloqueadasPorPrecio,
    preciosSeparados,
    espSeleccionadas,
    galenoPorId,
    nivelCreate,
    pendientesQuery,
    pendientes,
    params,
    paramsConsumidos,
    busqueda,
    hayFiltros,
    filtrosServidor,
    filtrosRef,
    cargaVigente,
    loadValores,
    resolvedDesc,
    filteredValores,
    showLoading,
    grouped,
    totalPages,
    pageGroups,
    showToast,
    searchNom,
    selectNom,
    cargarAlta,
    nomencladorEnEdicion,
    clearNom,
    changeOrigen,
    nnCreateOrigen,
    nnCreateNomId,
    nomencladoresQuery,
    nomencladoresDelCodigo,
    nomencladoresOpciones,
    comoFacturaCreate,
    nomSlugCreate,
    changeComoFactura,
    changeModalidad,
    changeEditModalidad,
    precioComun,
    cambiarMismoPrecio,
    cambiarEspecialidades,
    actualizarPrecioEsp,
    cambiarModalidadEsp,
    updateComp,
    updateEditComp,
    validateCreate,
    validateEcuacion,
    openCreate,
    cargarFormsDeEdicion,
    openEdit,
    openEditNucleo,
    cambiarNucleoMismo,
    actualizarNucleoPrecio,
    cambiarModalidadNucleo,
    cambiarCompNucleo,
    nucleoUnico,
    nucleoVigenciaCambio,
    nucleoFilasCambiadas,
    nucleoComunCambio,
    ultimaNucleo,
    nivelNucleo,
    leyendaEdicion,
    resetReplica,
    replicarSiCorresponde,
    replicaActiva,
    ofrecerRevalorizar,
    confirmarRevalorizar,
    abrirCargaPrecio,
    handleSave,
    buildEcuComponentes,
    errMsg,
    handleSaveNucleo,
    handleActualizar,
    doDelete,
    handleDelete,
  };
}

export type PorOSCtx = ReturnType<typeof useNomencladorPorOS>;

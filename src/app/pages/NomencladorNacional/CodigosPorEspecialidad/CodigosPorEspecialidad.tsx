import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, AlertCircle, Building2, Stethoscope } from "lucide-react";

import styles from "./codigosPorEspecialidad.module.scss";
import Combobox from "../ConsultaShared/Combobox";
import {
  fetchCatalogoOS,
  fetchCodigosDeEspecialidad,
  fetchTablaValores,
} from "./codigosPorEspecialidad.api";
import { getEspecialidades } from "../../Especialidades/especialidades.api";
import type { Complejidad, ViaPractica } from "../nomenclador.types";
import type { ObraSocialListItem } from "../../ObrasSociales/obrasSociales.types";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import type { Especialidad } from "../../Especialidades/especialidades.types";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Búsqueda sin acentos: "cardiologia" encuentra "Cardiología".
function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Cuántas filas se pintan de una. El resto entra con "Ver más". */
const LOTE = 60;

type Origen = "NE" | "NNE" | "NN";
type FiltroOrigen = "todos" | Origen | "sin_valor";

type Fila = {
  codigo: string;
  descripcion: string;
  complejidad: Complejidad | null;
  /** `sin_restriccion_especialidad`: el código lo puede hacer cualquier especialidad. */
  universal: boolean;
  /** null = el código existe en la OS pero no tiene valor vigente cargado. */
  origen: Origen | null;
  nivel: number | null;
  precioTotal: number | null;
  porPresupuesto: boolean;
};

const ORIGEN_LABEL: Record<Origen, string> = {
  NN: "Nomenclador nacional",
  NNE: "Nacional de la obra social",
  NE: "Variante por especialidad",
};

export default function CodigosPorEspecialidad() {
  const [selectedOS, setSelectedOS] = useState<ObraSocialListItem | null>(null);
  const [osSearch, setOsSearch] = useState("");
  const [selectedEsp, setSelectedEsp] = useState<Especialidad | null>(null);
  const [espSearch, setEspSearch] = useState("");

  const [query, setQuery] = useState("");
  const [via, setVia] = useState<ViaPractica>("T");
  const [origenFiltro, setOrigenFiltro] = useState<FiltroOrigen>("todos");
  const [complejidadFiltro, setComplejidadFiltro] = useState<"todas" | Complejidad>("todas");
  const [nivelFiltro, setNivelFiltro] = useState<string>("todos");
  const [visibles, setVisibles] = useState(LOTE);

  const { data: osList = [] } = useObrasSociales();

  const { data: espList = [] } = useQuery({
    queryKey: ["especialidades"],
    queryFn: getEspecialidades,
    staleTime: 10 * 60 * 1000,
  });

  const osNro = selectedOS?.nro_obra_social ?? null;
  const espId = selectedEsp?.id_colegio_espe ?? null;

  const filteredOS = useMemo(() => {
    if (!osSearch.trim()) return osList.slice(0, 50);
    const q = osSearch.toLowerCase();
    return osList
      .filter(
        (os) =>
          os.nombre.toLowerCase().includes(q) ||
          String(os.nro_obra_social).includes(q),
      )
      .slice(0, 50);
  }, [osList, osSearch]);

  const filteredEsp = useMemo(() => {
    const orden = [...espList].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    if (!espSearch.trim()) return orden.slice(0, 50);
    const q = normalize(espSearch);
    return orden.filter((e) => normalize(e.nombre).includes(q)).slice(0, 50);
  }, [espList, espSearch]);

  // Las tres cargas arrancan en paralelo y cada una tiene su propia caché, con
  // la clave más chica que la identifica: así cambiar de especialidad no vuelve
  // a pedir el catálogo de la OS, ni cambiar de OS el mapeo de la especialidad.
  // `gcTime` largo para que ir y volver del menú no recargue nada.

  // El catálogo de la OS: la fuente que define qué códigos puede ver el usuario.
  const catalogo = useQuery({
    queryKey: ["nomenclador-catalogo-os", osNro],
    enabled: osNro != null,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: () => fetchCatalogoOS(osNro as number),
  });

  // Mapeo código↔especialidad: no depende de la obra social.
  const mapeo = useQuery({
    queryKey: ["nomenclador-codigos-especialidad", espId],
    enabled: espId != null,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: () => fetchCodigosDeEspecialidad(espId as number),
  });

  // Los precios son la carga más pesada y NO bloquean la tabla: la lista de
  // códigos se pinta con las dos fuentes de arriba y estas columnas entran
  // después. `placeholderData` mantiene los precios viejos visibles mientras se
  // recalculan al cambiar de vía, en vez de vaciar la tabla.
  const valores = useQuery({
    queryKey: ["tabla-valores-especialidad", osNro, espId, via],
    enabled: osNro != null && espId != null,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    placeholderData: (previa) => previa,
    queryFn: () =>
      fetchTablaValores({
        obraSocialNro: osNro as number,
        especialidadIdColegio: espId as number,
        via,
      }),
  });

  const listo = osNro != null && espId != null;
  // "Cargando" es solo la lista de códigos: los precios llegan aparte.
  const cargando = listo && (!catalogo.data || !mapeo.data);
  const cargandoPrecios = listo && !valores.data && !valores.isError;
  const conError = catalogo.isError || mapeo.isError;

  // El cruce. `catalogo` es el cerco: con rol médico ya viene recortado por el
  // backend, así que elegir otra especialidad en el combo nunca muestra de más.
  const filas = useMemo<Fila[]>(() => {
    if (!listo || !catalogo.data || !mapeo.data) return [];

    // Todavía puede no haber precios: la fila se arma igual y las columnas de
    // origen/nivel/total quedan pendientes hasta que llegue `valores`.
    const porCodigo = new Map(
      (valores.data ?? []).map((v) => [v.codigo.toUpperCase(), v] as const),
    );

    const out: Fila[] = [];
    for (const n of catalogo.data) {
      const cod = n.codigo.toUpperCase();
      // Entra si está mapeado a la especialidad elegida o si es universal
      // (`sin_restriccion_especialidad`), igual que el gate del backend.
      if (!mapeo.data.has(cod) && !n.sin_restriccion_especialidad) continue;

      const v = porCodigo.get(cod);
      out.push({
        codigo: n.codigo,
        descripcion: n.descripcion,
        complejidad: n.complejidad,
        universal: n.sin_restriccion_especialidad,
        origen: v?.origen ?? null,
        nivel: v?.nivel ?? null,
        precioTotal: v ? parseFloat(v.precio_total) : null,
        porPresupuesto: v?.por_presupuesto ?? false,
      });
    }
    out.sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
    return out;
  }, [listo, catalogo.data, mapeo.data, valores.data]);

  const niveles = useMemo(() => {
    const set = new Set<number>();
    for (const f of filas) if (f.nivel != null) set.add(f.nivel);
    return [...set].sort((a, b) => a - b);
  }, [filas]);

  const conteos = useMemo(() => {
    const c = { NN: 0, NNE: 0, NE: 0, sin_valor: 0 };
    for (const f of filas) {
      if (f.origen) c[f.origen]++;
      else c.sin_valor++;
    }
    return c;
  }, [filas]);

  const encontradas = useMemo(() => {
    const texto = normalize(query.trim());
    return filas.filter((f) => {
      if (origenFiltro !== "todos") {
        const ok =
          origenFiltro === "sin_valor" ? f.origen == null : f.origen === origenFiltro;
        if (!ok) return false;
      }
      if (complejidadFiltro !== "todas" && f.complejidad !== complejidadFiltro) return false;
      if (nivelFiltro !== "todos" && String(f.nivel ?? "") !== nivelFiltro) return false;
      if (!texto) return true;
      return (
        normalize(f.codigo).includes(texto) || normalize(f.descripcion).includes(texto)
      );
    });
  }, [filas, query, origenFiltro, complejidadFiltro, nivelFiltro]);

  const mostradas = encontradas.slice(0, visibles);
  const restantes = encontradas.length - mostradas.length;

  function reset() {
    setQuery("");
    setOrigenFiltro("todos");
    setComplejidadFiltro("todas");
    setNivelFiltro("todos");
    setVisibles(LOTE);
  }

  function elegirOS(os: ObraSocialListItem | null) {
    setSelectedOS(os);
    setOsSearch("");
    reset();
  }

  function elegirEsp(esp: Especialidad | null) {
    setSelectedEsp(esp);
    setEspSearch("");
    reset();
  }

  const hayTabla = listo && !cargando && !conError && filas.length > 0;

  const chipsOrigen: { key: FiltroOrigen; label: string; n: number }[] = [
    { key: "todos", label: "Todos", n: filas.length },
    { key: "NN", label: "NN", n: conteos.NN },
    { key: "NNE", label: "NNE", n: conteos.NNE },
    { key: "NE", label: "NE", n: conteos.NE },
    { key: "sin_valor", label: "Sin valor", n: conteos.sin_valor },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pagehead}>
          <h1 className={styles.pageTitle}>Códigos por especialidad</h1>
          <p className={styles.pageSub}>
            Elegí la obra social y después la especialidad.
          </p>
        </div>

        {/* ── Pasos ── */}
        <div className={styles.steps}>
          <div className={styles.field}>
            <Combobox<ObraSocialListItem>
              idx={1}
              label="Obra social"
              placeholder="Buscar por nombre o número…"
              query={osSearch}
              onQueryChange={setOsSearch}
              items={filteredOS}
              getKey={(os) => os.nro_obra_social}
              getCode={(os) => String(os.nro_obra_social)}
              getText={(os) => os.nombre}
              selected={selectedOS}
              onSelect={elegirOS}
              onClear={() => elegirOS(null)}
            />
          </div>

          <div className={`${styles.field} ${osNro == null ? styles.fieldOff : ""}`}>
            <Combobox<Especialidad>
              idx={2}
              label="Especialidad"
              placeholder={
                osNro == null ? "Elegí antes la obra social" : "Buscar especialidad…"
              }
              query={espSearch}
              onQueryChange={setEspSearch}
              items={osNro == null ? [] : filteredEsp}
              getKey={(e) => e.id_colegio_espe}
              getText={(e) => e.nombre}
              selected={selectedEsp}
              onSelect={elegirEsp}
              onClear={() => elegirEsp(null)}
              menuHint={osNro == null ? "Elegí antes la obra social" : undefined}
            />
          </div>
        </div>

        {/* ── Filtros ── */}
        {hayTabla && (
          <>
            <div className={styles.tools}>
              <div className={styles.searchBox}>
                <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                <label htmlFor="cpe-buscar" className={styles.srOnly}>
                  Buscar práctica
                </label>
                <input
                  id="cpe-buscar"
                  type="search"
                  className={styles.searchInput}
                  placeholder="Código o práctica…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setVisibles(LOTE);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
                {query && (
                  <button
                    type="button"
                    className={styles.searchClear}
                    onClick={() => {
                      setQuery("");
                      setVisibles(LOTE);
                    }}
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <select
                className={styles.select}
                aria-label="Complejidad"
                value={complejidadFiltro}
                onChange={(e) => {
                  setComplejidadFiltro(e.target.value as "todas" | Complejidad);
                  setVisibles(LOTE);
                }}
              >
                <option value="todas">Complejidad</option>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>

              <select
                className={styles.select}
                aria-label="Nivel"
                disabled={cargandoPrecios}
                value={nivelFiltro}
                onChange={(e) => {
                  setNivelFiltro(e.target.value);
                  setVisibles(LOTE);
                }}
              >
                <option value="todos">Nivel</option>
                {niveles.map((n) => (
                  <option key={n} value={String(n)}>
                    Nivel {n}
                  </option>
                ))}
              </select>

              <div className={styles.viaToggle} role="group" aria-label="Vía">
                {(
                  [
                    ["T", "Tradicional"],
                    ["L", "Laparoscópica"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    className={`${styles.viaBtn} ${via === v ? styles.viaBtnOn : ""}`}
                    aria-pressed={via === v}
                    onClick={() => {
                      setVia(v);
                      setVisibles(LOTE);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Los chips son también el resumen (cuántos NN, NNE, NE): sin los
                precios todavía no hay números que mostrar. */}
            <div
              className={`${styles.chips} ${cargandoPrecios ? styles.chipsOff : ""}`}
              role="group"
              aria-label="Origen del valor"
              aria-busy={cargandoPrecios}
            >
              {chipsOrigen.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`${styles.chip} ${origenFiltro === c.key ? styles.chipOn : ""}`}
                  aria-pressed={origenFiltro === c.key}
                  disabled={cargandoPrecios}
                  onClick={() => {
                    setOrigenFiltro(c.key);
                    setVisibles(LOTE);
                  }}
                >
                  {c.label}
                  <span className={styles.chipN}>
                    {cargandoPrecios && c.key !== "todos" ? "·" : c.n}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Contenido ── */}
        {osNro == null ? (
          <div className={styles.empty}>
            <Building2 size={22} aria-hidden="true" />
            Elegí una obra social
          </div>
        ) : espId == null ? (
          <div className={styles.empty}>
            <Stethoscope size={22} aria-hidden="true" />
            Elegí una especialidad
          </div>
        ) : cargando ? (
          <div className={styles.skeletons} aria-busy="true" aria-label="Cargando códigos">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow} aria-hidden="true" />
            ))}
          </div>
        ) : conError ? (
          <div className={styles.errorbox}>
            <AlertCircle size={18} />
            No se pudieron cargar los códigos. Intentá de nuevo.
          </div>
        ) : encontradas.length === 0 ? (
          <div className={styles.empty}>
            {filas.length === 0
              ? "Esta especialidad no tiene códigos en esta obra social."
              : "Sin resultados con estos filtros"}
          </div>
        ) : (
          <>
            {valores.isError && (
              <div className={styles.avisoPrecios}>
                <AlertCircle size={16} />
                No se pudieron cargar los precios. La lista de códigos es correcta.
              </div>
            )}

            <div className={styles.tableWrap}>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Código</th>
                      <th scope="col">Práctica</th>
                      <th scope="col">Origen</th>
                      <th scope="col">Complejidad</th>
                      <th scope="col" className={styles.cNum}>Nivel</th>
                      <th scope="col" className={styles.cNum}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostradas.map((f) => (
                      <tr key={f.codigo} className={styles.row}>
                        <td data-label="Código" className={styles.cCodigo}>
                          {f.codigo}
                          {f.universal && (
                            <span
                              className={styles.univ}
                              title="Sin restricción de especialidad"
                            >
                              univ.
                            </span>
                          )}
                        </td>
                        <td data-label="Práctica" className={styles.cDesc}>
                          {f.descripcion}
                        </td>
                        <td data-label="Origen">
                          {cargandoPrecios ? (
                            <span className={styles.pend} aria-label="Cargando" />
                          ) : f.origen ? (
                            <span
                              className={`${styles.origen} ${styles[`o${f.origen}`]}`}
                              title={ORIGEN_LABEL[f.origen]}
                            >
                              {f.origen}
                            </span>
                          ) : (
                            <span className={styles.sinValor}>sin valor</span>
                          )}
                        </td>
                        <td data-label="Complejidad">
                          {f.complejidad ? (
                            <span
                              className={`${styles.compl} ${styles[`c_${f.complejidad}`]}`}
                            >
                              {f.complejidad}
                            </span>
                          ) : (
                            <span className={styles.dash}>—</span>
                          )}
                        </td>
                        <td data-label="Nivel" className={styles.cNum}>
                          {cargandoPrecios ? (
                            <span className={styles.pend} aria-label="Cargando" />
                          ) : f.nivel != null ? (
                            <span className={styles.nivelChip}>{f.nivel}</span>
                          ) : (
                            <span className={styles.dash}>—</span>
                          )}
                        </td>
                        <td data-label="Total" className={`${styles.cNum} ${styles.cTotal}`}>
                          {cargandoPrecios ? (
                            <span className={`${styles.pend} ${styles.pendAncho}`} aria-label="Cargando" />
                          ) : f.porPresupuesto ? (
                            <span className={styles.presupuesto}>A presupuesto</span>
                          ) : f.precioTotal != null && f.precioTotal > 0 ? (
                            money.format(f.precioTotal)
                          ) : (
                            <span className={styles.dash}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {restantes > 0 && (
              <button
                type="button"
                className={styles.masBtn}
                onClick={() => setVisibles((v) => v + LOTE)}
              >
                Ver más ({restantes})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

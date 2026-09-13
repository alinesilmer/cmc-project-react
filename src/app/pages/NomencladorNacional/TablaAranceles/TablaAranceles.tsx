import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  X,
  AlertTriangle,
  AlertCircle,
  Building2,
} from "lucide-react";

import styles from "./tablaAranceles.module.scss";
import Combobox from "../ConsultaShared/Combobox";
import { fetchCodigosVisibles, fetchTablaValores } from "./tablaAranceles.api";
import type { TablaValorItem, ViaPractica } from "../nomenclador.types";
import type { ObraSocialListItem } from "../../ObrasSociales/obrasSociales.types";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import { useAuth } from "../../../auth/AuthProvider";

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

type Componente = TablaValorItem["componentes"][number];

function conceptoDe(item: TablaValorItem, concepto: string): Componente | undefined {
  return item.componentes.find(
    (c) => c.concepto.toLowerCase() === concepto.toLowerCase(),
  );
}

/**
 * Un importe de la fila. Todo valor trae los tres conceptos, pero Gastos y
 * Ayudante suelen venir en cero: mostrar "$ 0,00" en media tabla es ruido, así
 * que solo se pinta el que tiene monto.
 */
function Importe({ comp }: { comp: Componente | undefined }) {
  const monto = comp ? parseFloat(comp.subtotal) : 0;
  if (!comp || !(monto > 0)) return <span className={styles.dash}>—</span>;
  return <>{money.format(monto)}</>;
}

export default function TablaAranceles() {
  const { user } = useAuth();
  // La especialidad no se elige: sale del médico logueado. Define qué variante
  // de precio (NE) le corresponde a cada código.
  const especialidades: number[] = user?.especialidades ?? [];

  const [selectedOS, setSelectedOS] = useState<ObraSocialListItem | null>(null);
  const [osSearch, setOsSearch] = useState("");
  const [query, setQuery] = useState("");
  const [via, setVia] = useState<ViaPractica>("T");
  const [visibles, setVisibles] = useState(LOTE);

  const { data: osList = [] } = useObrasSociales();

  const osNro = selectedOS?.nro_obra_social ?? null;

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

  // Una sola carga por (OS, vía): la búsqueda y el paginado son en memoria.
  const { data, isFetching, isError } = useQuery({
    queryKey: ["tabla-aranceles", osNro, via, especialidades.join(",")],
    enabled: osNro != null,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [permitidos, filas] = await Promise.all([
        fetchCodigosVisibles(osNro as number),
        fetchTablaValores({
          obraSocialNro: osNro as number,
          especialidades,
          via,
        }),
      ]);
      // El cruce es el cerco de especialidad: `permitidos` ya viene recortado
      // por el backend según el rol y las especialidades del usuario.
      return filas.filter((f) => permitidos.has(f.codigo.toUpperCase()));
    },
  });

  const filas = useMemo(() => data ?? [], [data]);

  const encontradas = useMemo(() => {
    const texto = normalize(query.trim());
    if (!texto) return filas;
    return filas.filter(
      (f) =>
        normalize(f.codigo).includes(texto) ||
        normalize(f.descripcion ?? "").includes(texto),
    );
  }, [filas, query]);

  const mostradas = encontradas.slice(0, visibles);
  const restantes = encontradas.length - mostradas.length;

  function elegirOS(os: ObraSocialListItem | null) {
    setSelectedOS(os);
    setOsSearch("");
    setQuery("");
    setVisibles(LOTE);
  }

  function buscar(q: string) {
    setQuery(q);
    setVisibles(LOTE);
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pagehead}>
          <h1 className={styles.pageTitle}>Aranceles</h1>
          <p className={styles.pageSub}>
            Tus prácticas con el valor vigente de una obra social.
          </p>
        </div>

        {/* ── Controles ── */}
        <div className={styles.controls}>
          <div className={styles.osField}>
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

          {osNro != null && (
            <div className={styles.tools}>
              <div className={styles.searchBox}>
                <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                <label htmlFor="aranceles-buscar" className={styles.srOnly}>
                  Buscar práctica
                </label>
                <input
                  id="aranceles-buscar"
                  type="search"
                  className={styles.searchInput}
                  placeholder="Código o práctica…"
                  value={query}
                  onChange={(e) => buscar(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                {query && (
                  <button
                    type="button"
                    className={styles.searchClear}
                    onClick={() => buscar("")}
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

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
          )}
        </div>

        {/* ── Contenido ── */}
        {osNro == null ? (
          <div className={styles.empty}>
            <Building2 size={22} aria-hidden="true" />
            Elegí una obra social
          </div>
        ) : isFetching ? (
          <div
            className={styles.skeletons}
            aria-busy="true"
            aria-label="Cargando aranceles"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow} aria-hidden="true" />
            ))}
          </div>
        ) : isError ? (
          <div className={styles.errorbox}>
            <AlertCircle size={18} />
            No se pudieron cargar los aranceles. Intentá de nuevo.
          </div>
        ) : encontradas.length === 0 ? (
          <div className={styles.empty}>
            {filas.length === 0
              ? "Esta obra social no tiene prácticas tuyas con precio cargado."
              : `Sin resultados para "${query.trim()}"`}
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Código</th>
                    <th scope="col">Práctica</th>
                    <th scope="col" className={styles.cNum}>Nivel</th>
                    <th scope="col" className={styles.cNum}>Honorarios</th>
                    <th scope="col" className={styles.cNum}>Gastos</th>
                    <th scope="col" className={styles.cNum}>Ayudante</th>
                  </tr>
                </thead>
                <tbody>
                  {mostradas.map((f) => (
                    <tr key={f.nomenclador_id} className={styles.row}>
                      <td data-label="Código" className={styles.cCodigo}>
                        {f.codigo}
                      </td>
                      <td data-label="Práctica" className={styles.cDesc}>
                        {f.descripcion}
                      </td>
                      <td data-label="Nivel" className={styles.cNum}>
                        {f.nivel != null ? (
                          <span className={styles.nivelChip}>{f.nivel}</span>
                        ) : (
                          <span className={styles.dash}>—</span>
                        )}
                      </td>
                      <td
                        data-label="Honorarios"
                        className={`${styles.cNum} ${styles.cTotal}`}
                      >
                        {f.por_presupuesto ? (
                          <span className={styles.presupuesto}>A presupuesto</span>
                        ) : (
                          <Importe comp={conceptoDe(f, "Honorarios")} />
                        )}
                      </td>
                      <td data-label="Gastos" className={styles.cNum}>
                        <Importe comp={conceptoDe(f, "Gastos")} />
                      </td>
                      <td data-label="Ayudante" className={styles.cNum}>
                        <Importe comp={conceptoDe(f, "Ayudante")} />
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

        <div className={styles.disclaimer}>
          <AlertTriangle size={16} />
          Los precios están sujetos a modificaciones por parte de las obras
          sociales.
        </div>
      </div>
    </div>
  );
}

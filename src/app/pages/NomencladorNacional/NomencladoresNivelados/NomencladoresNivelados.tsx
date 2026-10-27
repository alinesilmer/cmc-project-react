import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, ListOrdered, Plus, Trash2 } from "lucide-react";

import base from "../NomencladorCodigos/NomencladorCodigos.module.scss";
import styles from "./NomencladoresNivelados.module.scss";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import type { AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import ConfirmModal from "@/app/components/ui/ConfirmModal/ConfirmModal";
import AplicarNiveladoModal from "../components/AplicarNiveladoModal";
import { usePermisos } from "@/app/auth/usePermisos";
import { getEspecialidades } from "../../Especialidades/especialidades.api";
import {
  actualizarCodigoNivelado,
  actualizarEspecialidadesNivelado,
  agregarCodigoNivelado,
  getEscalaNivelado,
  guardarEscalaNivelado,
  listCodigosNivelado,
  listNivelados,
  listNomenclador,
  quitarCodigoNivelado,
  recalcularNivelado,
} from "../nomenclador.api";
import type { NiveladoCodigoOut, NomencladorNiveladoOut, RecalcularNiveladoResult } from "../nomenclador.types";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { motivoError as detalleError } from "@/app/pages/NomencladorNacional/utiles";
import { today } from "../nomenclador.helpers";
import Paginador from "@/app/components/ui/Paginador/Paginador";
import { Solapa } from "@/app/components/layout/Franja/Franja";
import PaginaPasos from "@/app/components/layout/PaginaPasos/PaginaPasos";
import BotonAccion from "@/app/components/ui/BotonAccion/BotonAccion";
import Button from "@/app/components/ui/Button/Button";
import SearchField from "@/app/components/ui/SearchField/SearchField";

const PAGE_SIZE = 50;
const RUTA = "/panel/nomenclador/nivelados";

type Toast = { type: "success" | "error"; msg: string };
type Pestana = "codigos" | "escala" | "especialidades" | "galenos";
const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: "codigos", texto: "Códigos" },
  { id: "escala", texto: "Escala" },
  { id: "especialidades", texto: "Especialidades" },
  { id: "galenos", texto: "Galenos" },
];
/** Filtro de la tabla: todos, un nivel, o los de unidades fijas. */
type Filtro = "todos" | "unidades" | number;
/** Nomencladores nivelados: Cirugía adulto 7 y 10 niveles, Cirugía infantil, FASGO. */
export default function NomencladoresNivelados() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { can } = usePermisos();
  const puedeEditar = can("nomenclador:editar");

  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [pestana, setPestana] = useState<Pestana>("codigos");
  const [aplicarOpen, setAplicarOpen] = useState(false);
  const [quitar, setQuitar] = useState<NiveladoCodigoOut | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((type: Toast["type"], msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setPage(1), [slug, filtro, qDebounced]);
  useEffect(() => { setFiltro("todos"); setPestana("codigos"); }, [slug]);

  const listado = useQuery({ queryKey: ["nomencladores-nivelados"], queryFn: listNivelados });
  // El Nacional no es nivelado (no tiene niveles ni escala): no se lista acá.
  const nomencladores = useMemo(() => (listado.data ?? []).filter((n) => n.tipo !== "nacional"), [listado.data]);
  const actual: NomencladorNiveladoOut | undefined = nomencladores.find((n) => n.slug === slug);

  // Sin slug en la URL: el primero.
  useEffect(() => {
    if (!slug && nomencladores.length > 0) navigate(`${RUTA}/${nomencladores[0].slug}`, { replace: true });
  }, [slug, nomencladores, navigate]);

  const codigos = useQuery({
    queryKey: ["nivelado-codigos", slug, filtro, qDebounced, page],
    queryFn: () =>
      listCodigosNivelado(slug as string, {
        nivel: typeof filtro === "number" ? filtro : undefined,
        unidades: filtro === "unidades" || undefined,
        q: qDebounced.trim() || undefined,
        page,
        size: PAGE_SIZE,
      }),
    enabled: !!slug,
    placeholderData: (prev) => prev,
  });
  const datos = codigos.data;
  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / PAGE_SIZE)) : 1;

  function refrescar() {
    void codigos.refetch();
    void listado.refetch();
  }

  async function cambiarNivel(c: NiveladoCodigoOut, nivel: number | null, unidades: number | null) {
    if (!slug) return;
    try {
      await actualizarCodigoNivelado(slug, c.nomenclador_id, { nivel, unidades });
      showToast("success", `${c.codigo}: ${nivel != null ? `nivel ${nivel}` : `${unidades} unidades`}.`);
      refrescar();
    } catch (e) {
      showToast("error", detalleError(e, "No se pudo guardar."));
    }
  }

  async function confirmarQuitar() {
    if (!slug || !quitar) return;
    const c = quitar;
    setQuitar(null);
    try {
      await quitarCodigoNivelado(slug, c.nomenclador_id);
      showToast("success", `${c.codigo} quitado del nomenclador.`);
      refrescar();
    } catch (e) {
      showToast("error", detalleError(e, "No se pudo quitar."));
    }
  }

  const niveles = actual ? Array.from({ length: actual.niveles }, (_, i) => i + 1) : [];

  const solapas = actual
    ? PESTANAS.map((p) => (
        <Solapa key={p.id} activa={pestana === p.id} onClick={() => setPestana(p.id)}>
          {p.texto}
        </Solapa>
      ))
    : undefined;

  return (
    <PaginaPasos titulo="Nomencladores nivelados" icono={ListOrdered} ancha solapas={solapas}>
      <div className={styles.layout}>
        <nav className={styles.panel} aria-label="Nomencladores">
          <p className={styles.panelTitulo}>Nomencladores</p>
          {listado.isLoading ? (
            <p className={base.hintText}>Cargando…</p>
          ) : nomencladores.map((n) => (
            <Link
              key={n.slug}
              to={`${RUTA}/${n.slug}`}
              className={`${styles.item} ${n.slug === slug ? styles.itemOn : ""}`}
              aria-current={n.slug === slug ? "page" : undefined}
            >
              <span className={styles.itemNombre}>{n.nombre}</span>
              <span className={styles.itemMeta}>{n.total_codigos} códigos</span>
            </Link>
          ))}
        </nav>

        <section className={styles.contenido}>
          {!actual ? (
            <p className={base.emptyText}>{listado.isLoading ? "Cargando…" : "Elegí un nomenclador."}</p>
          ) : (
            <>
              <div className={styles.cabecera}>
                <div>
                  <h2 className={styles.titulo}>{actual.nombre}</h2>
                  <p className={base.hintText}>
                    {actual.total_codigos} códigos · {actual.niveles} niveles · <strong>{actual.galeno_nombre ?? actual.galeno_grupo}</strong>
                  </p>
                </div>
                {puedeEditar && (
                  <Button onClick={() => setAplicarOpen(true)}>Aplicar a una obra social</Button>
                )}
              </div>

              {pestana === "escala" && (
                <EscalaDelNomenclador
                  key={actual.slug}
                  slug={actual.slug}
                  puedeEditar={puedeEditar}
                  onToast={showToast}
                />
              )}

              {pestana === "galenos" && <GalenosDelNomenclador nomenclador={actual} />}

              {pestana === "especialidades" && (
                <EspecialidadesDelNomenclador
                  key={actual.slug}
                  slug={actual.slug}
                  seleccionadas={actual.especialidades}
                  puedeEditar={puedeEditar}
                  onGuardado={() => { showToast("success", "Especialidades guardadas."); void listado.refetch(); }}
                  onError={(m) => showToast("error", m)}
                />
              )}

              {pestana === "codigos" && (
              <>
              <div className={styles.filtros} role="group" aria-label="Filtrar por nivel">
                <button type="button" className={styles.chip} aria-pressed={filtro === "todos"} onClick={() => setFiltro("todos")}>
                  Todos <b>{actual.total_codigos}</b>
                </button>
                {niveles.map((n) => (
                  <button key={n} type="button" className={styles.chip} aria-pressed={filtro === n} onClick={() => setFiltro(n)}>
                    Nivel {n} <b>{actual.por_nivel[String(n)] ?? 0}</b>
                  </button>
                ))}
                {actual.con_unidades > 0 && (
                  <button type="button" className={styles.chip} aria-pressed={filtro === "unidades"} onClick={() => setFiltro("unidades")}>
                    Unidades fijas <b>{actual.con_unidades}</b>
                  </button>
                )}
              </div>

              <div className={styles.barra}>
                <SearchField
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onClear={() => setQ("")}
                  placeholder="Código o descripción"
                  ariaLabel="Buscar código"
                />
                {puedeEditar && (
                  <AgregarCodigo
                    slug={actual.slug}
                    niveles={niveles}
                    onAgregado={(codigo) => { showToast("success", `${codigo} agregado.`); refrescar(); }}
                    onError={(m) => showToast("error", m)}
                  />
                )}
              </div>

              <div className={styles.tablaWrap}>
                <Tabla>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th>Nivel</th>
                      {puedeEditar && <th aria-label="Acciones" />}
                    </tr>
                  </thead>
                  <tbody>
                    {codigos.isLoading ? (
                      <tr><td colSpan={4}>Cargando…</td></tr>
                    ) : (datos?.items.length ?? 0) === 0 ? (
                      <tr><td colSpan={4}>No hay códigos con ese filtro.</td></tr>
                    ) : datos!.items.map((c) => (
                      <tr key={c.nomenclador_id}>
                        <td className={styles.codigo}>
                          <Link to={`/panel/nomenclador/codigos/${c.nomenclador_id}/editar`}>{c.codigo}</Link>
                          {!c.activo && <span className={styles.inactivo}>inactivo</span>}
                        </td>
                        <td className={styles.desc}>{c.descripcion ?? <span className={base.hintText}>Sin descripción</span>}</td>
                        <td>
                          {puedeEditar ? (
                            <NivelEditable codigo={c} niveles={niveles} onGuardar={cambiarNivel} />
                          ) : c.nivel != null ? `Nivel ${c.nivel}` : `${Number(c.unidades)} unidades`}
                        </td>
                        {puedeEditar && (
                          <td>
                            <BotonAccion icono={Trash2} etiqueta={`Quitar ${c.codigo}`} peligro onClick={() => setQuitar(c)} />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Tabla>
              </div>

              {datos && datos.total > PAGE_SIZE && (
                <Paginador pagina={page} totalPaginas={totalPaginas} onCambiar={setPage} resumen={`${datos.total} códigos`} />
              )}
              </>
              )}
            </>
          )}
        </section>
      </div>

      {actual && (
        <AplicarNiveladoModal
          isOpen={aplicarOpen}
          slug={actual.slug}
          nombre={actual.nombre}
          onClose={() => setAplicarOpen(false)}
          onAplicado={() => void listado.refetch()}
        />
      )}

      <ConfirmModal
        isOpen={quitar !== null}
        variant="danger"
        title="Quitar código del nomenclador"
        message={`¿Quitar ${quitar?.codigo} de ${actual?.nombre ?? "este nomenclador"}? No cambia los precios ya cargados en las obras sociales.`}
        confirmLabel="Quitar"
        onConfirm={confirmarQuitar}
        onCancel={() => setQuitar(null)}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`${base.toast} ${toast.type === "success" ? base.toastSuccess : base.toastError}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </PaginaPasos>
  );
}

// ─── Galenos del nomenclador ─────────────────────────────────────────────────

function GalenosDelNomenclador({ nomenclador }: { nomenclador: NomencladorNiveladoOut }) {
  return (
    <div className={styles.galenos}>
      <div className={styles.galenoTarjeta}>
        <span className={styles.galenoTitulo}>Galeno de honorarios y ayudante</span>
        <strong>{nomenclador.galeno_nombre ?? nomenclador.galeno_codigo ?? nomenclador.galeno_grupo}</strong>
        <span className={base.hintText}>{nomenclador.niveles} niveles</span>
      </div>
      <div className={styles.galenoTarjeta}>
        <span className={styles.galenoTitulo}>Galeno de gastos</span>
        <strong>{nomenclador.galeno_gastos_codigo ?? "gasto_quirurgico"}</strong>
        <span className={base.hintText}>Sin niveles</span>
      </div>
      <p className={base.hintText}>
        El precio de cada galeno lo pacta cada obra social y se carga al aplicar el nomenclador o desde{" "}
        <Link to="/panel/nomenclador/actualizar-precios">Actualizar galenos</Link>.
      </p>
    </div>
  );
}

// ─── Escala de unidades por nivel ────────────────────────────────────────────

type FilaEscala = { nivel: number; uh: string; ua: string; manual: boolean };
const aNum = (v: string) => { const n = parseFloat(v.replace(",", ".")); return Number.isFinite(n) ? n : null; };

function EscalaDelNomenclador({
  slug,
  puedeEditar,
  onToast,
}: {
  slug: string;
  puedeEditar: boolean;
  onToast: (type: "success" | "error", msg: string) => void;
}) {
  const escala = useQuery({ queryKey: ["nivelado-escala", slug], queryFn: () => getEscalaNivelado(slug) });
  const [filas, setFilas] = useState<FilaEscala[]>([]);
  const [recalcular, setRecalcular] = useState(true);
  const [vigencia, setVigencia] = useState(today());
  const [guardando, setGuardando] = useState(false);
  const [previa, setPrevia] = useState<RecalcularNiveladoResult | null>(null);
  const [aplicando, setAplicando] = useState(false);

  useEffect(() => {
    if (!escala.data) return;
    setFilas(escala.data.niveles.map((n) => ({
      nivel: n.nivel,
      uh: String(Number(n.unidades_honorarios)),
      ua: n.unidades_ayudante != null ? String(Number(n.unidades_ayudante)) : "",
      manual: n.unidades_ayudante != null,
    })));
    setPrevia(null);
  }, [escala.data]);

  const filaCalculada = (f: FilaEscala) => {
    const uh = aNum(f.uh) ?? 0;
    const ua = f.manual ? (aNum(f.ua) ?? 0) : Math.round(uh * 25) / 100;
    return { uh, ua };
  };
  const invalida = filas.some((f) => aNum(f.uh) == null || (f.manual && aNum(f.ua) == null));

  function cambiar(nivel: number, cambio: Partial<FilaEscala>) {
    setPrevia(null);
    setFilas((prev) => prev.map((f) => (f.nivel === nivel ? { ...f, ...cambio } : f)));
  }

  async function guardar() {
    setGuardando(true);
    setPrevia(null);
    try {
      await guardarEscalaNivelado(slug, filas.map((f) => ({
        nivel: f.nivel,
        unidades_honorarios: aNum(f.uh) ?? 0,
        unidades_ayudante: f.manual ? aNum(f.ua) : null,
      })));
      void escala.refetch();
      if (!recalcular) {
        onToast("success", "Escala guardada. Los valores ya cargados no cambian hasta recalcular.");
        return;
      }
      setPrevia(await recalcularNivelado(slug, { vigencia_desde: vigencia, dry_run: true }));
      onToast("success", "Escala guardada. Revisá la vista previa del recálculo.");
    } catch (e) {
      onToast("error", detalleError(e, "No se pudo guardar la escala."));
    } finally {
      setGuardando(false);
    }
  }

  async function aplicarRecalculo() {
    setAplicando(true);
    try {
      const r = await recalcularNivelado(slug, { vigencia_desde: vigencia, dry_run: false });
      setPrevia(null);
      onToast(
        r.errores.length ? "error" : "success",
        `Recalculado: ${r.valores} valores en ${r.obras_sociales} obras sociales${r.errores.length ? ` (${r.errores.length} con error)` : ""}.`,
      );
    } catch (e) {
      onToast("error", detalleError(e, "No se pudo recalcular."));
    } finally {
      setAplicando(false);
    }
  }

  if (escala.isLoading) return <p className={base.hintText}>Cargando…</p>;
  if (filas.length === 0) return <p className={base.emptyText}>Este nomenclador todavía no tiene escala cargada.</p>;

  return (
    <div className={styles.escala}>
      <div className={styles.escalaTabla}>
        <div className={styles.escalaCabecera}>
          <div>
            <strong>Escala por nivel</strong>
            <p className={base.hintText}>Unidades que se multiplican por el valor unitario del galeno de cada obra social.</p>
          </div>
        </div>
        <div className={styles.escalaGrid}>
          <span className={styles.th}>Nivel</span>
          <span className={styles.th}>Unid. honorarios</span>
          <span className={styles.th}>Unid. ayudante</span>
          {filas.map((f) => {
            const c = filaCalculada(f);
            return (
              <div key={f.nivel} className={styles.escalaFila}>
                <strong>{f.nivel}</strong>
                <input
                  className={base.formInput} type="number" min="0" step="0.01" value={f.uh} disabled={!puedeEditar}
                  aria-label={`Unidades de honorarios del nivel ${f.nivel}`}
                  onChange={(e) => cambiar(f.nivel, { uh: e.target.value })}
                />
                <div className={styles.ayudanteCelda}>
                  <input
                    className={`${base.formInput} ${f.manual ? styles.editado : ""}`} type="number" min="0" step="0.01"
                    value={f.manual ? f.ua : String(c.ua)} disabled={!puedeEditar}
                    aria-label={`Unidades de ayudante del nivel ${f.nivel}`}
                    onChange={(e) => cambiar(f.nivel, { ua: e.target.value, manual: true })}
                  />
                  {f.manual ? (
                    puedeEditar && <button type="button" className={styles.link} onClick={() => cambiar(f.nivel, { manual: false, ua: "" })}>EDITADO · volver al 25 %</button>
                  ) : <span className={base.hintText}>25 %</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className={styles.escalaLateral}>
        <div className={styles.aviso}>
          <strong>El ayudante es el 25 % de los honorarios.</strong> Se completa solo; si hace falta se edita nivel por
          nivel. Una obra social puede ajustar las unidades de un nivel al aplicar el nomenclador.
        </div>
        {puedeEditar && (
          <div className={styles.guardar}>
            <strong>Al guardar la escala</strong>
            <label className={styles.checkLinea}>
              <input type="checkbox" checked={recalcular} onChange={(e) => { setRecalcular(e.target.checked); setPrevia(null); }} />
              Recalcular los valores de las {escala.data?.obras_sociales ?? 0} obras sociales que lo usan, desde
            </label>
            <input
              className={base.formInput} type="date" value={vigencia} disabled={!recalcular}
              aria-label="Vigencia del recálculo" onChange={(e) => { setVigencia(e.target.value); setPrevia(null); }}
            />
            <span className={base.hintText}>
              Antes de aplicar se muestra una vista previa. Las obras sociales con niveles ajustados conservan su ajuste.
            </span>
            <div className={styles.accionesEscala}>
              <button type="button" className={base.btnGhost} disabled={guardando || escala.isFetching} onClick={() => void escala.refetch()}>
                Descartar
              </button>
              <button type="button" className={base.btnPrimary} disabled={guardando || invalida} onClick={() => void guardar()}>
                {guardando ? "Guardando…" : recalcular ? "Guardar y ver vista previa" : "Guardar escala"}
              </button>
            </div>
          </div>
        )}
        {previa && (
          <div className={styles.previa} role="status">
            <strong>Vista previa del recálculo</strong>
            <span><b>{previa.valores}</b> valores en <b>{previa.obras_sociales}</b> obras sociales, desde el {vigencia.split("-").reverse().join("/")}.</span>
            {previa.errores.length > 0 && (
              <details>
                <summary>{previa.errores.length} no se pueden recalcular</summary>
                <ul>{previa.errores.map((x) => <li key={x.obra_social_nro}>{x.obra_social_nro}: {x.motivo}</li>)}</ul>
              </details>
            )}
            <button type="button" className={base.btnPrimary} disabled={aplicando || previa.valores === 0} onClick={() => void aplicarRecalculo()}>
              {aplicando ? "Recalculando…" : "Recalcular ahora"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

// ─── Especialidades a las que se aplica el nomenclador ───────────────────────

function EspecialidadesDelNomenclador({
  slug,
  seleccionadas,
  puedeEditar,
  onGuardado,
  onError,
}: {
  slug: string;
  seleccionadas: number[];
  puedeEditar: boolean;
  onGuardado: () => void;
  onError: (msg: string) => void;
}) {
  const { data: especialidades = [] } = useQuery({
    queryKey: ["especialidades"],
    queryFn: getEspecialidades,
    staleTime: 30 * 60 * 1000,
  });
  const nombres = useMemo(
    () => new Map(especialidades.map((e) => [e.id_colegio_espe, e.nombre])),
    [especialidades],
  );

  const [editando, setEditando] = useState(false);
  const [elegidas, setElegidas] = useState<Set<number>>(new Set(seleccionadas));
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);

  function abrir() {
    setElegidas(new Set(seleccionadas));
    setBusqueda("");
    setEditando(true);
  }

  const visibles = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return [...especialidades]
      .filter((e) => !t || e.nombre.toLowerCase().includes(t))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
  }, [especialidades, busqueda]);

  function alternar(id: number) {
    setElegidas((prev) => {
      const sig = new Set(prev);
      if (!sig.delete(id)) sig.add(id);
      return sig;
    });
  }

  async function guardar() {
    setGuardando(true);
    try {
      await actualizarEspecialidadesNivelado(slug, [...elegidas]);
      setEditando(false);
      onGuardado();
    } catch (e) {
      onError(detalleError(e, "No se pudieron guardar las especialidades."));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={styles.especialidades}>
      <div className={styles.especialidadesCabecera}>
        <span className={styles.especialidadesTitulo}>Se aplica a:</span>
        {seleccionadas.length === 0 ? (
          <span className={base.hintText}>todas las especialidades del código</span>
        ) : (
          seleccionadas.map((id) => (
            <span key={id} className={styles.especialidadChip}>{nombres.get(id) ?? `Especialidad ${id}`}</span>
          ))
        )}
        {puedeEditar && !editando && (
          <button type="button" className={base.btnGhost} onClick={abrir}>Editar</button>
        )}
      </div>

      {editando && (
        <div className={styles.especialidadesEditor}>
          <p className={base.hintText}>
            Al aplicar el nomenclador a una obra social solo se carga precio en estas especialidades (las que
            además tenga habilitadas el código). Sin ninguna marcada, se aplica a todas. Los códigos sin
            restricción de especialidad se cotizan igual. No cambia los precios ya cargados.
          </p>
          <input
            className={base.formInput}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar especialidad…"
            aria-label="Buscar especialidad"
          />
          <div className={styles.especialidadesLista}>
            {visibles.map((e) => (
              <label key={e.id_colegio_espe} className={styles.especialidadOpcion}>
                <input
                  type="checkbox"
                  checked={elegidas.has(e.id_colegio_espe)}
                  onChange={() => alternar(e.id_colegio_espe)}
                />
                {e.nombre}
              </label>
            ))}
          </div>
          <div className={styles.especialidadesAcciones}>
            <span className={base.hintText}>
              {elegidas.size === 0 ? "Todas las especialidades" : `${elegidas.size} seleccionada${elegidas.size === 1 ? "" : "s"}`}
            </span>
            <button type="button" className={base.btnGhost} disabled={guardando} onClick={() => setEditando(false)}>
              Cancelar
            </button>
            <button type="button" className={base.btnPrimary} disabled={guardando} onClick={() => void guardar()}>
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Nivel editable en la fila ────────────────────────────────────────────────

function NivelEditable({
  codigo,
  niveles,
  onGuardar,
}: {
  codigo: NiveladoCodigoOut;
  niveles: number[];
  onGuardar: (c: NiveladoCodigoOut, nivel: number | null, unidades: number | null) => void;
}) {
  const [unidades, setUnidades] = useState(codigo.unidades != null ? String(Number(codigo.unidades)) : "");
  const [modoUnidades, setModoUnidades] = useState(codigo.nivel == null);

  useEffect(() => {
    setUnidades(codigo.unidades != null ? String(Number(codigo.unidades)) : "");
    setModoUnidades(codigo.nivel == null);
  }, [codigo.nivel, codigo.unidades]);

  const unidadesValidas = Number(unidades) > 0;
  return (
    <div className={styles.nivel}>
      <select
        className={base.formSelect}
        aria-label={`Nivel de ${codigo.codigo}`}
        value={modoUnidades ? "u" : String(codigo.nivel)}
        onChange={(e) => {
          if (e.target.value === "u") setModoUnidades(true);
          else {
            setModoUnidades(false);
            onGuardar(codigo, Number(e.target.value), null);
          }
        }}
      >
        {niveles.map((n) => <option key={n} value={n}>Nivel {n}</option>)}
        <option value="u">Unidades fijas</option>
      </select>
      {modoUnidades && (
        <>
          <input
            type="number"
            min="1"
            className={`${base.formInput} ${styles.unidades}`}
            aria-label={`Unidades de ${codigo.codigo}`}
            value={unidades}
            onChange={(e) => setUnidades(e.target.value)}
          />
          <button
            type="button"
            className={base.btnGhost}
            disabled={!unidadesValidas || Number(unidades) === Number(codigo.unidades)}
            onClick={() => onGuardar(codigo, null, Number(unidades))}
          >
            Guardar
          </button>
        </>
      )}
    </div>
  );
}

// ─── Agregar un código ────────────────────────────────────────────────────────

function AgregarCodigo({
  slug,
  niveles,
  onAgregado,
  onError,
}: {
  slug: string;
  niveles: number[];
  onAgregado: (codigo: string) => void;
  onError: (msg: string) => void;
}) {
  const [opciones, setOpciones] = useState<AppSearchSelectOption[]>([]);
  const [cargando, setCargando] = useState(false);
  const [elegido, setElegido] = useState<number | null>(null);
  const [nivel, setNivel] = useState(1);
  const [guardando, setGuardando] = useState(false);

  const buscar = useCallback(async (q: string) => {
    if (q.trim().length < 2) return;
    setCargando(true);
    try {
      const res = await listNomenclador({ q: q.trim(), en_descripcion: true, activo: true, size: 20 });
      setOpciones(res.map((n) => ({ id: n.id, label: `${n.codigo} - ${n.descripcion ?? ""}` })));
    } finally {
      setCargando(false);
    }
  }, []);

  async function agregar() {
    if (elegido == null) return;
    setGuardando(true);
    try {
      const out = await agregarCodigoNivelado(slug, { nomenclador_id: elegido, nivel, unidades: null });
      setElegido(null);
      onAgregado(out.codigo);
    } catch (e) {
      onError(detalleError(e, "No se pudo agregar."));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={styles.agregar}>
      <div className={styles.agregarBuscar}>
        <AppSearchSelect
          options={opciones}
          value={elegido}
          loading={cargando}
          onQueryChange={(q) => void buscar(q)}
          onChange={(v) => setElegido(v == null ? null : Number(v))}
        />
      </div>
      <select className={base.formSelect} aria-label="Nivel del código a agregar" value={nivel} onChange={(e) => setNivel(Number(e.target.value))}>
        {niveles.map((n) => <option key={n} value={n}>Nivel {n}</option>)}
      </select>
      <button type="button" className={base.btnGhost} disabled={elegido == null || guardando} onClick={() => void agregar()}>
        <Plus size={14} /> Agregar
      </button>
    </div>
  );
}

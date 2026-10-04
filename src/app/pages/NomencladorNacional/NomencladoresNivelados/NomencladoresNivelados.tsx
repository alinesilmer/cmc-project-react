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
import { usePermisos } from "../../../auth/usePermisos";
import {
  actualizarCodigoNivelado,
  agregarCodigoNivelado,
  listCodigosNivelado,
  listNivelados,
  listNomenclador,
  quitarCodigoNivelado,
} from "../nomenclador.api";
import type { NiveladoCodigoOut, NomencladorNiveladoOut } from "../nomenclador.types";

const PAGE_SIZE = 50;
const RUTA = "/panel/nomenclador/nivelados";

type Toast = { type: "success" | "error"; msg: string };
/** Filtro de la tabla: todos, un nivel, o los de unidades fijas. */
type Filtro = "todos" | "unidades" | number;

function detalleError(e: unknown, fallback: string): string {
  const d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (d && typeof d === "object" && typeof (d as { mensaje?: unknown }).mensaje === "string") {
    return (d as { mensaje: string }).mensaje;
  }
  return fallback;
}

/**
 * Nomencladores nivelados: Cirugía adulto 7 y 10 niveles, Cirugía infantil, FASGO,
 * Urología… A cada código le corresponde el mismo nivel en todas las obras sociales;
 * lo que cambia es el precio del galeno por nivel. Desde acá se consulta y corrige el
 * nivel de cada código y se aplica el nomenclador a una obra social.
 */
export default function NomencladoresNivelados() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { can } = usePermisos();
  const puedeEditar = can("nomenclador:editar");

  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [page, setPage] = useState(1);
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
  useEffect(() => setFiltro("todos"), [slug]);

  const listado = useQuery({ queryKey: ["nomencladores-nivelados"], queryFn: listNivelados });
  const nomencladores = useMemo(() => listado.data ?? [], [listado.data]);
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

  return (
    <div className={base.container}>
      <div className={base.header}>
        <div className={base.headerLeft}>
          <span className={base.headerIcon}><ListOrdered size={20} /></span>
          <div>
            <h1 className={base.title}>Nomencladores nivelados</h1>
            <p className={base.subtitle}>
              El nivel de cada código es el mismo en todas las obras sociales; lo que cambia es el
              precio del galeno por nivel que pacta cada una.
            </p>
          </div>
        </div>
      </div>

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
                    Se cotiza con el <strong>{actual.galeno_nombre ?? actual.galeno_grupo}</strong> de{" "}
                    {actual.niveles} niveles: cada código toma las unidades del galeno de su nivel.
                  </p>
                </div>
                {puedeEditar && (
                  <button type="button" className={base.btnPrimary} onClick={() => setAplicarOpen(true)}>
                    Aplicar a una obra social
                  </button>
                )}
              </div>

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
                <input
                  className={`${base.formInput} ${styles.buscar}`}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por código o descripción…"
                  aria-label="Buscar código"
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

              <div className={base.tableWrap}>
                <table className={base.table}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th>Nivel</th>
                      {puedeEditar && <th className={base.thActions} />}
                    </tr>
                  </thead>
                  <tbody>
                    {codigos.isLoading ? (
                      <tr><td colSpan={4} className={base.loadingCell}>Cargando…</td></tr>
                    ) : (datos?.items.length ?? 0) === 0 ? (
                      <tr><td colSpan={4} className={base.emptyCell}>No hay códigos con ese filtro.</td></tr>
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
                          <td className={base.actionsCell}>
                            <button type="button" className={base.btnDanger} onClick={() => setQuitar(c)} aria-label={`Quitar ${c.codigo}`}>
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {datos && datos.total > PAGE_SIZE && (
                <div className={styles.paginacion}>
                  <button type="button" className={base.btnGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
                  <span className={base.hintText}>Página {page} de {totalPaginas} · {datos.total} códigos</span>
                  <button type="button" className={base.btnGhost} disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
                </div>
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

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  ListPlus,
  Loader2,
  MinusCircle,
  PlusCircle,
  Search,
} from "lucide-react";

import styles from "./AgregarCodigoObrasSociales.module.scss";
import AppSearchSelect from "../../../components/ui/AppSearchSelect/AppSearchSelect";
import ConfirmModal from "@/app/components/ui/ConfirmModal/ConfirmModal";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import { altaNECero, listNomenclador } from "../nomenclador.api";
import type { AltaNECeroOS, AltaNECeroResult, NomencladorOut } from "../nomenclador.types";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";

/** Vigencia por defecto de las altas: 01/01/2026 (editable). */
const VIGENCIA_DEFAULT = "2026-01-01";

const num = new Intl.NumberFormat("es-AR");

/** `aaaa-mm-dd` → `dd/mm/aaaa` sin pasar por Date (evita el corrimiento por UTC). */
function fechaAR(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Herramientas → "Agregar código a obras sociales".
 *
 * Da de alta un código como NE en $0 en las obras sociales elegidas: una variante
 * por cada especialidad de la plantilla del código (o una sola sin especialidad si
 * el código es "sin restricción"), con la vigencia indicada. Lo que ya existe no se
 * toca. Primero se pide la vista previa (`dry_run`) y recién al confirmar se guarda.
 */
export default function AgregarCodigoObrasSociales() {
  const osQuery = useObrasSociales();

  // ── Código ──
  const [codigoOpts, setCodigoOpts] = useState<NomencladorOut[]>([]);
  const [codigoLoading, setCodigoLoading] = useState(false);
  const [codigo, setCodigo] = useState<NomencladorOut | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buscarCodigo(q: string) {
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length < 2) {
      setCodigoOpts([]);
      return;
    }
    setCodigoLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        setCodigoOpts(await listNomenclador({ q: q.trim(), activo: true, size: 20 }));
      } catch {
        setCodigoOpts([]);
      } finally {
        setCodigoLoading(false);
      }
    }, 300);
  }

  // ── Obras sociales ──
  const [filtroOs, setFiltroOs] = useState("");
  const [elegidas, setElegidas] = useState<Set<number>>(new Set());
  const todasOs = useMemo(
    () => [...(osQuery.data ?? [])].sort((a, b) => a.nro_obra_social - b.nro_obra_social),
    [osQuery.data],
  );
  const visibles = useMemo(() => {
    const q = normalizar(filtroOs.trim());
    if (!q) return todasOs;
    return todasOs.filter(
      (o) => normalizar(o.nombre).includes(q) || String(o.nro_obra_social).includes(q),
    );
  }, [todasOs, filtroOs]);

  function toggleOs(nro: number) {
    setElegidas((prev) => {
      const next = new Set(prev);
      if (next.has(nro)) next.delete(nro);
      else next.add(nro);
      return next;
    });
  }
  // Con un filtro escrito, los botones actúan sobre lo que se ve.
  function seleccionarVisibles() {
    setElegidas((prev) => new Set([...prev, ...visibles.map((o) => o.nro_obra_social)]));
  }
  function desmarcarVisibles() {
    const fuera = new Set(visibles.map((o) => o.nro_obra_social));
    setElegidas((prev) => new Set([...prev].filter((n) => !fuera.has(n))));
  }

  // ── Vigencia, vista previa y resultado ──
  const [vigencia, setVigencia] = useState(VIGENCIA_DEFAULT);
  const [preview, setPreview] = useState<AltaNECeroResult | null>(null);
  const [resultado, setResultado] = useState<AltaNECeroResult | null>(null);
  const [cargando, setCargando] = useState<"preview" | "aplicar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Cualquier cambio en lo elegido invalida la vista previa.
  useEffect(() => {
    setPreview(null);
    setError(null);
  }, [codigo, elegidas, vigencia]);

  const listo = !!codigo && elegidas.size > 0 && !!vigencia;

  function payload(dry_run: boolean) {
    return {
      codigo: codigo!.codigo,
      obra_social_nros: [...elegidas].sort((a, b) => a - b),
      vigencia_desde: vigencia,
      dry_run,
    };
  }

  async function revisar() {
    if (!listo) return;
    setCargando("preview");
    setError(null);
    setResultado(null);
    try {
      setPreview(await altaNECero(payload(true)));
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo calcular la vista previa."));
    } finally {
      setCargando(null);
    }
  }

  async function aplicar() {
    if (!listo) return;
    setConfirmOpen(false);
    setCargando("aplicar");
    setError(null);
    try {
      setResultado(await altaNECero(payload(false)));
      setPreview(null);
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo agregar el código."));
    } finally {
      setCargando(null);
    }
  }

  const informe = resultado ?? preview;
  const nombreEsp = useMemo(() => {
    const m = new Map<number, string>();
    for (const e of informe?.plantilla ?? []) m.set(e.id_colegio, e.nombre);
    return m;
  }, [informe]);
  const espLabel = (e: number | null) => (e == null ? "Sin especialidad" : nombreEsp.get(e) ?? String(e));

  const porEstado = (estado: AltaNECeroOS["estado"]) =>
    informe?.obras_sociales.filter((o) => o.estado === estado) ?? [];
  const conNN = informe?.obras_sociales.filter((o) => o.nn_con_precio && o.creadas.length > 0) ?? [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <ListPlus size={20} />
        </span>
        <div>
          <h1 className={styles.title}>Agregar código a obras sociales</h1>
          <p className={styles.subtitle}>
            Da de alta un código como NE en $0 en varias obras sociales a la vez
          </p>
        </div>
      </div>

      <div className={styles.infoBox}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          Se crea un valor <strong>NE en $0</strong> por cada especialidad de la{" "}
          <strong>plantilla del código</strong> (o uno sin especialidad si el código es
          "sin restricción"), con la vigencia que indiques. Lo que cada obra social ya
          tiene <strong>no se toca</strong>. Después se carga el precio real desde{" "}
          <em>Por obra social</em>.
        </span>
      </div>

      <section className={styles.card}>
        <div className={styles.fila}>
          <div className={styles.campoCodigo}>
            <label className={styles.label}>Código</label>
            <AppSearchSelect
              options={codigoOpts.map((n) => ({
                id: n.id,
                label: n.descripcion ? `${n.codigo} · ${n.descripcion}` : n.codigo,
              }))}
              value={codigo?.id ?? null}
              loading={codigoLoading}
              disabled={cargando === "aplicar"}
              onQueryChange={buscarCodigo}
              onChange={(v) => setCodigo(codigoOpts.find((n) => n.id === v) ?? null)}
            />
          </div>
          <div className={styles.campoVigencia}>
            <label className={styles.label} htmlFor="vigencia-alta">Vigencia desde</label>
            <input
              id="vigencia-alta"
              type="date"
              className={styles.input}
              value={vigencia}
              onChange={(e) => setVigencia(e.target.value)}
              disabled={cargando === "aplicar"}
            />
          </div>
        </div>

        <div className={styles.osHead}>
          <label className={styles.label}>
            Obras sociales <span className={styles.contadorOs}>{elegidas.size} elegida(s)</span>
          </label>
          <div className={styles.osBotones}>
            <button type="button" className={styles.btnGhost} onClick={seleccionarVisibles}
              disabled={cargando === "aplicar" || visibles.length === 0}>
              Seleccionar todas{filtroOs.trim() ? " (filtradas)" : ""}
            </button>
            <button type="button" className={styles.btnGhost} onClick={desmarcarVisibles}
              disabled={cargando === "aplicar" || elegidas.size === 0}>
              Desmarcar todas{filtroOs.trim() ? " (filtradas)" : ""}
            </button>
          </div>
        </div>
        <div className={styles.buscador}>
          <Search size={15} />
          <input
            type="search"
            placeholder="Buscar por nombre o número…"
            value={filtroOs}
            onChange={(e) => setFiltroOs(e.target.value)}
            aria-label="Buscar obra social"
          />
        </div>
        <ul className={styles.osLista}>
          {osQuery.isLoading && (
            <li className={styles.osVacio}><Loader2 size={14} className={styles.spin} /> Cargando…</li>
          )}
          {!osQuery.isLoading && visibles.length === 0 && (
            <li className={styles.osVacio}>Ninguna obra social coincide con la búsqueda.</li>
          )}
          {visibles.map((o) => (
            <li key={o.nro_obra_social}>
              <label className={styles.osItem}>
                <input
                  type="checkbox"
                  checked={elegidas.has(o.nro_obra_social)}
                  onChange={() => toggleOs(o.nro_obra_social)}
                  disabled={cargando === "aplicar"}
                />
                <span className={styles.osNro}>{o.nro_obra_social}</span>
                <span className={styles.osNombre}>{o.nombre}</span>
                {o.marca !== "S" && <span className={styles.osInactiva}>inactiva</span>}
              </label>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <button type="button" className={styles.btnPrimary} onClick={revisar}
            disabled={!listo || cargando !== null}>
            {cargando === "preview" ? <Loader2 size={15} className={styles.spin} /> : <Search size={15} />}
            Revisar
          </button>
        </div>
        {cargando === "aplicar" && (
          <p className={styles.muted}>
            <Loader2 size={14} className={styles.spin} /> Agregando el código… no cierres la página.
          </p>
        )}
        {error && (
          <div className={styles.errorBox}>
            <AlertCircle size={15} /> {error}
          </div>
        )}
      </section>

      {informe && (
        <section className={styles.card}>
          {resultado ? (
            <div className={styles.okBox}>
              <CheckCircle2 size={16} />
              <span>
                Listo: se crearon {num.format(resultado.total_creadas)} valor(es) NE en $0 del
                código {resultado.codigo} con vigencia {fechaAR(resultado.vigencia_desde)}.
              </span>
            </div>
          ) : (
            <h2 className={styles.sectionTitle}>Vista previa — todavía no se guardó nada</h2>
          )}

          <h3 className={styles.blockTitle}>
            {informe.codigo}
            {informe.descripcion ? ` · ${informe.descripcion}` : ""}
          </h3>
          {informe.sin_restriccion ? (
            <p className={styles.muted}>
              Código sin restricción de especialidad: se crea un único valor sin especialidad.
            </p>
          ) : (
            <div className={styles.chips}>
              {informe.plantilla.map((e) => (
                <span key={e.id_colegio} className={styles.chip}>{e.nombre}</span>
              ))}
            </div>
          )}

          <div className={styles.contadores}>
            <div className={`${styles.contador} ${styles.contadorNuevo}`}>
              <strong>{num.format(informe.total_creadas)}</strong>
              <span>valores NE {resultado ? "creados" : "a crear"} en $0</span>
            </div>
            <div className={styles.contador}>
              <strong>{porEstado("creada").length}</strong>
              <span>obra(s) social(es) con altas</span>
            </div>
            <div className={styles.contador}>
              <strong>{porEstado("sin_cambios").length}</strong>
              <span>ya tenían todo — no se tocan</span>
            </div>
          </div>

          {conNN.length > 0 && (
            <div className={styles.warnBox}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                {conNN.length} obra(s) social(es) ya tienen este código en NN con precio. Un
                NE le gana al NN al cotizar: desde el {fechaAR(informe.vigencia_desde)} los
                médicos de esas especialidades cotizarían <strong>$0</strong> hasta que cargues
                el precio NE. ({conNN.map((o) => o.obra_social_nro).join(", ")})
              </span>
            </div>
          )}

          <h3 className={styles.blockTitle}>Detalle por obra social</h3>
          <ul className={styles.lista}>
            {informe.obras_sociales.map((o) => {
              const clase =
                o.estado === "creada" ? styles.itemNuevo
                  : o.estado === "sin_cambios" ? styles.itemExistente
                    : styles.itemError;
              const Icono = o.estado === "creada" ? PlusCircle
                : o.estado === "sin_cambios" ? MinusCircle : AlertCircle;
              return (
                <li key={o.obra_social_nro} className={clase}>
                  <Icono size={14} />
                  <span className={styles.itemNombre}>{o.obra_social_nro} · {o.nombre}</span>
                  <span className={styles.itemDetalle}>
                    {o.creadas.length > 0 &&
                      `${resultado ? "Creadas" : "Se crean"}: ${o.creadas.map(espLabel).join(", ")}. `}
                    {o.existentes.length > 0 &&
                      `Ya existían (no se tocan): ${o.existentes.map(espLabel).join(", ")}. `}
                    {o.motivo}
                  </span>
                </li>
              );
            })}
          </ul>

          {!resultado && (
            <div className={styles.actions}>
              {informe.total_creadas > 0 ? (
                <button type="button" className={styles.btnPrimary}
                  onClick={() => setConfirmOpen(true)} disabled={cargando !== null}>
                  <ListPlus size={15} /> Agregar código
                </button>
              ) : (
                <span className={styles.okInline}>
                  <CheckCircle2 size={15} /> No hay nada para crear: las obras sociales elegidas ya lo tienen.
                </span>
              )}
            </div>
          )}
        </section>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        variant="warning"
        title="Agregar código a obras sociales"
        message={
          preview
            ? `Se van a crear ${num.format(preview.total_creadas)} valor(es) NE en $0 del código ` +
              `${preview.codigo}, con vigencia ${fechaAR(preview.vigencia_desde)}, en ` +
              `${porEstado("creada").length} obra(s) social(es).\n\nLo que ya existe no se toca.`
            : ""
        }
        confirmLabel="Agregar"
        onConfirm={aplicar}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

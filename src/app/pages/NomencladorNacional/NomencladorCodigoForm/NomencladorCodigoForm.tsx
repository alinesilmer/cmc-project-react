import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckCircle2, ListOrdered, Save } from "lucide-react";

import base from "../NomencladorCodigos/NomencladorCodigos.module.scss";
import styles from "./NomencladorCodigoForm.module.scss";
import AppSearchSelect from "../../../components/ui/AppSearchSelect/AppSearchSelect";
import MultiSelectBuscable from "../../../components/molecules/MultiSelectBuscable/MultiSelectBuscable";
import { usePermisos } from "../../../auth/usePermisos";
import { getEspecialidades } from "../../Especialidades/especialidades.api";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import {
  aplicarEspecialidades,
  createNomenclador,
  getNomencladorById,
  listValores,
  updateNomenclador,
} from "../nomenclador.api";
import type {
  AplicarEspecialidadesResult,
  Complejidad,
  NomencladorCreatePayload,
  ValorOut,
} from "../nomenclador.types";

const LISTADO_PATH = "/panel/nomenclador/codigos";

type Toast = { type: "success" | "error"; msg: string };

const moneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

function detalleError(e: unknown, fallback: string): string {
  const d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof d === "string" ? d : fallback;
}

function montoDe(v: ValorOut, concepto: string): number {
  return v.componentes
    .filter((c) => c.concepto === concepto && c.activo)
    .reduce((acc, c) => acc + (parseFloat(c.subtotal) || 0), 0);
}

export default function NomencladorCodigoForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = usePermisos();
  const puedeAplicar = can("nomenclador:masivo");

  // `savedId` pasa a tener valor al crear: los guardados siguientes actualizan.
  const [savedId, setSavedId] = useState<number | null>(id ? Number(id) : null);
  const editando = savedId !== null;

  const [loadingInicial, setLoadingInicial] = useState(!!id);
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [complejidad, setComplejidad] = useState<Complejidad | "">("");
  const [observacion, setObservacion] = useState("");
  const [sinRestriccion, setSinRestriccion] = useState(false);
  const [espSel, setEspSel] = useState<number[]>([]);
  const [osSel, setOsSel] = useState<number[]>([]);
  const [errorCodigo, setErrorCodigo] = useState("");
  const [saving, setSaving] = useState<null | "solo" | "aplicar">(null);
  const [resultado, setResultado] = useState<AplicarEspecialidadesResult | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const espQuery = useQuery({
    queryKey: ["especialidades"],
    queryFn: getEspecialidades,
    staleTime: 10 * 60 * 1000,
  });
  const osQuery = useObrasSociales();

  const espOptions = useMemo(
    () =>
      (espQuery.data ?? [])
        .map((e) => ({ value: e.id_colegio_espe, label: e.nombre, hint: String(e.id_colegio_espe) }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [espQuery.data],
  );
  const osOptions = useMemo(
    () =>
      (osQuery.data ?? [])
        .map((o) => ({ value: o.nro_obra_social, label: o.nombre, hint: String(o.nro_obra_social) }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [osQuery.data],
  );
  const osNombre = useMemo(() => new Map(osOptions.map((o) => [o.value, o.label])), [osOptions]);
  const espNombre = useMemo(() => new Map(espOptions.map((o) => [o.value, o.label])), [espOptions]);

  function showToast(type: Toast["type"], msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  // Edición: carga el código con su plantilla preseleccionada.
  useEffect(() => {
    if (!id) return;
    let vivo = true;
    getNomencladorById(Number(id))
      .then((d) => {
        if (!vivo) return;
        setCodigo(d.codigo);
        setDescripcion(d.descripcion ?? "");
        setCategoria(d.categoria ?? "");
        setComplejidad(d.complejidad ?? "");
        setObservacion(d.observacion ?? "");
        setSinRestriccion(!!d.sin_restriccion_especialidad);
        setEspSel(d.especialidades);
      })
      .catch(() => {
        if (vivo) showToast("error", "No se pudo cargar el código.");
      })
      .finally(() => {
        if (vivo) setLoadingInicial(false);
      });
    return () => {
      vivo = false;
    };
  }, [id]);

  /** Guarda el código (alta o edición) y devuelve su id, o `null` si falló. */
  async function guardar(): Promise<number | null> {
    if (!codigo.trim()) {
      setErrorCodigo("Requerido");
      return null;
    }
    const payload: NomencladorCreatePayload = {
      codigo: codigo.trim(),
      descripcion: descripcion.trim(),
      categoria: categoria.trim() || null,
      complejidad: complejidad || null,
      observacion: observacion.trim() || null,
      sin_restriccion_especialidad: sinRestriccion,
      especialidades: sinRestriccion ? [] : espSel,
    };
    try {
      if (savedId !== null) {
        const { codigo: _omit, ...cambios } = payload;
        void _omit;
        await updateNomenclador(savedId, cambios);
        return savedId;
      }
      const creado = await createNomenclador(payload);
      setSavedId(creado.id);
      return creado.id;
    } catch (e) {
      showToast("error", detalleError(e, "No se pudo guardar el código."));
      return null;
    }
  }

  async function handleGuardarSolo() {
    setSaving("solo");
    const nid = await guardar();
    setSaving(null);
    if (nid === null) return;
    navigate(LISTADO_PATH, {
      state: { toast: { type: "success", msg: editando ? "Código actualizado." : "Código creado." } },
    });
  }

  async function handleGuardarYAplicar() {
    if (osSel.length === 0) {
      showToast("error", "Elegí al menos una obra social para aplicar.");
      return;
    }
    if (!sinRestriccion && espSel.length === 0) {
      showToast("error", "Elegí al menos una especialidad o marcá «Sin restricción por especialidad».");
      return;
    }
    setSaving("aplicar");
    setResultado(null);
    const nid = await guardar();
    if (nid === null) {
      setSaving(null);
      return;
    }
    try {
      setResultado(await aplicarEspecialidades(nid, osSel));
    } catch (e) {
      showToast("error", detalleError(e, "El código se guardó, pero no se pudo aplicar."));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className={base.container}>
      <button type="button" className={styles.backBtn} onClick={() => navigate(LISTADO_PATH)}>
        <ArrowLeft size={14} /> Volver a Gestión de Códigos
      </button>

      <div className={base.header}>
        <div className={base.headerLeft}>
          <span className={base.headerIcon}><ListOrdered size={20} /></span>
          <div>
            <h1 className={base.title}>{editando ? "Editar código" : "Nuevo código"}</h1>
            <p className={base.subtitle}>Catálogo maestro de prestaciones médicas del Colegio</p>
          </div>
        </div>
      </div>

      {loadingInicial ? (
        <p className={base.emptyText}>Cargando…</p>
      ) : (
        <div className={styles.stack}>
          {/* 1 · Datos del código */}
          <section className={`${base.body} ${styles.section}`}>
            <h2 className={styles.sectionHeading}>1 · Datos del código</h2>
            <div className={base.formRow3}>
              <div className={base.formGroup}>
                <label className={base.formLabel} htmlFor="cod-codigo">
                  Código <span className={base.req}>*</span>
                </label>
                <input
                  id="cod-codigo"
                  className={`${base.formInput} ${errorCodigo ? base.inputError : ""}`}
                  value={codigo}
                  disabled={editando}
                  onChange={(e) => { setCodigo(e.target.value); setErrorCodigo(""); }}
                  placeholder="ej: 420101"
                />
                {errorCodigo && <span className={base.errorMsg}>{errorCodigo}</span>}
              </div>
              <div className={base.formGroup}>
                <label className={base.formLabel} htmlFor="cod-categoria">Categoría</label>
                <select
                  id="cod-categoria"
                  className={base.formSelect}
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  <option value="">— Sin especificar —</option>
                  <option value="Consulta">Consulta</option>
                  <option value="Practica">Práctica</option>
                  <option value="Honorarios individuales">Honorarios individuales</option>
                </select>
              </div>
              <div className={base.formGroup}>
                <label className={base.formLabel} htmlFor="cod-complejidad">Complejidad</label>
                <select
                  id="cod-complejidad"
                  className={base.formSelect}
                  value={complejidad}
                  onChange={(e) => setComplejidad(e.target.value as Complejidad | "")}
                >
                  <option value="">— Sin especificar —</option>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>
            <div className={base.formGroup}>
              <label className={base.formLabel} htmlFor="cod-desc">Descripción por defecto (opcional)</label>
              <input
                id="cod-desc"
                className={base.formInput}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Se ofrece al cargar este código en una obra social nueva"
              />
            </div>
            <div className={base.formGroup}>
              <label className={base.formLabel} htmlFor="cod-obs">Observación</label>
              <textarea
                id="cod-obs"
                className={base.formTextarea}
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Observaciones opcionales…"
              />
            </div>
          </section>

          {/* 2 · Especialidades sugeridas */}
          <section className={`${base.body} ${styles.section}`}>
            <h2 className={styles.sectionHeading}>2 · Especialidades sugeridas</h2>
            <label className={styles.checkLine}>
              <input
                type="checkbox"
                checked={sinRestriccion}
                onChange={(e) => setSinRestriccion(e.target.checked)}
              />
              Sin restricción por especialidad
            </label>
            {sinRestriccion ? (
              <p className={styles.sinRestriccionInfo}>
                Cualquier especialidad puede facturar este código. No se eligen especialidades.
              </p>
            ) : (
              <MultiSelectBuscable
                options={espOptions}
                selected={espSel}
                onChange={setEspSel}
                noun="especialidades"
                loading={espQuery.isLoading}
              />
            )}
          </section>

          {/* 3 · Aplicar a obras sociales */}
          <section className={`${base.body} ${styles.section}`}>
            <h2 className={styles.sectionHeading}>3 · Aplicar a obras sociales</h2>
            <p className={base.hintText}>
              Opcional. En cada obra social elegida se crea una variante por especialidad, con el
              precio y la vigencia de la primera variante que ya tiene este código. Las obras
              sociales que no tienen el código se omiten.
            </p>
            {puedeAplicar ? (
              <MultiSelectBuscable
                options={osOptions}
                selected={osSel}
                onChange={setOsSel}
                noun="obras sociales"
                loading={osQuery.isLoading}
              />
            ) : (
              <p className={styles.sinRestriccionInfo}>
                No tenés permiso para aplicar especialidades a obras sociales.
              </p>
            )}

            {resultado && <ResultadoAplicar resultado={resultado} osNombre={osNombre} />}

            <div className={styles.actions}>
              <button type="button" className={base.btnGhost} onClick={() => navigate(LISTADO_PATH)}>
                {resultado ? "Volver al listado" : "Cancelar"}
              </button>
              <button
                type="button"
                className={base.btnGhost}
                onClick={handleGuardarSolo}
                disabled={saving !== null}
              >
                {saving === "solo" ? <><span className={base.spinner} /> Guardando…</> : "Guardar sin aplicar"}
              </button>
              {puedeAplicar && (
                <button
                  type="button"
                  className={base.btnPrimary}
                  onClick={handleGuardarYAplicar}
                  disabled={saving !== null}
                >
                  {saving === "aplicar"
                    ? <><span className={base.spinner} /> Aplicando…</>
                    : <><Save size={15} /> Guardar y aplicar</>}
                </button>
              )}
            </div>
          </section>

          {/* 4 · Boletín */}
          <Boletin
            codigoInicial={codigo}
            osOptions={osOptions}
            espNombre={espNombre}
            osLoading={osQuery.isLoading}
          />
        </div>
      )}

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

// ─── Resultado de "Guardar y aplicar" ─────────────────────────────────────────

function ResultadoAplicar({
  resultado,
  osNombre,
}: {
  resultado: AplicarEspecialidadesResult;
  osNombre: Map<number, string>;
}) {
  const { aplicadas, omitidas } = resultado;
  const nombre = (nro: number) => osNombre.get(nro) ?? `Obra social ${nro}`;

  if (omitidas.length === 0) {
    return (
      <div className={`${styles.result} ${styles.resultOk}`} role="status">
        <strong>Se aplicó a las {aplicadas.length} obras sociales seleccionadas.</strong>
      </div>
    );
  }
  return (
    <div className={`${styles.result} ${styles.resultWarn}`} role="status">
      <strong>
        {aplicadas.length > 0
          ? `Se pudo modificar ${aplicadas.length} obras sociales excepto:`
          : "No se pudo modificar ninguna obra social:"}
      </strong>
      <ul>
        {omitidas.map((o) => (
          <li key={o.obra_social_nro}>
            {nombre(o.obra_social_nro)}: <span className={styles.motivo}>{o.motivo}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Boletín (solo lectura) ───────────────────────────────────────────────────

function Boletin({
  codigoInicial,
  osOptions,
  espNombre,
  osLoading,
}: {
  codigoInicial: string;
  osOptions: { value: number; label: string; hint?: string }[];
  espNombre: Map<number, string>;
  osLoading: boolean;
}) {
  const [codigo, setCodigo] = useState(codigoInicial);
  const [os, setOs] = useState<number | "">("");
  const [valores, setValores] = useState<ValorOut[] | null>(null);
  const [cargando, setCargando] = useState(false);

  // El código del formulario llega asíncrono en edición: lo copia mientras no se haya tocado.
  useEffect(() => {
    setCodigo((prev) => (prev === "" ? codigoInicial : prev));
  }, [codigoInicial]);

  useEffect(() => {
    const c = codigo.trim();
    if (!c || os === "") {
      setValores(null);
      return;
    }
    let vivo = true;
    setCargando(true);
    const t = setTimeout(() => {
      listValores({ obra_social_nro: os, codigo: c, estado: "activo", size: 200 })
        .then((v) => vivo && setValores(v))
        .catch(() => vivo && setValores([]))
        .finally(() => vivo && setCargando(false));
    }, 350);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [codigo, os]);

  return (
    <section className={`${base.body} ${styles.section}`}>
      <h2 className={styles.sectionHeading}>4 · Boletín</h2>
      <div className={styles.filters}>
        <div className={base.formGroup}>
          <label className={base.formLabel} htmlFor="bol-codigo">Código</label>
          <input
            id="bol-codigo"
            className={base.formInput}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="ej: 420101"
          />
        </div>
        <div className={base.formGroup}>
          <label className={base.formLabel} htmlFor="bol-os">Obra social</label>
          <AppSearchSelect
            options={osOptions.map((o) => ({ id: o.value, label: `${o.value} · ${o.label}` }))}
            value={os === "" ? null : os}
            loading={osLoading}
            disabled={osLoading}
            onChange={(v) => setOs(v == null ? "" : Number(v))}
          />
        </div>
      </div>

      <div className={base.tableWrap}>
        <table className={base.table}>
          <thead>
            <tr>
              <th>Origen</th>
              <th>Especialidad</th>
              <th className={styles.num}>Honorarios</th>
              <th className={styles.num}>Gastos</th>
              <th className={styles.num}>Ayudante</th>
              <th className={styles.num}>Total</th>
              <th>Vigencia desde</th>
            </tr>
          </thead>
          <tbody>
            {valores === null ? (
              <tr><td colSpan={7} className={base.emptyCell}>Elegí un código y una obra social para consultar.</td></tr>
            ) : cargando ? (
              <tr><td colSpan={7} className={base.loadingCell}>Cargando…</td></tr>
            ) : valores.length === 0 ? (
              <tr><td colSpan={7} className={base.emptyCell}>Esa obra social no tiene cargado el código.</td></tr>
            ) : valores.map((v) => {
              const h = montoDe(v, "Honorarios");
              const g = montoDe(v, "Gastos");
              const a = montoDe(v, "Ayudante");
              return (
                <tr key={v.id}>
                  <td><span className={base.badge}>{v.origen}</span></td>
                  <td>
                    {v.especialidad_id_colegio != null
                      ? (espNombre.get(v.especialidad_id_colegio) ?? v.especialidad_id_colegio)
                      : "—"}
                  </td>
                  <td className={styles.num}>{moneda.format(h)}</td>
                  <td className={styles.num}>{moneda.format(g)}</td>
                  <td className={styles.num}>{moneda.format(a)}</td>
                  <td className={styles.num}>{moneda.format(h + g + a)}</td>
                  <td>{v.vigencia_desde}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Modal from "@/app/components/ui/Modal/Modal";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import base from "../NomencladorCodigos/NomencladorCodigos.module.scss";
import styles from "./aplicarNivelado.module.scss";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import { aplicarNivelado } from "../nomenclador.api";
import { today, parseMonto } from "../nomenclador.helpers";
import type { AplicarNiveladoOut, EstadoAplicarNivelado } from "../nomenclador.types";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

const ESTADOS: Record<EstadoAplicarNivelado, string> = {
  crear: "Se crea",
  creado: "Creado",
  ya_tiene_precio: "Ya tiene precio",
  sin_quien_factura: "Sin quién factura",
  suspendido: "Suspendido",
  omitido: "Omitido",
};

/** El motivo del servidor: texto, o `{mensaje}` en los 409 de este endpoint. */
function motivoError(e: unknown, fallback: string): string {
  const d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (d && typeof d === "object" && typeof (d as { mensaje?: unknown }).mensaje === "string") {
    return (d as { mensaje: string }).mensaje;
  }
  return fallback;
}

/**
 * Aplica un nomenclador nivelado a una obra social: da de alta sus códigos y les
 * crea precio con el galeno del nivel. Primero muestra qué haría ("Ver cambios");
 * lo que ya tiene precio en la obra social no se toca.
 */
export default function AplicarNiveladoModal({
  isOpen,
  slug,
  nombre,
  obraSocialNro = null,
  vigenciaInicial,
  onClose,
  onAplicado,
}: {
  isOpen: boolean;
  slug: string;
  nombre: string;
  /** Si viene, la obra social queda fija (desde Galenos). */
  obraSocialNro?: number | null;
  vigenciaInicial?: string;
  onClose: () => void;
  onAplicado?: (r: AplicarNiveladoOut) => void;
}) {
  const [os, setOs] = useState<number | null>(obraSocialNro);
  const [vigencia, setVigencia] = useState(vigenciaInicial ?? today());
  const [preview, setPreview] = useState<AplicarNiveladoOut | null>(null);
  const [hecho, setHecho] = useState<AplicarNiveladoOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState<null | "preview" | "aplicar">(null);
  const [soloCrear, setSoloCrear] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setOs(obraSocialNro);
    setVigencia(vigenciaInicial ?? today());
    setPreview(null);
    setHecho(null);
    setError(null);
  }, [isOpen, obraSocialNro, vigenciaInicial]);

  const osQuery = useObrasSociales();
  const osOptions = useMemo(
    () =>
      (osQuery.data ?? [])
        .map((o) => ({ id: o.nro_obra_social, label: `${o.nro_obra_social} · ${o.nombre}` }))
        .sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true })),
    [osQuery.data],
  );
  const osNombre = osOptions.find((o) => o.id === os)?.label.split(" · ")[1] ?? "la obra social";

  async function correr(dry: boolean) {
    if (os == null || !vigencia) return;
    setTrabajando(dry ? "preview" : "aplicar");
    setError(null);
    try {
      const r = await aplicarNivelado(slug, { obra_social_nro: os, vigencia_desde: vigencia, dry_run: dry });
      if (dry) setPreview(r);
      else {
        setHecho(r);
        onAplicado?.(r);
      }
    } catch (e) {
      setPreview(null);
      setError(motivoError(e, "No se pudo calcular."));
    } finally {
      setTrabajando(null);
    }
  }

  const resultado = hecho ?? preview;
  const filas = (resultado?.filas ?? []).filter(
    (f) => !soloCrear || f.estado === "crear" || f.estado === "creado" || f.estado === "sin_quien_factura",
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Aplicar ${nombre}`} size="large">
      <div className={styles.cuerpo}>
        <p className={base.hintText}>
          Da de alta los códigos del nomenclador en la obra social y les crea precio con el galeno del
          nivel de cada uno, una vez por cada especialidad que lo factura. Lo que ya tiene precio no se toca.
        </p>
        <div className={styles.controles}>
          <div className={base.formGroup}>
            <label className={base.formLabel}>Obra social</label>
            {obraSocialNro != null ? (
              <strong className={styles.osFija}>{osOptions.find((o) => o.id === os)?.label ?? os}</strong>
            ) : (
              <AppSearchSelect
                options={osOptions}
                value={os}
                loading={osQuery.isLoading}
                disabled={!!hecho}
                onChange={(v) => { setOs(v == null ? null : Number(v)); setPreview(null); setError(null); }}
              />
            )}
          </div>
          <div className={base.formGroup}>
            <label className={base.formLabel} htmlFor="apl-vig">Vigente desde</label>
            <input
              id="apl-vig"
              type="date"
              className={base.formInput}
              value={vigencia}
              disabled={!!hecho}
              onChange={(e) => { setVigencia(e.target.value); setPreview(null); }}
            />
          </div>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            <span>{error}</span>
            {error.includes("Galenos") && <Link to="/panel/nomenclador/galenos">Ir a Galenos</Link>}
          </div>
        )}

        {resultado && (
          <>
            {hecho && (
              <div className={styles.ok} role="status">
                Listo: {hecho.resumen.crear} código{hecho.resumen.crear === 1 ? "" : "s"} con precio
                ({hecho.resumen.precios} precio{hecho.resumen.precios === 1 ? "" : "s"}) en {osNombre}.
              </div>
            )}
            <div className={styles.resumen}>
              <span className={styles.chipCrear}><strong>{resultado.resumen.crear}</strong> {hecho ? "creados" : "se crean"}</span>
              <span className={styles.chip}><strong>{resultado.resumen.precios}</strong> precios</span>
              <span className={styles.chip}><strong>{resultado.resumen.ya_tiene_precio}</strong> ya tienen precio</span>
              {resultado.resumen.sin_quien_factura > 0 && (
                <span className={styles.chipAviso}><strong>{resultado.resumen.sin_quien_factura}</strong> sin quién factura</span>
              )}
              {resultado.resumen.suspendido + resultado.resumen.omitido > 0 && (
                <span className={styles.chip}><strong>{resultado.resumen.suspendido + resultado.resumen.omitido}</strong> suspendidos u omitidos</span>
              )}
            </div>
            {resultado.resumen.sin_quien_factura > 0 && (
              <p className={base.hintText}>
                Los que no tienen quién factura se dan de alta sin precio: cargales la plantilla en la Ficha del código y volvé a aplicar.
              </p>
            )}
            <label className={styles.check}>
              <input type="checkbox" checked={soloCrear} onChange={(e) => setSoloCrear(e.target.checked)} />
              Ver sólo los que cambian
            </label>
            <div className={base.tableWrap}>
              <table className={base.table}>
                <thead>
                  <tr><th>Código</th><th>Descripción</th><th>Nivel</th><th>Estado</th><th className={styles.num}>Precio</th></tr>
                </thead>
                <tbody>
                  {filas.length === 0 ? (
                    <tr><td colSpan={5} className={base.emptyCell}>Nada que mostrar.</td></tr>
                  ) : filas.map((f) => (
                    <tr key={f.nomenclador_id}>
                      <td className={styles.codigo}>{f.codigo}</td>
                      <td className={styles.desc}>{f.descripcion ?? "—"}</td>
                      <td>{f.nivel != null ? `Nivel ${f.nivel}` : `${Number(f.unidades)} unidades`}</td>
                      <td>
                        <span className={`${styles.estado} ${styles[`estado_${f.estado}`] ?? ""}`}>{ESTADOS[f.estado]}</span>
                        {f.precios > 1 && <span className={base.hintText}> · {f.precios} especialidades</span>}
                      </td>
                      <td className={styles.num}>{f.precio != null ? fmt.format(parseMonto(f.precio)) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className={styles.pie}>
          <button type="button" className={base.btnGhost} onClick={onClose}>
            {hecho ? "Cerrar" : "Cancelar"}
          </button>
          {!hecho && (
            <>
              <button
                type="button"
                className={base.btnGhost}
                disabled={os == null || !vigencia || trabajando !== null}
                onClick={() => void correr(true)}
              >
                {trabajando === "preview" ? "Calculando…" : "Ver cambios"}
              </button>
              <button
                type="button"
                className={base.btnPrimary}
                disabled={!preview || preview.resumen.crear + preview.resumen.sin_quien_factura === 0 || trabajando !== null}
                onClick={() => void correr(false)}
              >
                {trabajando === "aplicar" ? "Aplicando…" : `Aplicar en ${osNombre}`}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

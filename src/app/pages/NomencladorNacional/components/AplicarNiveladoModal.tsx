import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import Modal from "@/app/components/ui/Modal/Modal";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import base from "../NomencladorCodigos/NomencladorCodigos.module.scss";
import styles from "./aplicarNivelado.module.scss";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import { aplicarNivelado, getEscalaNivelado, getEstadoOsNivelado } from "../nomenclador.api";
import { today, parseMonto } from "../nomenclador.helpers";
import type { AplicarNiveladoAjuste, AplicarNiveladoGaleno, AplicarNiveladoOut, EstadoAplicarNivelado } from "../nomenclador.types";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { motivoError } from "@/app/pages/NomencladorNacional/utiles";
import { formatoNumero2, formatoPesos } from "@/app/shared/lib/formatos";

const aNumero = (v: string): number | null => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

type Ajuste = { uh: string; ua: string };


const ESTADOS: Record<EstadoAplicarNivelado, string> = {
  crear: "Se crea",
  creado: "Creado",
  reemplazar: "Se reemplaza",
  reemplazado: "Reemplazado",
  sin_quien_factura: "Sin quién factura",
  fuera_de_especialidad: "Fuera de especialidad",
  suspendido: "Suspendido",
  omitido: "Omitido",
};
/** Aplica un nomenclador nivelado a una obra social: da de alta sus códigos y les crea precio con el galeno del nivel. */
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

  // Galeno de la obra social (cuando falta o cambia de nomenclador).
  const [modo, setModo] = useState<"calculado" | "por_nivel">("calculado");
  const [valorUnitario, setValorUnitario] = useState("");
  const [precios, setPrecios] = useState<Record<number, string>>({});
  const [ajustes, setAjustes] = useState<Record<number, Ajuste>>({});
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setOs(obraSocialNro);
    setVigencia(vigenciaInicial ?? today());
    setPreview(null);
    setHecho(null);
    setError(null);
    setModo("calculado");
    setValorUnitario("");
    setPrecios({});
    setAjustes({});
    setAjustesAbiertos(false);
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

  const estadoQuery = useQuery({
    queryKey: ["nivelado-estado-os", slug, os],
    queryFn: () => getEstadoOsNivelado(slug, os as number),
    enabled: isOpen && os != null && !hecho,
    staleTime: 0,
  });
  const escalaQuery = useQuery({
    queryKey: ["nivelado-escala", slug],
    queryFn: () => getEscalaNivelado(slug),
    enabled: isOpen,
    staleTime: 60_000,
  });
  const estado = estadoQuery.data ?? null;
  const escala = useMemo(() => new Map((escalaQuery.data?.niveles ?? []).map((n) => [n.nivel, n])), [escalaQuery.data]);
  const niveles = estado?.niveles_nomenclador ?? escalaQuery.data?.niveles.length ?? 0;
  const necesitaGaleno = estado != null && estado.galeno_estado !== "ok";
  const cambio = estado?.galeno_estado === "otros_niveles" ? estado.cambio : null;

  const ajustesPayload = useMemo<AplicarNiveladoAjuste[]>(
    () =>
      Object.entries(ajustes)
        .map(([nivel, a]) => ({
          nivel: Number(nivel),
          unidades_honorarios: aNumero(a.uh),
          unidades_ayudante: aNumero(a.ua),
        }))
        .filter((a) => a.unidades_honorarios != null || a.unidades_ayudante != null),
    [ajustes],
  );

  const galenoPayload = useMemo<AplicarNiveladoGaleno | null>(() => {
    if (estado == null) return null;
    if (!necesitaGaleno) return ajustesPayload.length ? { precio_por_nivel: false, ajustes: ajustesPayload } : null;
    if (modo === "por_nivel") {
      const p: Record<number, number> = {};
      for (let n = 1; n <= niveles; n++) {
        const v = aNumero(precios[n] ?? "");
        if (v != null && v > 0) p[n] = v;
      }
      return { precio_por_nivel: true, precios_por_nivel: p };
    }
    return { precio_por_nivel: false, valor_unitario: aNumero(valorUnitario), ajustes: ajustesPayload };
  }, [estado, necesitaGaleno, modo, niveles, precios, valorUnitario, ajustesPayload]);

  const galenoValido = !necesitaGaleno
    || (galenoPayload != null && (modo === "por_nivel"
      ? Object.keys(galenoPayload.precios_por_nivel ?? {}).length === niveles && niveles > 0
      : (galenoPayload.valor_unitario ?? 0) > 0));

  function cambiaronDatos() {
    setPreview(null);
    setError(null);
  }

  async function correr(dry: boolean) {
    if (os == null || !vigencia) return;
    setTrabajando(dry ? "preview" : "aplicar");
    setError(null);
    try {
      const r = await aplicarNivelado(slug, {
        obra_social_nro: os, vigencia_desde: vigencia, dry_run: dry, galeno: galenoPayload,
      });
      if (dry) setPreview(r);
      else {
        setHecho(r);
        onAplicado?.(r);
      }
    } catch (e) {
      setPreview(null);
      setError(motivoError(e, dry ? "No se pudo calcular." : "No se pudo aplicar. Revisá en Precios por obra social si se cargó antes de reintentar."));
    } finally {
      setTrabajando(null);
    }
  }

  const resultado = hecho ?? preview;
  const filas = (resultado?.filas ?? []).filter(
    (f) => !soloCrear || f.estado !== "suspendido" && f.estado !== "omitido" && f.estado !== "fuera_de_especialidad",
  );
  const resumenCambio = resultado?.cambio ?? cambio;
  const hayQueAplicar = preview != null
    && preview.resumen.crear + preview.resumen.reemplazar + preview.resumen.sin_quien_factura > 0;

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
                onChange={(v) => { setOs(v == null ? null : Number(v)); cambiaronDatos(); }}
              />
            )}
          </div>
          <div className={base.formGroup}>
            <label className={base.formLabel} htmlFor="apl-vig">Vigente desde</label>
            <CampoFecha
              value={vigencia}
              onChange={(valor) => { setVigencia(valor); setPreview(null); }}
              id="apl-vig"
              disabled={!!hecho}
            />
          </div>
        </div>

        {/* Cambio de nomenclador: la obra social tiene el galeno de otra cantidad de niveles. */}
        {!hecho && estado?.galeno_estado === "otros_niveles" && (
          <div className={styles.avisoCambio} role="alert">
            <strong>
              {cambio
                ? <>Esta obra social hoy usa {cambio.desde_nombre}</>
                : <>Esta obra social tiene el galeno de {estado.niveles_os} niveles y este nomenclador es de {niveles}</>}
            </strong>
            {cambio ? (
              <p>
                Si continuás, <strong>todos los valores del nomenclador {cambio.desde_nombre} de {osNombre} se
                eliminan</strong> ({cambio.valores_eliminados} valor{cambio.valores_eliminados === 1 ? "" : "es"}: se
                cierran el día anterior a la vigencia nueva) y <strong>se crean con {nombre}</strong>. También se
                reemplaza el galeno de {cambio.niveles_desde} por el de {niveles} niveles.
              </p>
            ) : (
              <p>No hay un nomenclador de {estado.niveles_os} niveles con el mismo galeno: cargalo en Galenos.</p>
            )}
            {cambio && (
              <div className={styles.cifras}>
                <span><strong>{cambio.valores_eliminados}</strong> valores a eliminar</span>
                {cambio.codigos_sin_reemplazo > 0 && (
                  <span><strong>{cambio.codigos_sin_reemplazo}</strong> códigos de {cambio.desde_nombre} no están en {nombre}: quedan sin precio</span>
                )}
                <span><strong>{cambio.valores_a_crear}</strong> códigos a crear</span>
              </div>
            )}
          </div>
        )}

        {/* Galeno de la obra social: hay que cargarlo (falta o cambia de nomenclador). */}
        {!hecho && necesitaGaleno && (cambio || estado?.galeno_estado === "falta") && (
          <fieldset className={styles.galeno}>
            <legend>{estado?.galeno_estado === "falta" ? "Galeno de la obra social" : `Galeno de ${niveles} niveles`}</legend>
            <div className={styles.modos} role="radiogroup" aria-label="Cómo se calcula el galeno">
              <label className={`${styles.modo} ${modo === "calculado" ? styles.modoActivo : ""}`}>
                <input type="radio" name="apl-modo" checked={modo === "calculado"} onChange={() => { setModo("calculado"); cambiaronDatos(); }} />
                Calculado (unidades × valor unitario)
              </label>
              <label className={`${styles.modo} ${modo === "por_nivel" ? styles.modoActivo : ""}`}>
                <input type="radio" name="apl-modo" checked={modo === "por_nivel"} onChange={() => { setModo("por_nivel"); cambiaronDatos(); }} />
                Precio fijo por nivel
              </label>
            </div>
            {modo === "calculado" ? (
              <div className={base.formGroup}>
                <label className={base.formLabel} htmlFor="apl-vu">Valor unitario del galeno *</label>
                <input
                  id="apl-vu"
                  type="number"
                  min="0"
                  step="0.01"
                  className={base.formInput}
                  value={valorUnitario}
                  onChange={(e) => { setValorUnitario(e.target.value); cambiaronDatos(); }}
                  placeholder="$ 0,00"
                />
                {cambio ? (
                  <span className={base.hintText}>
                    Obligatorio: las unidades por nivel de {nombre} son distintas a las de {cambio.desde_nombre}, así que el valor del galeno actual no sirve.
                  </span>
                ) : (
                  <span className={base.hintText}>Se multiplica por las unidades de cada nivel (escala del nomenclador).</span>
                )}
              </div>
            ) : (
              <div className={styles.gridNiveles}>
                <p className={base.hintText}>
                  Cada nivel es un precio y se factura como 1 unidad de honorarios; el ayudante es el 25 % de ese precio.
                </p>
                {Array.from({ length: niveles }, (_, i) => i + 1).map((n) => (
                  <label key={n} className={styles.filaNivel}>
                    <span>Nivel {n}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={base.formInput}
                      value={precios[n] ?? ""}
                      onChange={(e) => { setPrecios((p) => ({ ...p, [n]: e.target.value })); cambiaronDatos(); }}
                      placeholder="$ 0,00"
                      aria-label={`Precio del nivel ${n}`}
                    />
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        )}

        {/* Galeno ya cargado en los niveles del nomenclador. */}
        {!hecho && estado?.galeno_estado === "ok" && (
          <div className={styles.galenoOk}>
            <strong>
              {estado.precio_por_nivel ? "Precio fijo por nivel" : "Calculado"} · galeno de {niveles} niveles ya cargado
            </strong>
            <div className={styles.chips}>
              {estado.niveles.map((n) => (
                <span key={n.nivel} className={`${styles.chip} ${n.ajustado ? styles.chipAviso : ""}`}>
                  Nivel {n.nivel}: {formatoPesos.format(parseMonto(n.valor_unitario))}
                  {n.ajustado && " · ajustado"}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Ajustes de unidades por nivel, sólo de esta obra social. */}
        {!hecho && estado != null && modo === "calculado" && (estado.galeno_estado !== "otros_niveles" || cambio) && niveles > 0 && (
          <div className={styles.ajustes}>
            <button type="button" className={styles.ajustesTitulo} onClick={() => setAjustesAbiertos((a) => !a)} aria-expanded={ajustesAbiertos}>
              <strong>Ajustar unidades para esta obra social</strong>
              <span>{ajustesAbiertos ? "Ocultar ▴" : "Mostrar ▾"}</span>
            </button>
            {ajustesAbiertos ? (
              <div className={styles.ajustesCuerpo}>
                <p className={base.hintText}>
                  Por defecto usa la escala del nomenclador (ayudante al 25 %). Completá sólo los niveles que esta obra social
                  pactó distinto; los ajustados quedan marcados. Vacío = escala.
                </p>
                <div className={styles.ajustesGrid}>
                  <span className={styles.ajustesHead}>Nivel</span>
                  <span className={styles.ajustesHead}>Unid. honorarios</span>
                  <span className={styles.ajustesHead}>Unid. ayudante</span>
                  {Array.from({ length: niveles }, (_, i) => i + 1).map((n) => {
                    const esc = escala.get(n);
                    const a = ajustes[n] ?? { uh: "", ua: "" };
                    const escH = esc ? Number(esc.unidades_honorarios) : null;
                    const escA = esc ? (esc.unidades_ayudante != null ? Number(esc.unidades_ayudante) : (escH ?? 0) * 0.25) : null;
                    return (
                      <div key={n} className={styles.ajustesFila}>
                        <span>Nivel {n}</span>
                        <input
                          type="number" min="0" step="0.01" className={base.formInput}
                          value={a.uh} aria-label={`Unidades de honorarios del nivel ${n}`}
                          placeholder={escH != null ? formatoNumero2.format(escH) : ""}
                          onChange={(e) => { setAjustes((p) => ({ ...p, [n]: { ...a, uh: e.target.value } })); cambiaronDatos(); }}
                        />
                        <input
                          type="number" min="0" step="0.01" className={base.formInput}
                          value={a.ua} aria-label={`Unidades de ayudante del nivel ${n}`}
                          placeholder={escA != null ? formatoNumero2.format(escA) : ""}
                          onChange={(e) => { setAjustes((p) => ({ ...p, [n]: { ...a, ua: e.target.value } })); cambiaronDatos(); }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : ajustesPayload.length > 0 ? (
              <span className={base.hintText}>{ajustesPayload.length} nivel{ajustesPayload.length === 1 ? "" : "es"} ajustado{ajustesPayload.length === 1 ? "" : "s"}.</span>
            ) : null}
          </div>
        )}

        {estadoQuery.isError && (
          <div className={styles.error} role="alert">
            <span>{motivoError(estadoQuery.error, "No se pudo consultar la obra social.")}</span>
          </div>
        )}

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
                Listo: {hecho.resumen.crear + hecho.resumen.reemplazar} código{hecho.resumen.crear + hecho.resumen.reemplazar === 1 ? "" : "s"} con precio
                ({hecho.resumen.precios} precio{hecho.resumen.precios === 1 ? "" : "s"}) en {osNombre}.
                {hecho.galeno_creado && " Se cargó el galeno de la obra social."}
                {hecho.cambio && ` Se eliminaron ${hecho.cambio.valores_eliminados} valores de ${hecho.cambio.desde_nombre}.`}
              </div>
            )}
            <div className={styles.resumen}>
              <span className={styles.chipCrear}><strong>{resultado.resumen.crear}</strong> {hecho ? "creados" : "se crean"}</span>
              <span className={styles.chip}><strong>{resultado.resumen.precios}</strong> precios</span>
              {resultado.resumen.reemplazar > 0 && (
                <span className={styles.chip}><strong>{resultado.resumen.reemplazar}</strong> {hecho ? "reemplazados" : "se reemplazan"}</span>
              )}
              {resumenCambio && (
                <span className={styles.chipAviso}><strong>{resumenCambio.valores_eliminados}</strong> {hecho ? "valores eliminados" : "valores se eliminan"} de {resumenCambio.desde_nombre}</span>
              )}
              {resultado.resumen.vigencias_borradas > 0 && (
                <span className={styles.chipAviso}><strong>{resultado.resumen.vigencias_borradas}</strong> vigencias {hecho ? "borradas" : "se borran"}</span>
              )}
              {resultado.resumen.sin_quien_factura > 0 && (
                <span className={styles.chipAviso}><strong>{resultado.resumen.sin_quien_factura}</strong> sin quién factura</span>
              )}
              {resultado.resumen.fuera_de_especialidad > 0 && (
                <span className={styles.chip}><strong>{resultado.resumen.fuera_de_especialidad}</strong> fuera de especialidad</span>
              )}
              {resultado.resumen.suspendido + resultado.resumen.omitido > 0 && (
                <span className={styles.chip}><strong>{resultado.resumen.suspendido + resultado.resumen.omitido}</strong> suspendidos u omitidos</span>
              )}
            </div>
            {resultado.resumen.vigencias_borradas > 0 && !hecho && (
              <p className={base.hintText}>
                Hay códigos con vigencias desde el {vigencia.split("-").reverse().join("/")} en adelante: se eliminan de la base y esta queda como la última. Con la misma fecha, se actualiza.
              </p>
            )}
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
              <Tabla className={base.table}>
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
                        {f.vigencias_borradas > 0 && <span className={base.hintText}> · borra {f.vigencias_borradas} vigencia{f.vigencias_borradas === 1 ? "" : "s"}</span>}
                      </td>
                      <td className={styles.num}>{f.precio != null ? formatoPesos.format(parseMonto(f.precio)) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            </div>
          </>
        )}

        <div className={styles.pie}>
          {!hecho && <span className={`${base.hintText} ${styles.pieNota}`}>Todo o nada: si algo falla, no se guarda ningún cambio.</span>}
          <button type="button" className={base.btnGhost} onClick={onClose}>
            {hecho ? "Cerrar" : "Cancelar"}
          </button>
          {!hecho && (
            <>
              <button
                type="button"
                className={base.btnGhost}
                disabled={os == null || !vigencia || trabajando !== null || estadoQuery.isLoading || !galenoValido}
                onClick={() => void correr(true)}
              >
                {trabajando === "preview" ? "Calculando…" : "Ver cambios"}
              </button>
              <button
                type="button"
                className={cambio ? styles.btnPeligro : base.btnPrimary}
                disabled={!hayQueAplicar || trabajando !== null}
                onClick={() => void correr(false)}
              >
                {trabajando === "aplicar"
                  ? "Aplicando…"
                  : cambio
                    ? `Eliminar valores de ${cambio.desde_nombre} y crear los de ${nombre}`
                    : `Aplicar en ${osNombre}`}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

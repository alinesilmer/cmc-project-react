import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Save,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import { moneda, periodoLegible } from "@/app/pages/Importaciones/formato";
import r from "@/app/pages/Validaciones/components/reporte/reporte.module.scss";
import { saveAs } from "@/app/shared/lib/fileSaver";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";

import ObraSocialAutocomplete from "../components/ObraSocialAutocomplete";
import type { ObraSocialOption } from "../types";
import {
  confirmarPlanilla,
  descargarPlantilla,
  fetchLote,
  fetchPeriodosPlanilla,
  pedirCancelacion,
  previsualizarPlanilla,
} from "./importarPrestaciones.api";
import type { Decision, FilaPlanilla, PeriodoOpcion, PlanillaOut } from "./importarPrestaciones.api";
import ModalImportacion from "./ModalImportacion";
import type { EstadoModal } from "./ModalImportacion";
import { leerPlanilla } from "./planilla.parser";
import TablaPrestaciones from "./TablaPrestaciones";
import s from "./ImportarPrestaciones.module.scss";

/**
 * Importar prestaciones desde una planilla Excel del Colegio.
 *
 * Mismo circuito que las importaciones de UNNE, Swiss y Prevención —subir, previsualizar
 * fila por fila, confirmar—, con tres diferencias:
 *
 *  * La obra social y el período se eligen acá, no vienen en la planilla.
 *  * Cada fila se valida con las mismas reglas que la carga manual, y un equipo
 *    (cirujano + ayudantes + pediatra) entra entero o no entra.
 *  * Confirmar es todo o nada, con avance y botón de cancelar. El backend hace un único
 *    commit al final; cancelar antes de ese punto no deja nada cargado.
 */

type Filtro = "todas" | "problemas" | "avisos" | "equipos";

/** Identifica la importación: el servidor la usa para el avance y para cancelar. */
const nuevoLote = (): string =>
  Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

/** AAAAMM → MM/AAAA. */
const aTexto = (p: string) => (p.length === 6 ? `${p.slice(4)}/${p.slice(0, 4)}` : "");

/** Deja sólo los números y arma MM/AAAA mientras se escribe (la barra se agrega sola). */
const mascaraPeriodo = (crudo: string) => {
  const d = crudo.replace(/\D/g, "").slice(0, 6);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

/** MM/AAAA válido → AAAAMM; si no, "". */
const aPeriodo = (texto: string) => {
  const m = texto.match(/^(0[1-9]|1[0-2])\/(20\d{2}|2[1-9]\d{2})$/);
  return m ? `${m[2]}${m[1]}` : "";
};

const entra = (resultado: string) => resultado === "grabable" || resultado === "grabada";

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

export default function ImportarPrestaciones() {
  // ── Destino ──
  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  const [periodos, setPeriodos] = useState<PeriodoOpcion[]>([]);
  const [periodo, setPeriodo] = useState(""); // AAAAMM, "" mientras el texto no sea un período válido
  const [periodoTexto, setPeriodoTexto] = useState(""); // lo que se ve en el campo: MM/AAAA
  const [sugerido, setSugerido] = useState("");
  const [minimo, setMinimo] = useState<string | null>(null);
  const [errorPeriodos, setErrorPeriodos] = useState("");
  /** Cambia el período desde afuera del campo (sugerido, cambio de obra social): actualiza ambos. */
  const fijarPeriodo = (p: string) => {
    setPeriodo(p);
    setPeriodoTexto(aTexto(p));
  };
  const numeroOS = obraSocial?.nro_obra_social ?? null;

  // ── Archivo ──
  const [archivo, setArchivo] = useState<{ nombre: string; filas: FilaPlanilla[] } | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState("");
  const entrada = useRef<HTMLInputElement>(null);

  // ── Previsualización ──
  const [salida, setSalida] = useState<PlanillaOut | null>(null);
  const [previsualizando, setPrevisualizando] = useState(false);
  const [errorPrevia, setErrorPrevia] = useState("");
  const [decisiones, setDecisiones] = useState<Record<number, Decision>>({});
  const [decisionesVistas, setDecisionesVistas] = useState("{}");
  const decisionesRef = useRef(decisiones);
  decisionesRef.current = decisiones;
  const peticion = useRef(0);
  /** Descarta lo que haya quedado en vuelo: una respuesta que llega tarde no pisa a la nueva. */
  const descartarEnVuelo = useCallback(() => {
    peticion.current += 1;
  }, []);

  // ── Vista ──
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busqueda, setBusqueda] = useState("");

  // ── Confirmación ──
  const [modal, setModal] = useState<EstadoModal | null>(null);
  const [confirmado, setConfirmado] = useState<PlanillaOut | null>(null);
  const lote = useRef("");
  const cancelacionPedida = useRef(false);

  // Períodos de la obra social elegida.
  useEffect(() => {
    setPeriodos([]);
    fijarPeriodo("");
    setSugerido("");
    setMinimo(null);
    setErrorPeriodos("");
    if (numeroOS == null) return;
    let vigente = true;
    fetchPeriodosPlanilla(numeroOS)
      .then((res) => {
        if (!vigente) return;
        setPeriodos(res.periodos);
        setSugerido(res.sugerido);
        setMinimo(res.minimo);
        // Arranca en el sugerido (el período que corresponde cargar); después se puede cambiar a mano.
        const inicial = res.periodos.find((p) => p.periodo === res.sugerido && !p.cerrado) ?? res.periodos.find((p) => !p.cerrado);
        fijarPeriodo(inicial?.periodo ?? "");
      })
      .catch((e) => vigente && setErrorPeriodos(mensajeDeError(e, "No pudimos leer los períodos de esta obra social.")));
    return () => {
      vigente = false;
    };
  }, [numeroOS]);

  // El período se escribe o se elige libremente; acá se avisa lo que el servidor rechazaría igual.
  const errorPeriodo = useMemo(() => {
    if (periodoTexto.length === 7 && !periodo) return "El período tiene que ser un mes entre 01 y 12 y un año válido (MM/AAAA).";
    if (!periodo) return "";
    if (periodos.find((p) => p.periodo === periodo)?.cerrado) {
      return `El período ${periodoLegible(periodo)} está cerrado por el Colegio: elegí otro o cargá un complemento.`;
    }
    if (minimo && periodo < minimo) {
      return `El período ${periodoLegible(periodo)} es anterior al primero disponible (${periodoLegible(minimo)}). Si ya está cerrado, cargá un complemento.`;
    }
    return "";
  }, [periodo, periodoTexto, periodos, minimo]);

  const previsualizar = useCallback(async () => {
    if (!archivo || numeroOS == null || !periodo || errorPeriodo) return;
    const id = ++peticion.current;
    setPrevisualizando(true);
    setErrorPrevia("");
    try {
      const out = await previsualizarPlanilla(numeroOS, periodo, archivo.nombre, archivo.filas, decisionesRef.current);
      if (id !== peticion.current) return; // llegó tarde: ya se pidió otra
      setSalida(out);
      setDecisionesVistas(JSON.stringify(decisionesRef.current));
      // Si algo no entra, se muestra primero: es lo que hay que resolver.
      setFiltro(out.resumen.grabables < out.resumen.total ? "problemas" : "todas");
    } catch (e) {
      if (id !== peticion.current) return;
      setSalida(null);
      setErrorPrevia(mensajeDeError(e, "No pudimos procesar la planilla en este momento."));
    } finally {
      if (id === peticion.current) setPrevisualizando(false);
    }
  }, [archivo, numeroOS, periodo, errorPeriodo]);

  // Subir una planilla, o cambiar de obra social o de período, vuelve a previsualizar.
  useEffect(() => {
    setSalida(null);
    setErrorPrevia("");
    if (archivo && numeroOS != null && periodo && !errorPeriodo) void previsualizar();
    return descartarEnVuelo;
  }, [previsualizar, descartarEnVuelo, archivo, numeroOS, periodo, errorPeriodo]);

  // Mientras se importa, el navegador avisa antes de cerrar la pestaña.
  useEffect(() => {
    if (modal?.tipo !== "importando") return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [modal?.tipo]);

  // ── Archivo ──

  const alElegirArchivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // volver a elegir el mismo archivo tiene que disparar el evento
    if (!file) return;
    setLeyendo(true);
    setErrorArchivo("");
    try {
      const rep = await leerPlanilla(file);
      setDecisiones({});
      setDecisionesVistas("{}");
      setArchivo({ nombre: file.name, filas: rep.filas });
    } catch (err) {
      setErrorArchivo(err instanceof Error ? err.message : "No pudimos leer el archivo.");
    } finally {
      setLeyendo(false);
    }
  };

  const bajarPlantilla = async () => {
    try {
      const { blob, filename } = await descargarPlantilla();
      await saveAs(blob, filename ?? "plantilla_importacion_prestaciones.xlsx");
    } catch (err) {
      setErrorArchivo(mensajeDeError(err, "No pudimos descargar la plantilla."));
    }
  };

  const reiniciar = () => {
    setArchivo(null);
    setSalida(null);
    setConfirmado(null);
    setModal(null);
    setDecisiones({});
    setDecisionesVistas("{}");
    setErrorArchivo("");
    setErrorPrevia("");
    setBusqueda("");
  };

  // ── Decisiones sobre las filas ──

  const elegir = (indice: number, nro: number | null) =>
    setDecisiones((d) => ({ ...d, [indice]: { nroSocioElegido: nro ?? undefined } }));
  const descartar = (indice: number) => setDecisiones((d) => ({ ...d, [indice]: { descartada: true } }));

  const desactualizada = salida !== null && JSON.stringify(decisiones) !== decisionesVistas;

  // ── Confirmar ──

  /** Si la respuesta de «confirmar» no llegó (corte de red), se pregunta al servidor qué pasó. */
  const resolverSinRespuesta = async (previa: PlanillaOut) => {
    for (let i = 0; i < 90; i++) {
      await esperar(1000);
      try {
        const l = await fetchLote(lote.current, previa.resumen.obraSocial, previa.resumen.periodo);
        if (l.estado === "grabada") {
          // Sin la respuesta no tenemos los números de prestación: se muestran las filas previsualizadas.
          setConfirmado({
            resumen: { ...previa.resumen, grabables: l.grabadas, importeTotal: l.importeTotal },
            filas: previa.filas.map((f) => (entra(f.resultado) ? { ...f, resultado: "grabada" as const } : f)),
          });
          setModal({
            tipo: "terminado",
            cancelacionTardia: cancelacionPedida.current,
            resumen: { ...previa.resumen, grabables: l.grabadas, importeTotal: l.importeTotal },
          });
          return;
        }
        if (l.estado === "cancelada") return setModal({ tipo: "cancelado" });
        if (l.estado === "error") {
          return setModal({ tipo: "error", mensaje: "La importación falló y no se cargó nada. Probá de nuevo." });
        }
      } catch {
        /* sigue intentando */
      }
    }
    setModal({
      tipo: "error",
      mensaje:
        "No pudimos confirmar si la importación terminó. Revisá el período en facturación antes de volver a importar.",
    });
  };

  const confirmar = async () => {
    if (!salida || !archivo || numeroOS == null) return;
    const previa = salida;
    lote.current = nuevoLote();
    cancelacionPedida.current = false;
    setModal({ tipo: "importando", fase: "validando", hecho: 0, total: previa.resumen.total, cancelando: false });

    let terminado = false;
    const sondeo = window.setInterval(async () => {
      try {
        const l = await fetchLote(lote.current, numeroOS, previa.resumen.periodo);
        if (terminado || l.estado === "desconocido") return;
        setModal((m) =>
          m?.tipo === "importando" ? { ...m, fase: l.estado, hecho: l.hecho, total: l.total || m.total } : m
        );
      } catch {
        /* el avance es informativo: si una consulta falla, la próxima lo recupera */
      }
    }, 600);

    try {
      const out = await confirmarPlanilla(
        numeroOS, previa.resumen.periodo, archivo.nombre, archivo.filas, decisionesRef.current, lote.current
      );
      terminado = true;
      setConfirmado(out);
      setModal({ tipo: "terminado", resumen: out.resumen, cancelacionTardia: cancelacionPedida.current });
    } catch (e) {
      terminado = true;
      const err = e as { response?: { status?: number } };
      const mensaje = mensajeDeError(e, "");
      if (err.response?.status === 409 && /cancelada/i.test(mensaje)) {
        setModal({ tipo: "cancelado" });
      } else if (!err.response) {
        await resolverSinRespuesta(previa); // sin respuesta: corte de red o tiempo agotado
      } else {
        setModal({ tipo: "error", mensaje: mensaje || "No pudimos importar la planilla en este momento." });
      }
    } finally {
      window.clearInterval(sondeo);
    }
  };

  const cancelar = async () => {
    cancelacionPedida.current = true;
    setModal((m) => (m?.tipo === "importando" ? { ...m, cancelando: true, avisoCancelar: undefined } : m));
    try {
      await pedirCancelacion(lote.current);
    } catch (e) {
      cancelacionPedida.current = false;
      setModal((m) =>
        m?.tipo === "importando"
          ? { ...m, cancelando: false, avisoCancelar: mensajeDeError(e, "No pudimos pedir la cancelación.") }
          : m
      );
    }
    // El desenlace lo trae la respuesta de «confirmar» (409 si frenó a tiempo).
  };

  // ── Datos derivados ──

  const filas = useMemo(() => salida?.filas ?? [], [salida]);
  const conteo = useMemo(
    () => ({
      problemas: filas.filter((f) => !entra(f.resultado)).length,
      avisos: filas.filter((f) => entra(f.resultado) && f.aviso).length,
      equipos: filas.filter((f) => f.equipo).length,
    }),
    [filas]
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((f) => {
      if (filtro === "problemas" && entra(f.resultado)) return false;
      if (filtro === "avisos" && !(entra(f.resultado) && f.aviso)) return false;
      if (filtro === "equipos" && !f.equipo) return false;
      if (!q) return true;
      return [f.medico, String(f.nroSocio ?? ""), f.matricula, f.codigo, f.descripcion, f.afiliado, f.comentarios, f.motivo, f.equipo]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [filas, filtro, busqueda]);

  const grabadas = useMemo(() => (confirmado?.filas ?? []).filter((f) => f.resultado === "grabada"), [confirmado]);

  const x = (confirmado ?? salida)?.resumen;
  const bloqueo = !x
    ? ""
    : x.porElegir > 0
      ? `Queda${x.porElegir === 1 ? "" : "n"} ${x.porElegir} fila${x.porElegir === 1 ? "" : "s"} sin socio: elegí el socio o descartala${x.porElegir === 1 ? "" : "s"}.`
      : desactualizada
        ? "Cambiaste decisiones: previsualizá de nuevo antes de confirmar."
        : "";
  const puedeConfirmar = !!x && x.grabables > 0 && !bloqueo && !previsualizando && !modal;
  const nombreOS = obraSocial ? `${obraSocial.nro_obra_social} · ${obraSocial.nombre}` : "";
  const bloqueado = !!modal || !!confirmado;

  return (
    <div className={r.container}>
      <Link to="/panel/facturacion/periodos" className={r.back}>
        <ArrowLeft size={16} /> Volver a facturación
      </Link>

      <header className={r.header}>
        <FileSpreadsheet size={32} className={r.headerIcon} />
        <div>
          <h1 className={r.title}>Importar prestaciones</h1>
          <p className={r.subtitle}>
            Elegí la obra social y el período, subí la planilla, revisá fila por fila qué entra y confirmá para cargarla en
            facturación.
          </p>
        </div>
      </header>

      <section className={s.destino} aria-label="Destino de la carga">
        <div className={`${s.campo} ${s.ancho}`}>
          <span id="etiqueta-os">Obra social</span>
          <ObraSocialAutocomplete
            value={numeroOS}
            onChange={(_, os) => setObraSocial(os)}
            disabled={bloqueado}
            presetLabel={obraSocial?.nombre}
          />
        </div>
        <label className={s.campo}>
          <span>Período</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="MM/AAAA"
            maxLength={7}
            value={periodoTexto}
            onChange={(e) => {
              const texto = mascaraPeriodo(e.target.value);
              setPeriodoTexto(texto);
              setPeriodo(aPeriodo(texto));
            }}
            disabled={bloqueado || numeroOS == null}
            aria-invalid={!!errorPeriodo}
            aria-describedby="ayuda-periodo"
            className={`${s.entradaPeriodo} ${errorPeriodo ? s.invalido : ""}`}
          />
          <small id="ayuda-periodo" className={s.ayudaPeriodo}>
            {sugerido && periodo !== sugerido ? (
              <>
                Sugerido: {periodoLegible(sugerido)} ·{" "}
                <button type="button" className={s.enlace} disabled={bloqueado} onClick={() => fijarPeriodo(sugerido)}>
                  usar el sugerido
                </button>
              </>
            ) : sugerido ? (
              "Es el período sugerido."
            ) : (
              "Escribí mes y año, por ejemplo 10/2026."
            )}
          </small>
        </label>
        <p className={s.ayudaDestino}>
          La planilla no trae obra social ni período: todo lo que subas se carga en este destino. Si lo cambiás, se vuelve
          a previsualizar.
        </p>
      </section>
      {errorPeriodos && <p className={r.error}>{errorPeriodos}</p>}
      {errorPeriodo && (
        <p className={r.error} role="alert">
          {errorPeriodo}
        </p>
      )}

      <div className={s.barra}>
        <input
          ref={entrada}
          type="file"
          accept=".xlsx,.xls"
          className={s.archivoInput}
          onChange={(e) => void alElegirArchivo(e)}
          aria-label="Planilla de prestaciones"
        />
        <Button
          type="button"
          variant="primary"
          isLoading={leyendo}
          disabled={bloqueado || numeroOS == null || !periodo || !!errorPeriodo}
          onClick={() => entrada.current?.click()}
          leftIcon={<Upload size={18} />}
        >
          Subir planilla
        </Button>
        <Button type="button" variant="ghost" onClick={() => void bajarPlantilla()} leftIcon={<Download size={18} />}>
          Descargar plantilla
        </Button>
        <span className={s.formato}>.xlsx · hoja «Prestaciones», una fila por prestación</span>
        {archivo && (
          <>
            <span className={r.archivo}>
              {archivo.nombre} · {archivo.filas.length} filas
            </span>
            {!bloqueado && (
              <button type="button" className={r.limpiar} onClick={reiniciar}>
                <Trash2 size={15} /> Quitar
              </button>
            )}
          </>
        )}
      </div>

      {errorArchivo && <p className={r.error}>{errorArchivo}</p>}
      {errorPrevia && <p className={r.error}>{errorPrevia}</p>}

      {!archivo && (
        <div className={s.vacio}>
          <FileSpreadsheet size={34} />
          <p>
            Subí la planilla con el formato de la plantilla. Nada se graba al subirla: primero vas a ver, fila por fila,
            qué entra, qué está repetido y qué hay que corregir.
          </p>
        </div>
      )}

      {archivo && previsualizando && !salida && <p className={s.sinFilas}>Revisando la planilla fila por fila…</p>}

      {confirmado && (
        <div className={s.confirmacion} role="status">
          <CheckCircle2 size={22} aria-hidden="true" />
          <div>
            <strong>
              {confirmado.resumen.grabables} prestaciones cargadas en {nombreOS}, período {periodoLegible(confirmado.resumen.periodo)}.
            </strong>
            {confirmado.resumen.total - confirmado.resumen.grabables > 0 && (
              <span>
                {confirmado.resumen.total - confirmado.resumen.grabables} filas quedaron afuera (
                {confirmado.resumen.omitidas} con error, {confirmado.resumen.duplicadas} ya cargadas
                {confirmado.resumen.descartadas > 0 ? ` y ${confirmado.resumen.descartadas} descartadas` : ""}): corregilas en
                la planilla y volvé a subir sólo esas.
              </span>
            )}
          </div>
        </div>
      )}

      {x && (
        <div className={r.resumen}>
          <div className={r.dato}>
            <strong>{x.total}</strong>
            <span>Filas en la planilla</span>
          </div>
          <div className={r.dato}>
            <strong>{x.grabables}</strong>
            <span>{confirmado ? "Grabadas" : "Se van a grabar"}</span>
          </div>
          <div className={r.dato}>
            <strong>{moneda.format(x.importeTotal)}</strong>
            <span>Importe {confirmado ? "grabado" : "a grabar"}</span>
          </div>
          {x.equipos > 0 && (
            <div className={r.dato}>
              <strong>{x.equipos}</strong>
              <span>Equipos</span>
            </div>
          )}
          {x.omitidas > 0 && (
            <div className={`${r.dato} ${r.datoAlerta}`}>
              <strong>{x.omitidas}</strong>
              <span>No entran</span>
            </div>
          )}
          {x.duplicadas > 0 && (
            <div className={`${r.dato} ${r.datoAlerta}`}>
              <strong>{x.duplicadas}</strong>
              <span>Ya cargadas</span>
            </div>
          )}
          {x.porElegir > 0 && (
            <div className={`${r.dato} ${r.datoAlerta}`}>
              <strong>{x.porElegir}</strong>
              <span>Elegir socio</span>
            </div>
          )}
          {x.descartadas > 0 && (
            <div className={r.dato}>
              <strong>{x.descartadas}</strong>
              <span>Descartadas</span>
            </div>
          )}
          {x.conAviso > 0 && (
            <div className={r.dato}>
              <strong>{x.conAviso}</strong>
              <span>Con aviso</span>
            </div>
          )}
        </div>
      )}

      {confirmado ? (
        <>
          <div className={s.barra}>
            <Link to="/panel/facturacion/periodos">
              <Button type="button" variant="ghost">Ver períodos</Button>
            </Link>
            <Button type="button" variant="third" onClick={reiniciar}>
              Importar otra planilla
            </Button>
          </div>
          <TablaPrestaciones filas={grabadas} decisiones={{}} onElegir={elegir} onDescartar={descartar} grabadas />
        </>
      ) : (
        salida && (
          <>
            <div className={s.herramientas}>
              <div className={s.segmentos} role="group" aria-label="Filtrar filas">
                {(
                  [
                    ["todas", `Todas · ${filas.length}`],
                    ["problemas", `Con problemas · ${conteo.problemas}`],
                    ["avisos", `Con aviso · ${conteo.avisos}`],
                    ["equipos", `Equipos · ${conteo.equipos}`],
                  ] as [Filtro, string][]
                ).map(([clave, texto]) => (
                  <button
                    key={clave}
                    type="button"
                    className={`${s.segmento} ${filtro === clave ? s.activo : ""}`}
                    aria-pressed={filtro === clave}
                    onClick={() => setFiltro(clave)}
                  >
                    {texto}
                  </button>
                ))}
              </div>
              <div className={s.busqueda}>
                <Search size={15} aria-hidden="true" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar médico, socio, código o paciente"
                  aria-label="Buscar en la planilla"
                />
              </div>
            </div>

            <TablaPrestaciones filas={visibles} decisiones={decisiones} onElegir={elegir} onDescartar={descartar} />

            <div className={s.acciones}>
              {bloqueo && <p className={s.bloqueo}>{bloqueo}</p>}
              <Button
                type="button"
                variant="secondary"
                isLoading={previsualizando}
                disabled={previsualizando || !!modal}
                onClick={() => void previsualizar()}
                leftIcon={<Eye size={17} />}
              >
                Previsualizar de nuevo
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!puedeConfirmar}
                onClick={() => salida && setModal({ tipo: "advertencia", resumen: salida.resumen })}
                leftIcon={<Save size={17} />}
              >
                Confirmar e importar {x ? x.grabables : 0}
              </Button>
            </div>

            <p className={r.pendiente}>
              <AlertTriangle size={16} />
              {errorPeriodo
                ? errorPeriodo
                : "Al confirmar se graban sólo las filas que entran, todas en una única operación: si la cancelás, no queda nada cargado. Las filas de un mismo equipo entran todas juntas o ninguna. Nada se graba hasta que confirmes."}
            </p>
          </>
        )
      )}

      {modal && (
        <ModalImportacion
          estado={modal}
          obraSocial={nombreOS}
          periodo={salida?.resumen.periodo ?? periodo}
          onCancelar={() => void cancelar()}
          onCerrar={() => setModal(null)}
          onConfirmar={() => void confirmar()}
        />
      )}
    </div>
  );
}

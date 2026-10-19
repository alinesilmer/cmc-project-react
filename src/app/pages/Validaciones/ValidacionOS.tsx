import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  FileUp,
  Info,
  PlusCircle,
} from "lucide-react";

import { useAuth } from "../../auth/AuthProvider";
import { isMedico } from "../../auth/roles";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import ActionModal from "@/app/components/ui/ActionModal/ActionModal";
import BackButton from "@/app/components/ui/BackButton/BackButton";
import Franja, { Solapa } from "@/app/components/layout/Franja/Franja";
import MedicoAutocomplete from "../facturacion/components/MedicoAutocomplete";
import type { MedicoOption } from "../facturacion/types";
import PeriodoAbierto from "./components/PeriodoAbierto";
import PanelObraSocial from "./components/PanelObraSocial";
import PeriodosTable from "./components/PeriodosTable";
import PrestacionesTable from "./components/PrestacionesTable";
import PrestacionForm from "./components/PrestacionForm";
import ResultadoCarga from "./components/ResultadoCarga";
import { getObraSocial } from "./validaciones.config";
import {
  adjuntarOrden,
  cargarPrestacion,
  eliminarPrestacion,
  esTimeoutDeRed,
  getPeriodoActual,
  getPeriodos,
  getPrestaciones,
} from "./validaciones.api";
import { iniciales, nombreMes } from "./validaciones.types";
import type {
  Periodo,
  Prestacion,
  PrestacionFormValues,
  ResultadoValidacion,
} from "./validaciones.types";
import s from "./ValidacionOS.module.scss";

type TabId = "carga" | "listado";

export default function ValidacionOS() {
  const { slug } = useParams<{ slug: string }>();
  const os = getObraSocial(slug);

  const { user } = useAuth();
  const esMedico = isMedico(user);
  // El personal del Colegio (rol no médico) tiene que elegir a qué socio le corresponde la carga: el backend, sin `nro_socio`.
  const [socio, setSocio] = useState<MedicoOption | null>(null);
  // Un `cod` que no sea un número de socio válido cuenta como "sin elegir": el cliente omite `nro_socio` cuando es falsy.
  const codSocio = esMedico || !socio ? NaN : Number(socio.cod);
  const nroSocioElegido = Number.isInteger(codSocio) && codSocio > 0 ? codSocio : undefined;
  const faltaElegirSocio = !esMedico && nroSocioElegido == null;

  const [tab, setTab] = useState<TabId>("carga");
  const [mes, setMes] = useState(() => new Date().getMonth() + 1);
  const [anio, setAnio] = useState(() => new Date().getFullYear());
  // `mes`/`anio` arrancan en el mes calendario solo porque hace falta un valor inicial sincrónico .
  const [periodoListo, setPeriodoListo] = useState(false);

  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [cargandoPeriodos, setCargandoPeriodos] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoValidacion | null>(null);
  // Se incrementa después de un alta exitosa para remontar `PrestacionForm` con los campos vacíos.
  const [formKey, setFormKey] = useState(0);

  const [aEliminar, setAEliminar] = useState<Prestacion | null>(null);
  const [aAdjuntar, setAAdjuntar] = useState<Prestacion | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  // Detalle prestación-por-prestación de un período del listado (cualquiera, no sólo el abierto) — independiente de `prestaciones`/`mes`/`anio`, que son siempre los del período abierto.
  const [verDetalle, setVerDetalle] = useState<Periodo | null>(null);
  const [prestacionesDetalle, setPrestacionesDetalle] = useState<Prestacion[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const resultadoRef = useRef<HTMLDivElement>(null);
  // Número de la última consulta lanzada.
  const refrescoSeq = useRef(0);
  const detalleSeq = useRef(0);

  const codigoOS = os?.codigo ?? null;

  // Lo que se ve en pantalla pertenece a un socio y a una obra social: al cambiar cualquiera de los dos.
  const limpiarContexto = useCallback(() => {
    detalleSeq.current += 1;
    setVerDetalle(null);
    setPrestacionesDetalle([]);
    setCargandoDetalle(false);
    setResultado(null);
  }, []);

  // ─── Carga de datos ────────────────────────────────────────────────────────
  const refrescar = useCallback(async () => {
    if (codigoOS == null) return;
    const seq = ++refrescoSeq.current;
    // Personal del Colegio sin socio elegido todavía: no hay de quién traer nada (ver faltaElegirSocio).
    if (faltaElegirSocio) {
      setPrestaciones([]);
      setPeriodos([]);
      setCargandoPeriodos(false);
      return;
    }
    setCargandoPeriodos(true);
    // Hasta que no llega el puntero del período no se sabe qué mes pedir: consultar con el mes calendario mostraba totales de otro período.
    if (!periodoListo) return;
    setErrorCarga(null);
    try {
      const [lista, periodosOS] = await Promise.all([
        getPrestaciones(codigoOS, mes, anio, nroSocioElegido),
        getPeriodos(codigoOS, nroSocioElegido),
      ]);
      if (seq !== refrescoSeq.current) return;
      setPrestaciones(lista);
      setPeriodos(periodosOS);
    } catch {
      if (seq === refrescoSeq.current) {
        setErrorCarga("No pudimos traer las prestaciones. Reintentá en unos segundos.");
      }
    } finally {
      if (seq === refrescoSeq.current) setCargandoPeriodos(false);
    }
  }, [codigoOS, mes, anio, faltaElegirSocio, nroSocioElegido, periodoListo]);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  // Trae las prestaciones de un período puntual del listado (no ata al período abierto): así "Ver detalle" no mueve la barra de arriba.
  const abrirDetalle = useCallback(
    async (p: Periodo) => {
      if (codigoOS == null) return;
      const seq = ++detalleSeq.current;
      setVerDetalle(p);
      // Fuera la lista del detalle anterior: si esta consulta falla, quedaba bajo el título de este período.
      setPrestacionesDetalle([]);
      setCargandoDetalle(true);
      try {
        const lista = await getPrestaciones(codigoOS, p.mes, p.anio, nroSocioElegido);
        if (seq !== detalleSeq.current) return;
        setPrestacionesDetalle(lista);
      } catch {
        if (seq !== detalleSeq.current) return;
        // Sin datos no hay detalle que mostrar: una tabla vacía diría que el período no tiene prestaciones.
        setVerDetalle(null);
        setErrorCarga("No pudimos traer las prestaciones de ese período. Reintentá en unos segundos.");
      } finally {
        if (seq === detalleSeq.current) setCargandoDetalle(false);
      }
    },
    [codigoOS, nroSocioElegido],
  );

  // Después de eliminar/adjuntar sobre el detalle abierto, refresca esa misma lista — `refrescar()` sólo trae la del período abierto, que puede ser otro.
  const refrescarDetalle = useCallback(async () => {
    if (!verDetalle || codigoOS == null) return;
    const seq = ++detalleSeq.current;
    try {
      const lista = await getPrestaciones(codigoOS, verDetalle.mes, verDetalle.anio, nroSocioElegido);
      if (seq !== detalleSeq.current) return;
      setPrestacionesDetalle(lista);
    } catch {
      if (seq !== detalleSeq.current) return;
      setErrorCarga("No pudimos actualizar el listado. Reintentá en unos segundos.");
    }
  }, [verDetalle, codigoOS, nroSocioElegido]);

  // El período abierto lo define el Colegio (puntero `periodo_medico_actual`), no el calendario: arrancamos parados ahí y no en el mes de hoy.
  useEffect(() => {
    if (codigoOS == null) return;
    let cancelado = false;
    // Al cambiar de obra social (sin remount: mismo componente, otro `slug` de ruta) hay que volver a mostrar "Cargando…" — si no.
    setPeriodoListo(false);
    setPrestaciones([]);
    setPeriodos([]);
    limpiarContexto();
    getPeriodoActual(codigoOS)
      .then(({ mes: m, anio: a }) => {
        if (cancelado) return;
        setMes(m);
        setAnio(a);
      })
      .catch(() => {
        /* sin puntero configurado seguimos con el mes calendario */
      })
      .finally(() => {
        if (!cancelado) setPeriodoListo(true);
      });
    return () => {
      cancelado = true;
    };
  }, [codigoOS, limpiarContexto]);

  // Rutas inválidas o portales externos no tienen pantalla de carga propia.
  if (!os) return <Navigate to="/panel/validaciones" replace />;
  if (os.modo === "externa") return <PortalExterno slug={os.slug} />;

  // ─── Acciones ──────────────────────────────────────────────────────────────

  const handleValidar = async (valores: PrestacionFormValues) => {
    if (os.codigo == null) return;
    if (faltaElegirSocio) return; // el formulario ni se muestra en este caso
    setEnviando(true);
    setResultado(null);
    try {
      // El dígito verificador viaja pegado al número, como lo guarda el legacy.
      const dv = valores.barraAfiliado?.trim();
      const base = valores.nroAfiliado ?? valores.dni ?? "";
      const prestacion = await cargarPrestacion({
        obra_social: os.codigo,
        codigo: valores.codigo?.trim() ?? "",
        nombre_afiliado: valores.nombreAfiliado ?? "",
        // Las O.S. en línea reciben el número y el dígito por separado; las de carga manual lo guardan ya unido.
        nro_afiliado: os.validacion === "online" ? base : dv ? `${base}/${dv}` : base,
        barra_afiliado: dv ?? "",
        nro_validacion: valores.nroValidacion ?? "",
        token: valores.token ?? "",
        coseguro: Number(String(valores.coseguro ?? "0").replace(",", ".")) || 0,
        cantidad: Number(valores.cantidad ?? 1) || 1,
        nro_socio: nroSocioElegido,
      });
      setResultado({
        estado: prestacion.estado,
        mensaje:
          prestacion.estado === "rechazada"
            ? prestacion.estadoDetalle || "La obra social rechazó la prestación."
            : prestacion.estado === "pendiente"
              ? prestacion.estadoDetalle
              : "La prestación quedó cargada en el período.",
        prestacion,
      });
      // Sólo se limpia cuando la prestación quedó cargada.
      if (prestacion.estado === "autorizada" || prestacion.estado === "cargada") {
        setFormKey((k) => k + 1);
      }
      await Promise.all([refrescar(), refrescarDetalle()]);
      resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (err) {
      // Regla única para el prestador: si no salió el cartel de autorizada, la prestación no se cargó.
      const porTimeout = esTimeoutDeRed(err);
      if (porTimeout) await Promise.all([refrescar(), refrescarDetalle()]);
      setResultado({
        estado: "rechazada",
        mensaje: porTimeout
          ? `${os.nombre} no respondió a tiempo, así que la prestación no se cargó. Reintentá en unos minutos.`
          : mensajeDeError(err, "No pudimos guardar la prestación. Intentá de nuevo."),
        mostrarAyuda: !porTimeout,
      });
      resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } finally {
      setEnviando(false);
    }
  };

  const handleEliminar = async () => {
    if (!aEliminar) return;
    setErrorAccion(null);
    try {
      await eliminarPrestacion(aEliminar.id, nroSocioElegido);
      await Promise.all([refrescar(), refrescarDetalle()]);
      setAEliminar(null);
    } catch (err) {
      // Igual que en el alta: si cortó el navegador, la baja puede haberse hecho igual.
      if (esTimeoutDeRed(err)) {
        await Promise.all([refrescar(), refrescarDetalle()]);
        setAEliminar(null);
        setErrorCarga(
          `${os.nombre} está demorando en responder. Verificá en el listado si la prestación se eliminó antes de reintentar.`,
        );
        return;
      }
      setErrorAccion(mensajeDeError(err, "No pudimos eliminar la prestación."));
      throw new Error("delete failed"); // mantiene el modal abierto
    }
  };

  const handleAdjuntar = async () => {
    if (!aAdjuntar || !archivo) return;
    setErrorAccion(null);
    try {
      await adjuntarOrden(aAdjuntar.id, archivo, nroSocioElegido);
      await Promise.all([refrescar(), refrescarDetalle()]);
      setAAdjuntar(null);
      setArchivo(null);
    } catch (err) {
      // El backend explica el rechazo (no es un PDF, pesa de más).
      setErrorAccion(mensajeDeError(err, "No pudimos subir el archivo."));
      throw new Error("upload failed");
    }
  };

  // Entrar al listado siempre trae datos frescos.
  const irATab = (destino: TabId) => {
    setTab(destino);
    if (destino === "listado") {
      void refrescar();
      void refrescarDetalle();
    }
  };

  // El personal del Colegio elige a nombre de quién trabaja: es el primer bloque de la carga y también encabeza el listado.
  const selectorMedico = (
    <MedicoAutocomplete
      value={socio?.cod ?? null}
      presetLabel={socio?.nombre}
      onChange={(_cod, medico) => {
        setSocio(medico);
        limpiarContexto();
      }}
    />
  );

  return (
    <div className={s.container} style={{ ["--os-color" as string]: os.color }}>
      <Franja
        titulo={
          <>
            <span className={s.placa}>
              {os.logo ? <img src={os.logo} alt="" /> : iniciales(os.nombre)}
            </span>
            {os.nombre}
          </>
        }
      >
        <Solapa activa={tab === "carga"} onClick={() => irATab("carga")}>
          <PlusCircle size={18} /> Cargar
        </Solapa>
        <Solapa activa={tab === "listado"} onClick={() => irATab("listado")} cuenta={periodos.length}>
          <ClipboardList size={18} /> Listado
        </Solapa>
      </Franja>

      <BackButton label="Volver" to="/panel/validaciones" />

      {os.nota && (
        <p className={s.nota}>
          <Info size={16} />
          {os.nota}
        </p>
      )}

      {!os.cargaImplementada && (
        <p className={s.aviso}>
          <AlertTriangle size={16} />
          La carga de prestaciones de {os.nombre} todavía no está conectada. Podés
          consultar lo ya cargado y los períodos, pero el alta hay que hacerla por el
          sistema anterior.
        </p>
      )}

      {errorCarga && (
        <p className={s.error}>
          <CircleAlert size={16} />
          {errorCarga}
        </p>
      )}

      {/* ── Contenido ── */}
      {tab === "carga" && (
        <section className={s.panel}>
          <div ref={resultadoRef}>
            {resultado && (
              <ResultadoCarga resultado={resultado} onCerrar={() => setResultado(null)} />
            )}
          </div>

          <div className={s.carga}>
            <PrestacionForm
              key={`${os.slug}-${formKey}`}
              os={os}
              enviando={enviando}
              onSubmit={handleValidar}
              nroSocio={nroSocioElegido}
              medico={
                esMedico
                  ? undefined
                  : { control: selectorMedico, elegido: !faltaElegirSocio }
              }
            />
            <div className={s.cargaPeriodo}>
              <PeriodoAbierto
                mes={mes}
                anio={anio}
                listo={periodoListo}
                cantidad={faltaElegirSocio ? undefined : prestaciones.length}
              />
            </div>
            <div className={s.cargaPanel}>
              <PanelObraSocial codigo={os.codigo} />
            </div>
          </div>
        </section>
      )}

      {tab === "listado" && (
        <section className={s.panel}>
          {!esMedico && <div className={s.socioField}>{selectorMedico}</div>}
          {verDetalle ? (
            <>
              <div className={s.panelHead}>
                <div>
                  <BackButton label="Períodos" onClick={() => setVerDetalle(null)} />
                  <h2 className={s.cardTitle}>
                    Prestaciones de {nombreMes(verDetalle.mes)} {verDetalle.anio}
                  </h2>
                </div>
                <button type="button" className={s.linkBtn} onClick={() => setTab("carga")}>
                  <PlusCircle size={15} /> Cargar otra
                </button>
              </div>
              <PrestacionesTable
                prestaciones={prestacionesDetalle}
                cargando={cargandoDetalle}
                permiteAdjuntarOrden={os.permiteAdjuntarOrden}
                onEliminar={setAEliminar}
                onAdjuntar={(p) => {
                  setArchivo(null);
                  setAAdjuntar(p);
                }}
              />
            </>
          ) : (
            <>
              <div className={s.panelHead}>
                <h2 className={s.cardTitle}>Períodos</h2>
                <button type="button" className={s.linkBtn} onClick={() => setTab("carga")}>
                  <PlusCircle size={15} /> Cargar otra
                </button>
              </div>
              <p className={s.cardSub}>
                Un período por fila, el más reciente primero. "Ver detalle" abre las
                prestaciones cargadas en ese período, una por una.
              </p>
              <PeriodosTable
                periodos={periodos}
                cargando={cargandoPeriodos}
                onVerDetalle={abrirDetalle}
              />
            </>
          )}
        </section>
      )}

      {/* ── Modal: eliminar ── */}
      <ActionModal
        open={Boolean(aEliminar)}
        title="Eliminar prestación"
        confirmText="Eliminar"
        onClose={() => {
          setAEliminar(null);
          setErrorAccion(null);
        }}
        onConfirm={handleEliminar}
      >
        {aEliminar && (
          <div className={s.modalBody}>
            <p>
              ¿Querés eliminar la prestación <strong>{aEliminar.codigo}</strong> de{" "}
              <strong>{aEliminar.nombreAfiliado}</strong>?
            </p>
            <p className={s.modalNota}>
              Si ya estaba autorizada, también se da de baja en la obra social. Esta
              acción no se puede deshacer.
            </p>
            {errorAccion && <p className={s.modalError}>{errorAccion}</p>}
          </div>
        )}
      </ActionModal>

      {/* ── Modal: adjuntar orden ── */}
      <ActionModal
        open={Boolean(aAdjuntar)}
        title="Adjuntar orden"
        confirmText="Subir archivo"
        confirmDisabled={!archivo}
        onClose={() => {
          setAAdjuntar(null);
          setArchivo(null);
          setErrorAccion(null);
        }}
        onConfirm={handleAdjuntar}
      >
        <div className={s.modalBody}>
          <p>
            Subí la orden o receta en PDF de la prestación{" "}
            <strong>{aAdjuntar?.codigo}</strong>.
          </p>

          {aAdjuntar?.orden && (
            <p className={s.modalNota}>
              Ya hay un archivo cargado. Si subís otro, lo reemplaza.
            </p>
          )}

          <button
            type="button"
            className={s.dropzone}
            onClick={() => fileRef.current?.click()}
          >
            <FileUp size={22} />
            <span>{archivo ? archivo.name : "Elegir archivo PDF"}</span>
            <em>Hasta 5 MB</em>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => {
              setArchivo(e.target.files?.[0] ?? null);
              // Sin vaciarlo, volver a elegir el mismo archivo no dispara `change` y el botón de subir queda deshabilitado.
              e.target.value = "";
            }}
          />

          {errorAccion && <p className={s.modalError}>{errorAccion}</p>}
        </div>
      </ActionModal>
    </div>
  );
}

// ─── Obras sociales que se validan en un portal externo ───────────────────────

function PortalExterno({ slug }: { slug: string }) {
  const os = getObraSocial(slug)!;
  return (
    <div className={s.container}>
      <BackButton label="Volver" to="/panel/validaciones" />

      <div className={s.externo}>
        <span className={s.avatar} style={{ background: os.color }}>
          {iniciales(os.nombre)}
        </span>
        <h1 className={s.title}>{os.nombre}</h1>
        <a
          className={s.externoBtn}
          href={os.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir portal de {os.nombre} <ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
}

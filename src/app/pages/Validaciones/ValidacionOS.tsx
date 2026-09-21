import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  FileUp,
  Info,
  PlusCircle,
  UserRound,
  X,
} from "lucide-react";

import { useAuth } from "../../auth/AuthProvider";
import { isMedico } from "../../auth/roles";
import { mensajeDeError } from "../../lib/httpErrors";
import ActionModal from "../../components/molecules/ActionModal/ActionModal";
import MedicoAutocomplete from "../facturacion/components/MedicoAutocomplete";
import type { MedicoOption } from "../facturacion/types";
import PeriodosTable from "./components/PeriodosTable";
import PrestacionesTable from "./components/PrestacionesTable";
import PrestacionForm from "./components/PrestacionForm";
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
import {
  formatMoneda,
  iniciales,
  nombreMes,
} from "./validaciones.types";
import { esPendienteDeObraSocial } from "./validaciones.types";
import type {
  Periodo,
  Prestacion,
  PrestacionFormValues,
  ResultadoValidacion,
} from "./validaciones.types";
import s from "./ValidacionOS.module.scss";

type TabId = "carga" | "listado";

const hoy = new Date();

export default function ValidacionOS() {
  const { slug } = useParams<{ slug: string }>();
  const os = getObraSocial(slug);

  const { user } = useAuth();
  const esMedico = isMedico(user);
  // El personal del Colegio (rol no médico) tiene que elegir a qué socio le
  // corresponde la carga: el backend, sin `nro_socio`, opera sobre el token
  // de quien está logueado, y quien está logueado acá no es un médico.
  const [socio, setSocio] = useState<MedicoOption | null>(null);
  const nroSocioElegido = esMedico || !socio ? undefined : Number(socio.cod);
  const faltaElegirSocio = !esMedico && !socio;

  const [tab, setTab] = useState<TabId>("carga");
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  // `mes`/`anio` arrancan en el mes calendario (ver `hoy` arriba) solo porque hace
  // falta un valor inicial sincrónico — el período REAL es el puntero
  // `periodo_medico_actual` que se pide abajo. Sin este flag la barra mostraba el
  // mes de hoy por un instante y después "saltaba" al período abierto de verdad
  // (ej. mostraba Septiembre y al toque cambiaba a Octubre) apenas resolvía el
  // fetch — confuso cuando ya no coinciden porque el cron de cierre corrió.
  const [periodoListo, setPeriodoListo] = useState(false);

  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [cargandoPeriodos, setCargandoPeriodos] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoValidacion | null>(null);
  // Se incrementa después de un alta exitosa para remontar `PrestacionForm` con
  // los campos vacíos. Sin esto el formulario quedaba con el afiliado, el token
  // y el código cargados y el botón habilitado: un segundo clic —por costumbre
  // o por duda— pedía **otra autorización real** por la misma práctica y
  // consumía otro token de la credencial.
  const [formKey, setFormKey] = useState(0);

  const [aEliminar, setAEliminar] = useState<Prestacion | null>(null);
  const [aAdjuntar, setAAdjuntar] = useState<Prestacion | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  // Detalle prestación-por-prestación de un período del listado (cualquiera,
  // no sólo el abierto) — independiente de `prestaciones`/`mes`/`anio`, que
  // son siempre los del período abierto (la barra de arriba no navega).
  const [verDetalle, setVerDetalle] = useState<Periodo | null>(null);
  const [prestacionesDetalle, setPrestacionesDetalle] = useState<Prestacion[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const resultadoRef = useRef<HTMLDivElement>(null);

  const codigoOS = os?.codigo ?? null;

  // ─── Carga de datos ────────────────────────────────────────────────────────
  const refrescar = useCallback(async () => {
    if (codigoOS == null) return;
    // Personal del Colegio sin socio elegido todavía: no hay de quién traer
    // nada (ver faltaElegirSocio).
    if (faltaElegirSocio) {
      setPrestaciones([]);
      setPeriodos([]);
      setCargandoPeriodos(false);
      return;
    }
    setCargandoPeriodos(true);
    setErrorCarga(null);
    try {
      const [lista, periodosOS] = await Promise.all([
        getPrestaciones(codigoOS, mes, anio, nroSocioElegido),
        getPeriodos(codigoOS, nroSocioElegido),
      ]);
      setPrestaciones(lista);
      setPeriodos(periodosOS);
    } catch {
      setErrorCarga("No pudimos traer las prestaciones. Reintentá en unos segundos.");
    } finally {
      setCargandoPeriodos(false);
    }
  }, [codigoOS, mes, anio, faltaElegirSocio, nroSocioElegido]);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  // Trae las prestaciones de un período puntual del listado (no ata al
  // período abierto): así "Ver detalle" no mueve la barra de arriba.
  const abrirDetalle = useCallback(
    async (p: Periodo) => {
      if (codigoOS == null) return;
      setVerDetalle(p);
      setCargandoDetalle(true);
      try {
        const lista = await getPrestaciones(codigoOS, p.mes, p.anio, nroSocioElegido);
        setPrestacionesDetalle(lista);
      } catch {
        setErrorCarga("No pudimos traer las prestaciones de ese período. Reintentá en unos segundos.");
      } finally {
        setCargandoDetalle(false);
      }
    },
    [codigoOS, nroSocioElegido],
  );

  // Después de eliminar/adjuntar sobre el detalle abierto, refresca esa misma
  // lista — `refrescar()` sólo trae la del período abierto, que puede ser otro.
  const refrescarDetalle = useCallback(async () => {
    if (!verDetalle || codigoOS == null) return;
    const lista = await getPrestaciones(codigoOS, verDetalle.mes, verDetalle.anio, nroSocioElegido);
    setPrestacionesDetalle(lista);
  }, [verDetalle, codigoOS, nroSocioElegido]);

  // El período abierto lo define el Colegio (puntero `periodo_medico_actual`),
  // no el calendario: arrancamos parados ahí y no en el mes de hoy.
  useEffect(() => {
    if (codigoOS == null) return;
    let cancelado = false;
    // Al cambiar de obra social (sin remount: mismo componente, otro `slug` de
    // ruta) hay que volver a mostrar "Cargando…" — si no, se ve por un instante
    // el período de la obra social anterior.
    setPeriodoListo(false);
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
  }, [codigoOS]);

  // Las rechazadas no suman: la obra social no las va a pagar.
  const totalPeriodo = useMemo(
    () =>
      prestaciones
        .filter((p) => p.estado !== "rechazada")
        .reduce((acc, p) => acc + p.total, 0),
    [prestaciones]
  );

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
        // Las O.S. en línea reciben el número y el dígito por separado; las de
        // carga manual lo guardan ya unido.
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
      // Sólo se limpia cuando la prestación quedó cargada. Ante un rechazo los
      // datos se conservan: casi siempre hay que corregir un dígito y reintentar.
      if (prestacion.estado === "autorizada" || prestacion.estado === "cargada") {
        setFormKey((k) => k + 1);
      }
      await Promise.all([refrescar(), refrescarDetalle()]);
      resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (err) {
      // Regla única para el prestador: si no salió el cartel de autorizada, la
      // prestación no se cargó. El timeout no es una excepción a eso.
      //
      // Se puede afirmar porque el cliente espera más que el backend
      // (TIMEOUT_OS_EN_LINEA > SANCOR_TIMEOUT): si acá se corta, el backend ya
      // desistió de Sancor y cerró con 502 sin grabar nada. Antes no era cierto
      // —el navegador cortaba a los 15 s y el backend seguía hasta 30— y por
      // eso hacía falta un estado intermedio.
      //
      // Igual se refresca la lista: si un backend excepcionalmente lento
      // alcanzó a grabar, la prestación aparece en el listado y el prestador
      // la ve antes de reintentar.
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
      // Igual que en el alta: si cortó el navegador, la baja puede haberse
      // hecho igual. Refrescamos y cerramos el modal — la lista es la que
      // manda, y dejar "no pudimos eliminar" sobre una prestación que ya no
      // está fue exactamente lo que pasó en las pruebas.
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
    } catch {
      setErrorAccion("No pudimos subir el archivo.");
      throw new Error("upload failed");
    }
  };

  // Entrar al listado siempre trae datos frescos. Importa después de un
  // timeout: el aviso manda al médico a revisar acá si la prestación entró, y
  // el último refresco pudo haber salido antes de que el backend terminara —
  // una lista vacía y vieja lo llevaría a validar dos veces.
  const irATab = (destino: TabId) => {
    setTab(destino);
    if (destino === "listado") void refrescar();
  };

  const TABS: { id: TabId; label: string; icon: typeof PlusCircle; badge?: number }[] = [
    { id: "carga", label: "Cargar prestación", icon: PlusCircle },
    {
      id: "listado",
      label: "Listado",
      icon: ClipboardList,
      badge: periodos.length,
    },
  ];

  return (
    <div className={s.container} style={{ ["--os-color" as string]: os.color }}>
      {/* ── Encabezado ── */}
      <Link to="/panel/validaciones" className={s.back}>
        <ArrowLeft size={16} /> Volver a obras sociales
      </Link>

      <header className={s.header}>
        <div className={s.headerMain}>
          {os.logo ? (
            <img src={os.logo} alt="" className={s.headerLogo} />
          ) : (
            <span className={s.avatar} style={{ background: os.color }}>
              {iniciales(os.nombre)}
            </span>
          )}
          <h1 className={s.title}>{os.nombre}</h1>
        </div>

      </header>

      {/* ── Socio a validar (sólo personal del Colegio) ── */}
      {!esMedico && (
        <section className={s.formCard} style={{ maxWidth: 480 }}>
          <div>
            <h2 className={s.cardTitle}>Socio a validar</h2>
            <p className={s.cardSub}>
              Elegí el médico para el que vas a cargar esta prestación. El
              período, el historial y la carga de acá abajo pasan a ser los suyos.
            </p>
          </div>
          <div className={s.socioField}>
            <label className={s.socioLabel}>
              <UserRound size={14} /> Socio
            </label>
            <MedicoAutocomplete
              value={socio?.cod ?? null}
              onChange={(_cod, medico) => setSocio(medico)}
            />
          </div>
        </section>
      )}

      {/* ── Período ── */}
      <div className={s.periodBar}>
        <div className={s.periodInfo}>
          <span className={s.periodEyebrow}>Período abierto</span>
          <div className={`${s.periodLabel} ${periodoListo ? "" : s.periodLabelLoading}`}>
            <CalendarDays size={18} />
            <span>{periodoListo ? `${nombreMes(mes)} ${anio}` : "Cargando…"}</span>
          </div>
        </div>

        <div className={s.periodStats}>
          <div className={s.periodStat}>
            <span className={s.periodStatValue}>{prestaciones.length}</span>
            <span className={s.periodStatLabel}>prestaciones</span>
          </div>
          <div className={s.periodStatDivider} />
          <div className={s.periodStat}>
            <span className={`${s.periodStatValue} ${s.periodStatMoney}`}>
              {formatMoneda(totalPeriodo)}
            </span>
            <span className={s.periodStatLabel}>total del período</span>
          </div>
        </div>
      </div>

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

      {/* ── Pestañas ── */}
      <div className={s.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`${s.tab} ${tab === t.id ? s.tabActive : ""}`}
            onClick={() => irATab(t.id)}
          >
            <t.icon size={16} />
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className={s.tabBadge}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Contenido ── */}
      {tab === "carga" && (
        <section className={s.panel}>
          <div ref={resultadoRef}>
            {resultado && (
              <ResultadoBanner
                resultado={resultado}
                onCerrar={() => setResultado(null)}
              />
            )}
          </div>

          <div className={s.formCard}>
            <h2 className={s.cardTitle}>Nueva prestación</h2>
            <p className={s.cardSub}>
              {os.validacion === "online"
                ? "Completá los datos del afiliado y el código. Consultamos a la obra social en el momento."
                : "Cargá la autorización que ya obtuviste en el portal de la obra social."}
            </p>
            {faltaElegirSocio ? (
              <p className={s.aviso}>
                <AlertTriangle size={16} />
                Elegí primero el socio arriba: la prestación se carga a su nombre.
              </p>
            ) : (
              <PrestacionForm
                key={formKey}
                os={os}
                enviando={enviando}
                onSubmit={handleValidar}
                nroSocio={nroSocioElegido}
              />
            )}
          </div>
        </section>
      )}

      {tab === "listado" && (
        <section className={s.panel}>
          {verDetalle ? (
            <>
              <div className={s.panelHead}>
                <div>
                  <button
                    type="button"
                    className={s.linkBtn}
                    onClick={() => setVerDetalle(null)}
                  >
                    <ArrowLeft size={15} /> Volver al listado de períodos
                  </button>
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
              Ya hay un archivo cargado: <strong>{aAdjuntar.orden}</strong>. Si subís
              otro, lo reemplaza.
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
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          />

          {errorAccion && <p className={s.modalError}>{errorAccion}</p>}
        </div>
      </ActionModal>
    </div>
  );
}

// ─── Banner de resultado ──────────────────────────────────────────────────────

function ResultadoBanner({
  resultado,
  onCerrar,
}: {
  resultado: ResultadoValidacion;
  onCerrar: () => void;
}) {
  const { estado, mensaje, prestacion, mostrarAyuda = true } = resultado;

  // Nobis grada el `P-Pendiente` como `rechazada` en la base (importe 0,
  // fuera de factura), pero acá corresponde el mismo aviso que un `pendiente`
  // real: la orden existe en Nobis, sólo falta que el afiliado la gestione.
  // Ver `esPendienteDeObraSocial` — no cambia `estado`, sólo cómo se muestra.
  const pendienteDeGestion = estado === "rechazada" && esPendienteDeObraSocial(mensaje);
  const estadoVisual = pendienteDeGestion ? "pendiente" : estado;

  const Icono =
    estadoVisual === "autorizada" || estadoVisual === "cargada"
      ? BadgeCheck
      : estadoVisual === "pendiente"
        ? Info
        : CircleAlert;

  const titulo =
    estadoVisual === "autorizada"
      ? "Prestación autorizada"
      : estadoVisual === "cargada"
        ? "Prestación cargada"
        : estadoVisual === "pendiente"
          ? "Requiere gestión del afiliado"
          : "No se pudo cargar la prestación";

  return (
    <div className={`${s.resultado} ${s[`resultado_${estadoVisual}`]}`} role="status">
      <button
        type="button"
        className={s.resultadoClose}
        onClick={onCerrar}
        aria-label="Cerrar aviso"
      >
        <X size={16} />
      </button>

      <div className={s.resultadoHead}>
        <Icono size={22} />
        <div>
          <strong>{titulo}</strong>
          <p>{mensaje}</p>
        </div>
      </div>

      {prestacion && (
        <dl className={s.resultadoDatos}>
          <div>
            <dt>N° de validación</dt>
            <dd>{prestacion.nroValidacion}</dd>
          </div>
          <div>
            <dt>Afiliado</dt>
            <dd>{prestacion.nombreAfiliado}</dd>
          </div>
          <div>
            <dt>Código</dt>
            <dd>
              {prestacion.codigo} · {prestacion.descripcion}
            </dd>
          </div>
          <div>
            <dt>Honorarios</dt>
            <dd>{formatMoneda(prestacion.honorarios)}</dd>
          </div>
          <div>
            <dt>Gastos</dt>
            <dd>{formatMoneda(prestacion.gastos)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd className={s.resultadoTotal}>{formatMoneda(prestacion.total)}</dd>
          </div>
        </dl>
      )}

      {!prestacion && estado === "rechazada" && mostrarAyuda && (
        <p className={s.resultadoAyuda}>
          Revisá los datos del afiliado y el código. Si el problema sigue, consultá en
          el Colegio.
        </p>
      )}
    </div>
  );
}

// ─── Obras sociales que se validan en un portal externo ───────────────────────

function PortalExterno({ slug }: { slug: string }) {
  const os = getObraSocial(slug)!;
  return (
    <div className={s.container}>
      <Link to="/panel/validaciones" className={s.back}>
        <ArrowLeft size={16} /> Volver a obras sociales
      </Link>

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

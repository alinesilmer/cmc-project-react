import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
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
import type {
  Periodo,
  Prestacion,
  PrestacionFormValues,
  ResultadoValidacion,
} from "./validaciones.types";
import s from "./ValidacionOS.module.scss";

type TabId = "carga" | "periodo" | "historial";

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

  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoPeriodos, setCargandoPeriodos] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoValidacion | null>(null);

  const [aEliminar, setAEliminar] = useState<Prestacion | null>(null);
  const [aAdjuntar, setAAdjuntar] = useState<Prestacion | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [periodoAbierto, setPeriodoAbierto] = useState<{
    mes: number;
    anio: number;
  } | null>(null);

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
      setCargandoLista(false);
      setCargandoPeriodos(false);
      return;
    }
    setCargandoLista(true);
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
      setCargandoLista(false);
      setCargandoPeriodos(false);
    }
  }, [codigoOS, mes, anio, faltaElegirSocio, nroSocioElegido]);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  // El período abierto lo define el Colegio (puntero `periodo_medico_actual`),
  // no el calendario: arrancamos parados ahí y no en el mes de hoy.
  useEffect(() => {
    if (codigoOS == null) return;
    let cancelado = false;
    getPeriodoActual(codigoOS)
      .then(({ mes: m, anio: a }) => {
        if (cancelado) return;
        setMes(m);
        setAnio(a);
        setPeriodoAbierto({ mes: m, anio: a });
      })
      .catch(() => {
        /* sin puntero configurado seguimos con el mes calendario */
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
      await refrescar();
      resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (err) {
      // Se cortó del lado del navegador: el backend puede haber terminado igual
      // y la obra social puede haber autorizado. Decir "no se pudo" acá lleva al
      // médico a reintentar, y un segundo intento consume otro token del
      // afiliado — así que se refresca la lista y se le pide que mire antes.
      if (esTimeoutDeRed(err)) {
        // Refrescamos para que el contador de "Período actual" ya muestre la
        // prestación si efectivamente entró. El aviso se queda en esta pestaña.
        await refrescar();
        setResultado({
          estado: "incierto",
          mensaje: `${os.nombre} está demorando en responder. Puede que la prestación haya quedado cargada igual: revisala en "Período actual" antes de volver a validar, para no pedir dos veces la misma autorización.`,
        });
      } else {
        setResultado({
          estado: "rechazada",
          mensaje: mensajeDeError(
            err,
            "No pudimos guardar la prestación. Intentá de nuevo.",
          ),
        });
      }
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
      await refrescar();
      setAEliminar(null);
    } catch (err) {
      // Igual que en el alta: si cortó el navegador, la baja puede haberse
      // hecho igual. Refrescamos y cerramos el modal — la lista es la que
      // manda, y dejar "no pudimos eliminar" sobre una prestación que ya no
      // está fue exactamente lo que pasó en las pruebas.
      if (esTimeoutDeRed(err)) {
        await refrescar();
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
      await refrescar();
      setAAdjuntar(null);
      setArchivo(null);
    } catch {
      setErrorAccion("No pudimos subir el archivo.");
      throw new Error("upload failed");
    }
  };

  const moverPeriodo = (delta: number) => {
    const d = new Date(anio, mes - 1 + delta, 1);
    setMes(d.getMonth() + 1);
    setAnio(d.getFullYear());
  };

  // El tope para navegar hacia adelante es el período abierto por el Colegio;
  // si todavía no llegó la respuesta, el mes calendario.
  const tope = periodoAbierto ?? { mes: hoy.getMonth() + 1, anio: hoy.getFullYear() };
  const enTope = mes === tope.mes && anio === tope.anio;
  const fueraDelAbierto = Boolean(periodoAbierto) && !enTope;

  // Entrar al listado siempre trae datos frescos. Importa después de un
  // timeout: el aviso manda al médico a revisar acá si la prestación entró, y
  // el último refresco pudo haber salido antes de que el backend terminara —
  // una lista vacía y vieja lo llevaría a validar dos veces.
  const irATab = (destino: TabId) => {
    setTab(destino);
    if (destino === "periodo") void refrescar();
  };

  const TABS: { id: TabId; label: string; icon: typeof PlusCircle; badge?: number }[] = [
    { id: "carga", label: "Cargar prestación", icon: PlusCircle },
    {
      id: "periodo",
      label: "Período actual",
      icon: ClipboardList,
      badge: prestaciones.length,
    },
    { id: "historial", label: "Historial", icon: CalendarDays },
  ];

  return (
    <div className={s.container}>
      {/* ── Encabezado ── */}
      <Link to="/panel/validaciones" className={s.back}>
        <ArrowLeft size={16} /> Volver a obras sociales
      </Link>

      <header className={s.header} style={{ ["--os-color" as string]: os.color }}>
        <div className={s.headerMain}>
          {os.logo ? (
            <img src={os.logo} alt="" className={s.headerLogo} />
          ) : (
            <span className={s.avatar} style={{ background: os.color }}>
              {iniciales(os.nombre)}
            </span>
          )}
          <div>
            <h1 className={s.title}>{os.nombre}</h1>
            <p className={s.subtitle}>{os.descripcion}</p>
          </div>
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

      {/* ── Selector de período ── */}
      <div className={s.periodBar}>
        <div className={s.periodPicker}>
          <button
            type="button"
            className={s.periodArrow}
            onClick={() => moverPeriodo(-1)}
            aria-label="Período anterior"
          >
            <ChevronLeft size={17} />
          </button>
          <div className={s.periodLabel}>
            <CalendarDays size={15} />
            <span>
              {nombreMes(mes)} {anio}
            </span>
          </div>
          <button
            type="button"
            className={s.periodArrow}
            onClick={() => moverPeriodo(1)}
            disabled={enTope}
            aria-label="Período siguiente"
          >
            <ChevronRight size={17} />
          </button>
        </div>

        <div className={s.periodTotals}>
          <span>
            <b>{prestaciones.length}</b> prestaciones
          </span>
          <span className={s.periodMonto}>{formatMoneda(totalPeriodo)}</span>
        </div>
      </div>

      {fueraDelAbierto && (
        <p className={s.aviso}>
          <AlertTriangle size={16} />
          Estás viendo un período cerrado. Lo que cargues va siempre al período
          abierto ({nombreMes(tope.mes)} {tope.anio}).
        </p>
      )}

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
              <PrestacionForm os={os} enviando={enviando} onSubmit={handleValidar} />
            )}
          </div>
        </section>
      )}

      {tab === "periodo" && (
        <section className={s.panel}>
          <div className={s.panelHead}>
            <h2 className={s.cardTitle}>
              Prestaciones de {nombreMes(mes)} {anio}
            </h2>
            <button type="button" className={s.linkBtn} onClick={() => setTab("carga")}>
              <PlusCircle size={15} /> Cargar otra
            </button>
          </div>
          <PrestacionesTable
            prestaciones={prestaciones}
            cargando={cargandoLista}
            permiteAdjuntarOrden={os.permiteAdjuntarOrden}
            onEliminar={setAEliminar}
            onAdjuntar={(p) => {
              setArchivo(null);
              setAAdjuntar(p);
            }}
          />
        </section>
      )}

      {tab === "historial" && (
        <section className={s.panel}>
          <h2 className={s.cardTitle}>Períodos cargados</h2>
          <p className={s.cardSub}>
            Cada período agrupa lo autorizado en el mes. El comprobante es el mismo
            listado que se presenta con la facturación.
          </p>
          <PeriodosTable
            periodos={periodos}
            cargando={cargandoPeriodos}
            onVerComprobante={(p) => {
              setMes(p.mes);
              setAnio(p.anio);
              setTab("periodo");
            }}
          />
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
  const { estado, mensaje, prestacion } = resultado;
  const Icono =
    estado === "autorizada" || estado === "cargada"
      ? BadgeCheck
      : estado === "pendiente"
        ? Info
        : estado === "incierto"
          ? AlertTriangle
          : CircleAlert;

  const titulo =
    estado === "autorizada"
      ? "Prestación autorizada"
      : estado === "cargada"
        ? "Prestación cargada"
        : estado === "pendiente"
          ? "Requiere gestión del afiliado"
          : estado === "incierto"
            ? "No sabemos si se cargó"
            : "No se pudo cargar la prestación";

  return (
    <div className={`${s.resultado} ${s[`resultado_${estado}`]}`} role="status">
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

      {!prestacion && estado === "rechazada" && (
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
        <p className={s.subtitle}>{os.descripcion}</p>
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

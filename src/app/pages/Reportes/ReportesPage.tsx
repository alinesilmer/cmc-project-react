import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  FileCode2,
  LayoutDashboard,
  ListOrdered,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  getCodigos,
  getCodigosDeMedico,
  getEvolucion,
  getMedicos,
  getMedicosDeCodigo,
  getObrasSociales,
  getPrestaciones,
  getResumen,
} from "./reportes.api";
import type {
  CodigoStat,
  MedicoStat,
  ObraSocialStat,
  PrestacionReporte,
} from "./reportes.types";
import {
  aLimite,
  money,
  moneyExacto,
  numero,
  periodoActual,
  periodoLargo,
  ultimosPeriodos,
  type OrdenCodigos,
  type Tope,
  type ValidacionEstado,
} from "./reportes.types";
import {
  BotonesExportar,
  Buscador,
  Cargando,
  ErrorBox,
  EstadoChip,
  GraficoEvolucion,
  GraficoRanking,
  Kpi,
  Pager,
  PagerSimple,
  SelectorMesAnio,
  SelectorTope,
  Vacio,
  type BarraDato,
} from "./ReportesUI";
import { exportarCsv, exportarExcel, nombreArchivo } from "./exportar";
import { useDebounce } from "./useDebounce";
import styles from "./Reportes.module.scss";

const LIMIT_TABLA = 25;
const LIMIT_DETALLE = 25;

/** Qué reporte se está mirando. Se muestra uno por vez. */
type Vista = "resumen" | "codigos" | "medicos" | "obras" | "detalle";

const VISTAS: { id: Vista; label: string; icono: LucideIcon }[] = [
  { id: "resumen", label: "Resumen", icono: LayoutDashboard },
  { id: "codigos", label: "Códigos", icono: FileCode2 },
  { id: "medicos", label: "Médicos", icono: Users },
  { id: "obras", label: "Obras sociales", icono: Building2 },
  { id: "detalle", label: "Prestaciones", icono: ListOrdered },
];

/** 5 minutos: los períodos cerrados no cambian, y los abiertos no tanto. */
const STALE = 5 * 60 * 1000;

/**
 * Reportes y Estadísticas del Colegio.
 *
 * Todo se calcula en la base (`/api/reportes`): acá sólo se pide lo que se
 * muestra. Cada tabla trae como mucho 25 filas y el detalle va paginado del
 * lado del servidor — nunca se descarga un período entero al navegador.
 *
 * La página está pensada para recorrerse "de arriba hacia abajo y hacia
 * adentro": los KPIs dan el panorama, los rankings dicen dónde mirar, y desde
 * cualquier fila se baja al detalle sin perder el período elegido.
 */
const ReportesPage: React.FC = () => {
  // Años disponibles para el selector: los que cubren los últimos 24 períodos.
  const anios = useMemo(() => {
    const set = new Set(ultimosPeriodos(24).map((p) => Number(p.slice(0, 4))));
    return [...set].sort((a, b) => b - a);
  }, []);
  const [periodo, setPeriodo] = useState(periodoActual());

  // Un reporte por vez. Además de no abrumar, hace que sólo se consulte lo que
  // se está mirando: entrar a la pantalla dispara 2 queries en vez de 7.
  const [vista, setVista] = useState<Vista>("resumen");

  // Drill-down. Sólo uno a la vez: mezclar "código X" con "médico Y" daría una
  // tabla que no responde a ninguna pregunta concreta.
  const [codigoSel, setCodigoSel] = useState<string | null>(null);
  const [medicoSel, setMedicoSel] = useState<{ nro: string; nombre: string } | null>(null);

  // Filtros del detalle
  const [obraSocial, setObraSocial] = useState("");
  const [estado, setEstado] = useState<"" | ValidacionEstado>("");
  const [orden, setOrden] = useState<OrdenCodigos>("importe");
  const [offset, setOffset] = useState(0);

  // El input responde a cada tecla; el pedido sale cuando el usuario frena.
  const [buscarCodigo, setBuscarCodigo] = useState("");
  const qCodigo = useDebounce(buscarCodigo, 350);
  const [buscarMedico, setBuscarMedico] = useState("");
  const qMedico = useDebounce(buscarMedico, 350);

  // Paginación propia de cada tabla agregada. Se resetea sola cuando cambia
  // algo que altera el conjunto de resultados (ver los efectos de más abajo).
  const [offsetCodigos, setOffsetCodigos] = useState(0);
  const [offsetMedicos, setOffsetMedicos] = useState(0);

  // Sobre cuántos registros se arma cada ranking. Manda la consulta y el
  // gráfico a la vez: si se piden 5, se piden 5 al servidor y se grafican 5.
  const [topeCodigos, setTopeCodigos] = useState<Tope>(25);
  const [topeMedicos, setTopeMedicos] = useState<Tope>(25);
  const [topeObras, setTopeObras] = useState<Tope>(10);

  useEffect(() => {
    setOffsetCodigos(0);
  }, [periodo, obraSocial, orden, qCodigo, topeCodigos]);

  useEffect(() => {
    setOffsetMedicos(0);
  }, [periodo, obraSocial, qMedico, topeMedicos]);

  const comun = { staleTime: STALE, retry: 1 } as const;

  const resumen = useQuery({
    queryKey: ["rep-resumen", periodo],
    queryFn: () => getResumen(periodo),
    ...comun,
  });

  const evolucion = useQuery({
    queryKey: ["rep-evolucion", obraSocial],
    queryFn: () => getEvolucion({ obra_social: obraSocial || undefined, meses: 12 }),
    enabled: vista === "resumen",
    ...comun,
  });

  const codigos = useQuery({
    queryKey: ["rep-codigos", periodo, obraSocial, orden, qCodigo, offsetCodigos, topeCodigos],
    queryFn: () =>
      getCodigos({
        periodo,
        obra_social: obraSocial || undefined,
        q: qCodigo || undefined,
        orden,
        limit: aLimite(topeCodigos),
        offset: offsetCodigos,
      }),
    // Sólo se pide si es la vista activa (o si hace falta para el drill-down).
    enabled: vista === "codigos",
    placeholderData: (prev) => prev,
    ...comun,
  });

  const medicos = useQuery({
    queryKey: ["rep-medicos", periodo, obraSocial, qMedico, offsetMedicos, topeMedicos],
    queryFn: () =>
      getMedicos({
        periodo,
        obra_social: obraSocial || undefined,
        q: qMedico || undefined,
        limit: aLimite(topeMedicos),
        offset: offsetMedicos,
      }),
    enabled: vista === "medicos",
    placeholderData: (prev) => prev,
    ...comun,
  });

  const obras = useQuery({
    queryKey: ["rep-obras", periodo, topeObras],
    queryFn: () => getObrasSociales({ periodo, limit: aLimite(topeObras) }),
    // Alimenta el gráfico Y el selector de obra social del encabezado, que se
    // usa desde cualquier vista: por eso no se gatea.
    ...comun,
  });

  // Drill-down: quiénes facturaron el código elegido.
  const medicosDeCodigo = useQuery({
    queryKey: ["rep-cod-medicos", codigoSel, periodo, obraSocial],
    queryFn: () =>
      getMedicosDeCodigo(codigoSel as string, {
        periodo,
        obra_social: obraSocial || undefined,
        limit: LIMIT_TABLA,
      }),
    enabled: Boolean(codigoSel),
    ...comun,
  });

  // Drill-down: qué facturó el médico elegido.
  const codigosDeMedico = useQuery({
    queryKey: ["rep-med-codigos", medicoSel?.nro, periodo, obraSocial],
    queryFn: () =>
      getCodigosDeMedico(medicoSel!.nro, {
        periodo,
        obra_social: obraSocial || undefined,
        limit: LIMIT_TABLA,
      }),
    enabled: Boolean(medicoSel),
    ...comun,
  });

  const detalle = useQuery({
    queryKey: [
      "rep-prestaciones",
      periodo,
      obraSocial,
      estado,
      codigoSel,
      medicoSel?.nro,
      offset,
    ],
    queryFn: () =>
      getPrestaciones({
        periodo,
        obra_social: obraSocial || undefined,
        validacion_estado: estado || undefined,
        codigo: codigoSel || undefined,
        nro_socio: medicoSel?.nro,
        limit: LIMIT_DETALLE,
        offset,
      }),
    enabled: vista === "detalle",
    // Mantiene la página anterior visible mientras carga la siguiente: sin esto
    // la tabla parpadea a vacío en cada click del paginador.
    placeholderData: (prev) => prev,
    ...comun,
  });

  const barrasMedicos: BarraDato[] = useMemo(
    () =>
      // Se grafica exactamente lo que se pidió: el tope lo elige el usuario.
      (medicos.data ?? []).map((m) => ({
        etiqueta: (m.nombre ?? m.nro_socio).slice(0, 22),
        valor: m.importe_total,
        detalle: `${numero.format(m.prestaciones)} prestaciones`,
      })),
    [medicos.data]
  );

  /**
   * Obras sociales: barras horizontales, NO torta.
   *
   * El Colegio tiene decenas de obras sociales. Una torta con esa cantidad de
   * porciones es ilegible, y recortarla a 6 miente sobre el total. Las barras
   * ordenadas se leen de un vistazo, aguantan nombres largos, y lo que queda
   * afuera del top se agrupa en "Otras" para que la suma siga cerrando.
   */
  const barrasObras: BarraDato[] = useMemo(() => {
    const todas = obras.data ?? [];
    const TOP = 9;
    const top = todas.slice(0, TOP).map((o) => ({
      etiqueta: (o.nombre ?? `O.S. ${o.obra_social_nro}`).slice(0, 24),
      valor: o.importe_total,
      detalle: `${numero.format(o.medicos)} médicos · ${numero.format(o.prestaciones)} prestaciones`,
    }));
    const resto = todas.slice(TOP);
    if (resto.length) {
      top.push({
        etiqueta: `Otras (${resto.length})`,
        valor: resto.reduce((a, o) => a + o.importe_total, 0),
        detalle: `${resto.length} obras sociales agrupadas`,
      });
    }
    return top;
  }, [obras.data]);

  /** Códigos: barras, que es lo que sirve para comparar magnitudes. */
  const barrasCodigos: BarraDato[] = useMemo(
    () =>
      (codigos.data ?? []).map((c) => ({
        etiqueta: c.codigo,
        valor: c.importe_total,
        detalle: `${c.descripcion ?? ""} · ${numero.format(c.prestaciones)} prestaciones`,
      })),
    [codigos.data]
  );

  const cambiarFiltro = (fn: () => void) => {
    fn();
    setOffset(0); // cualquier cambio de filtro invalida la página actual
  };

  // Columnas de exportación. Se exporta el valor CRUDO (número sin formatear)
  // para que Excel pueda sumar la columna: el formato es cosa de la pantalla.
  const colsCodigos = [
    { header: "Código", value: (c: CodigoStat) => c.codigo },
    { header: "Descripción", value: (c: CodigoStat) => c.descripcion ?? "" },
    { header: "Cantidad", value: (c: CodigoStat) => c.cantidad },
    { header: "Prestaciones", value: (c: CodigoStat) => c.prestaciones },
    { header: "Médicos", value: (c: CodigoStat) => c.medicos },
    { header: "Facturado", value: (c: CodigoStat) => c.importe_total },
  ];
  const colsMedicos = [
    { header: "Nro socio", value: (m: MedicoStat) => m.nro_socio },
    { header: "Médico", value: (m: MedicoStat) => m.nombre ?? "" },
    { header: "Prestaciones", value: (m: MedicoStat) => m.prestaciones },
    { header: "Cantidad", value: (m: MedicoStat) => m.cantidad },
    { header: "Facturado", value: (m: MedicoStat) => m.importe_total },
  ];
  const colsObras = [
    { header: "Nro O.S.", value: (o: ObraSocialStat) => o.obra_social_nro },
    { header: "Obra social", value: (o: ObraSocialStat) => o.nombre ?? "" },
    { header: "Médicos", value: (o: ObraSocialStat) => o.medicos },
    { header: "Prestaciones", value: (o: ObraSocialStat) => o.prestaciones },
    { header: "Facturado", value: (o: ObraSocialStat) => o.importe_total },
  ];
  const colsDetalle = [
    { header: "Fecha", value: (p: PrestacionReporte) => p.fecha ?? "" },
    { header: "Período", value: (p: PrestacionReporte) => p.periodo },
    { header: "Código", value: (p: PrestacionReporte) => p.codigo ?? "" },
    { header: "Descripción", value: (p: PrestacionReporte) => p.descripcion ?? "" },
    { header: "Nro socio", value: (p: PrestacionReporte) => p.nro_socio },
    { header: "Médico", value: (p: PrestacionReporte) => p.medico ?? "" },
    {
      header: "Afiliado",
      value: (p: PrestacionReporte) => p.afiliado ?? p.nro_afiliado ?? "",
    },
    {
      header: "Estado",
      value: (p: PrestacionReporte) => p.validacion_estado ?? "sin validar",
    },
    { header: "Autorización", value: (p: PrestacionReporte) => p.autorizacion ?? "" },
    { header: "Cantidad", value: (p: PrestacionReporte) => p.cantidad },
    { header: "Importe", value: (p: PrestacionReporte) => p.importe_total },
  ];

  const [exportando, setExportando] = useState(false);

  /**
   * Baja el detalle COMPLETO del filtro actual, no sólo la página visible: un
   * archivo con 25 filas de 1.771 no le sirve a nadie.
   *
   * Va de a 200 (el tope del servidor) y corta en 5.000 filas, para que una
   * descarga sin filtrar no cuelgue el navegador ni castigue la base.
   */
  const bajarDetalle = async (formato: "csv" | "xlsx") => {
    setExportando(true);
    try {
      const TOPE = 5000;
      const PASO = 200;
      const filas: PrestacionReporte[] = [];
      for (let off = 0; off < TOPE; off += PASO) {
        const pag = await getPrestaciones({
          periodo,
          obra_social: obraSocial || undefined,
          validacion_estado: estado || undefined,
          codigo: codigoSel || undefined,
          nro_socio: medicoSel?.nro,
          limit: PASO,
          offset: off,
        });
        filas.push(...pag.items);
        if (filas.length >= pag.total || pag.items.length < PASO) break;
      }
      const nombre = nombreArchivo("prestaciones", periodo);
      if (formato === "csv") exportarCsv(filas, colsDetalle, nombre);
      else await exportarExcel(filas, colsDetalle, nombre, "Prestaciones");
    } finally {
      setExportando(false);
    }
  };

  const r = resumen.data;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.head}>
          <div>
            <h1 className={styles.title}>
              <BarChart3 size={26} style={{ verticalAlign: "-4px", marginRight: 8 }} />
              Reportes y estadísticas
            </h1>
            <p className={styles.subtitle}>
              Qué se facturó en {periodoLargo(periodo)}: por código, por médico y
              por obra social.
            </p>
          </div>

          <div className={styles.controls}>
            <SelectorMesAnio
              periodo={periodo}
              onChange={(v) => cambiarFiltro(() => setPeriodo(v))}
              anios={anios}
            />
            <div className={styles.field}>
              <label className={styles.label} htmlFor="os">
                Obra social
              </label>
              <select
                id="os"
                className={styles.select}
                value={obraSocial}
                onChange={(e) => cambiarFiltro(() => setObraSocial(e.target.value))}
              >
                <option value="">Todas</option>
                {(obras.data ?? []).map((o) => (
                  <option key={o.obra_social_nro} value={o.obra_social_nro}>
                    {o.nombre ?? `O.S. ${o.obra_social_nro}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* ── KPIs ── */}
        {resumen.isError ? (
          <ErrorBox>
            No se pudieron cargar los totales del período. Puede que no tengas
            permiso para ver reportes.
          </ErrorBox>
        ) : resumen.isLoading || !r ? (
          <div className={styles.kpis}>
            <Cargando filas={1} />
            <Cargando filas={1} />
            <Cargando filas={1} />
            <Cargando filas={1} />
          </div>
        ) : (
          <div className={styles.kpis}>
            <Kpi
              label="Facturado"
              value={money.format(r.importe_total)}
              hint={`Honorarios ${money.format(r.honorarios)}`}
              accent="gold"
            />
            <Kpi
              label="Prestaciones"
              value={numero.format(r.prestaciones)}
              hint={`${numero.format(r.codigos)} códigos distintos`}
            />
            <Kpi
              label="Médicos"
              value={numero.format(r.medicos)}
              hint="con actividad en el período"
              accent="blue"
            />
            <Kpi
              label="Obras sociales"
              value={numero.format(r.obras_sociales)}
              hint="con prestaciones facturadas"
              accent="green"
            />
          </div>
        )}


        {/* Un reporte por vez: elegir primero evita la pared de tablas y
            hace que sólo se consulte lo que se está mirando. */}
        <nav className={styles.tabs} aria-label="Tipo de reporte">
          {VISTAS.map((v) => {
            const Icono = v.icono;
            const activa = vista === v.id;
            return (
              <button
                key={v.id}
                type="button"
                className={`${styles.tab} ${activa ? styles.tabOn : ""}`}
                onClick={() => setVista(v.id)}
                aria-current={activa ? "page" : undefined}
              >
                <Icono size={16} />
                {v.label}
              </button>
            );
          })}
        </nav>

        {/* ── Evolución ── */}
        {vista === "resumen" && (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.cardTitle}>Evolución</h2>
              <p className={styles.cardSub}>
                Últimos 12 períodos con movimiento
                {obraSocial ? " · filtrado por obra social" : ""}.
              </p>
            </div>
          </div>
          {evolucion.isLoading ? (
            <Cargando filas={3} />
          ) : evolucion.isError ? (
            <ErrorBox>No se pudo cargar la evolución.</ErrorBox>
          ) : (
            <GraficoEvolucion datos={evolucion.data ?? []} />
          )}
        </section>
        )}

        {/* ── Rankings ── */}
        {vista === "medicos" && (
        <div className={styles.grid2}>
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <h2 className={styles.cardTitle}>Médicos que más facturaron</h2>
                <p className={styles.cardSub}>
                  Tocá un nombre para ver qué códigos facturó.
                </p>
              </div>
              <div className={styles.controls}>
                <SelectorTope
                  id="tope-medicos"
                  value={topeMedicos}
                  onChange={setTopeMedicos}
                />
                <Buscador
                  id="buscar-medico"
                  value={buscarMedico}
                  onChange={setBuscarMedico}
                  placeholder="Nombre o nro de socio…"
                />
                <BotonesExportar
                  disabled={!(medicos.data ?? []).length}
                  onCsv={() =>
                    exportarCsv(
                      medicos.data ?? [],
                      colsMedicos,
                      nombreArchivo("medicos", periodo)
                    )
                  }
                  onExcel={() =>
                    exportarExcel(
                      medicos.data ?? [],
                      colsMedicos,
                      nombreArchivo("medicos", periodo),
                      "Médicos"
                    )
                  }
                />
              </div>
            </div>

            {medicos.isLoading ? (
              <Cargando />
            ) : medicos.isError ? (
              <ErrorBox>No se pudo cargar el ranking de médicos.</ErrorBox>
            ) : (medicos.data ?? []).length === 0 ? (
              <Vacio>Sin facturación en este período.</Vacio>
            ) : (
              <>
                <GraficoRanking datos={barrasMedicos} />
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Médico</th>
                        <th className={styles.num}>Prest.</th>
                        <th className={styles.num}>Facturado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(medicos.data ?? []).map((m, i) => (
                        <tr key={m.nro_socio}>
                          <td>
                            <span className={`${styles.rank} ${i < 3 ? styles.rankTop : ""}`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className={styles.nombre}>
                            <button
                              type="button"
                              className={styles.rowBtn}
                              onClick={() =>
                                cambiarFiltro(() => {
                                  setCodigoSel(null);
                                  setMedicoSel({
                                    nro: m.nro_socio,
                                    nombre: m.nombre ?? m.nro_socio,
                                  });
                                })
                              }
                            >
                              {m.nombre ?? `Socio ${m.nro_socio}`}
                            </button>
                          </td>
                          <td className={styles.num}>{numero.format(m.prestaciones)}</td>
                          <td className={styles.num}>{money.format(m.importe_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PagerSimple
                  offset={offsetMedicos}
                  limit={aLimite(topeMedicos)}
                  cantidad={(medicos.data ?? []).length}
                  onChange={setOffsetMedicos}
                  cargando={medicos.isFetching}
                />
              </>
            )}
          </section>
        </div>
        )}

        {vista === "obras" && (
        <div className={styles.grid2}>
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <h2 className={styles.cardTitle}>Obras sociales</h2>
                <p className={styles.cardSub}>
                  Participación de cada una en el período.
                </p>
              </div>
              <div className={styles.controls}>
                <SelectorTope
                  id="tope-obras"
                  value={topeObras}
                  onChange={setTopeObras}
                />
              </div>
              <BotonesExportar
                disabled={!(obras.data ?? []).length}
                onCsv={() =>
                  exportarCsv(
                    obras.data ?? [],
                    colsObras,
                    nombreArchivo("obras-sociales", periodo)
                  )
                }
                onExcel={() =>
                  exportarExcel(
                    obras.data ?? [],
                    colsObras,
                    nombreArchivo("obras-sociales", periodo),
                    "Obras sociales"
                  )
                }
              />
            </div>

            {obras.isLoading ? (
              <Cargando />
            ) : obras.isError ? (
              <ErrorBox>No se pudo cargar el ranking de obras sociales.</ErrorBox>
            ) : (obras.data ?? []).length === 0 ? (
              <Vacio>Sin facturación en este período.</Vacio>
            ) : (
              <>
                <GraficoRanking datos={barrasObras} />
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Obra social</th>
                        <th className={styles.num}>Médicos</th>
                        <th className={styles.num}>Prest.</th>
                        <th className={styles.num}>Facturado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(obras.data ?? []).map((o) => (
                        <tr key={o.obra_social_nro}>
                          <td className={styles.nombre}>
                            <button
                              type="button"
                              className={styles.rowBtn}
                              onClick={() =>
                                cambiarFiltro(() => setObraSocial(o.obra_social_nro))
                              }
                            >
                              {o.nombre ?? `O.S. ${o.obra_social_nro}`}
                            </button>
                          </td>
                          <td className={styles.num}>{numero.format(o.medicos)}</td>
                          <td className={styles.num}>{numero.format(o.prestaciones)}</td>
                          <td className={styles.num}>{money.format(o.importe_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
        )}

        {/* ── Tabla de códigos ── */}
        {vista === "codigos" && (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.cardTitle}>Códigos</h2>
              <p className={styles.cardSub}>
                Tocá un código para ver quiénes lo facturaron.
              </p>
            </div>
            <div className={styles.controls}>
              <SelectorTope
                id="tope-codigos"
                value={topeCodigos}
                onChange={setTopeCodigos}
              />
              <Buscador
                id="buscar-codigo"
                value={buscarCodigo}
                onChange={(v) => cambiarFiltro(() => setBuscarCodigo(v))}
                placeholder="Código o descripción…"
              />
              <div className={styles.field}>
                <label className={styles.label} htmlFor="orden">
                  Ordenar por
                </label>
                <select
                  id="orden"
                  className={styles.select}
                  value={orden}
                  onChange={(e) => setOrden(e.target.value as OrdenCodigos)}
                >
                  <option value="importe">Facturado</option>
                  <option value="cantidad">Cantidad</option>
                  <option value="prestaciones">Prestaciones</option>
                  <option value="codigo">Código</option>
                </select>
              </div>
              <BotonesExportar
                disabled={!(codigos.data ?? []).length}
                onCsv={() =>
                  exportarCsv(
                    codigos.data ?? [],
                    colsCodigos,
                    nombreArchivo("codigos", periodo)
                  )
                }
                onExcel={() =>
                  exportarExcel(
                    codigos.data ?? [],
                    colsCodigos,
                    nombreArchivo("codigos", periodo),
                    "Códigos"
                  )
                }
              />
            </div>
          </div>

          {codigos.isLoading ? (
            <Cargando />
          ) : codigos.isError ? (
            <ErrorBox>No se pudo cargar la tabla de códigos.</ErrorBox>
          ) : (codigos.data ?? []).length === 0 ? (
            <Vacio>Sin códigos facturados en este período.</Vacio>
          ) : (
            <>
            <GraficoRanking datos={barrasCodigos} />
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th className={styles.num}>Cant.</th>
                    <th className={styles.num}>Prest.</th>
                    <th className={styles.num}>Médicos</th>
                    <th className={styles.num}>Facturado</th>
                  </tr>
                </thead>
                <tbody>
                  {(codigos.data ?? []).map((c) => (
                    <tr key={c.codigo}>
                      <td>
                        <button
                          type="button"
                          className={styles.rowBtn}
                          onClick={() =>
                            cambiarFiltro(() => {
                              setMedicoSel(null);
                              setCodigoSel(c.codigo);
                            })
                          }
                        >
                          {c.codigo}
                        </button>
                      </td>
                      <td className={styles.nombre}>{c.descripcion ?? "—"}</td>
                      <td className={styles.num}>{numero.format(c.cantidad)}</td>
                      <td className={styles.num}>{numero.format(c.prestaciones)}</td>
                      <td className={styles.num}>{numero.format(c.medicos)}</td>
                      <td className={styles.num}>{money.format(c.importe_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PagerSimple
                offset={offsetCodigos}
                limit={aLimite(topeCodigos)}
                cantidad={(codigos.data ?? []).length}
                onChange={setOffsetCodigos}
                cargando={codigos.isFetching}
              />
            </div>
            </>
          )}
        </section>
        )}

        {/* ── Drill-down: médicos de un código ── */}
        {codigoSel && (
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <h2 className={styles.cardTitle}>Quiénes facturaron {codigoSel}</h2>
                <p className={styles.cardSub}>
                  En {periodoLargo(periodo)}, de mayor a menor.
                </p>
              </div>
              <span className={styles.filtroActivo}>
                Código {codigoSel}
                <button
                  type="button"
                  className={styles.filtroQuitar}
                  onClick={() => cambiarFiltro(() => setCodigoSel(null))}
                  aria-label="Quitar filtro de código"
                >
                  <X size={14} />
                </button>
              </span>
            </div>

            {medicosDeCodigo.isLoading ? (
              <Cargando />
            ) : (medicosDeCodigo.data ?? []).length === 0 ? (
              <Vacio>Nadie facturó este código en el período.</Vacio>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Médico</th>
                      <th className={styles.num}>Cant.</th>
                      <th className={styles.num}>Prest.</th>
                      <th className={styles.num}>Facturado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(medicosDeCodigo.data ?? []).map((m, i) => (
                      <tr key={m.nro_socio}>
                        <td>
                          <span className={`${styles.rank} ${i < 3 ? styles.rankTop : ""}`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className={styles.nombre}>{m.nombre ?? `Socio ${m.nro_socio}`}</td>
                        <td className={styles.num}>{numero.format(m.cantidad)}</td>
                        <td className={styles.num}>{numero.format(m.prestaciones)}</td>
                        <td className={styles.num}>{money.format(m.importe_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── Drill-down: códigos de un médico ── */}
        {medicoSel && (
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <h2 className={styles.cardTitle}>Qué facturó {medicoSel.nombre}</h2>
                <p className={styles.cardSub}>
                  En {periodoLargo(periodo)}, abierto por código.
                </p>
              </div>
              <span className={styles.filtroActivo}>
                Socio {medicoSel.nro}
                <button
                  type="button"
                  className={styles.filtroQuitar}
                  onClick={() => cambiarFiltro(() => setMedicoSel(null))}
                  aria-label="Quitar filtro de médico"
                >
                  <X size={14} />
                </button>
              </span>
            </div>

            {codigosDeMedico.isLoading ? (
              <Cargando />
            ) : (codigosDeMedico.data ?? []).length === 0 ? (
              <Vacio>Este médico no facturó en el período.</Vacio>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th className={styles.num}>Cant.</th>
                      <th className={styles.num}>Facturado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(codigosDeMedico.data ?? []).map((c) => (
                      <tr key={c.codigo}>
                        <td>{c.codigo}</td>
                        <td className={styles.nombre}>{c.descripcion ?? "—"}</td>
                        <td className={styles.num}>{numero.format(c.cantidad)}</td>
                        <td className={styles.num}>{money.format(c.importe_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── Detalle prestación por prestación ── */}
        {vista === "detalle" && (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.cardTitle}>Detalle de prestaciones</h2>
              <p className={styles.cardSub}>
                Una fila por prestación, con lo que respondió la obra social.
              </p>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="estado">
                Estado
              </label>
              <select
                id="estado"
                className={styles.select}
                value={estado}
                onChange={(e) =>
                  cambiarFiltro(() => setEstado(e.target.value as "" | ValidacionEstado))
                }
              >
                <option value="">Todos</option>
                <option value="autorizada">Autorizada</option>
                <option value="rechazada">Rechazada</option>
                <option value="pendiente">Pendiente</option>
                <option value="cargada">Cargada</option>
              </select>
            </div>
            <BotonesExportar
              disabled={!(detalle.data?.items ?? []).length || exportando}
              onCsv={() => void bajarDetalle("csv")}
              onExcel={() => void bajarDetalle("xlsx")}
            />
          </div>

          {detalle.isError ? (
            <ErrorBox>No se pudo cargar el detalle.</ErrorBox>
          ) : detalle.isLoading && !detalle.data ? (
            <Cargando filas={5} />
          ) : (detalle.data?.items ?? []).length === 0 ? (
            <Vacio>No hay prestaciones con estos filtros.</Vacio>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Código</th>
                      <th>Médico</th>
                      <th>Afiliado</th>
                      <th>Estado</th>
                      <th className={styles.num}>Cant.</th>
                      <th className={styles.num}>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detalle.data?.items ?? []).map((p) => (
                      <tr key={p.id}>
                        <td>{p.fecha ?? "—"}</td>
                        <td title={p.descripcion ?? undefined}>{p.codigo ?? "—"}</td>
                        <td className={styles.nombre}>{p.medico ?? `Socio ${p.nro_socio}`}</td>
                        <td className={styles.nombre}>
                          {p.afiliado ?? p.nro_afiliado ?? "—"}
                        </td>
                        <td>
                          <EstadoChip estado={p.validacion_estado} />
                        </td>
                        <td className={styles.num}>{numero.format(p.cantidad)}</td>
                        <td className={styles.num}>{moneyExacto.format(p.importe_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pager
                offset={offset}
                limit={LIMIT_DETALLE}
                total={detalle.data?.total ?? 0}
                onChange={setOffset}
                cargando={detalle.isFetching}
              />
            </>
          )}
        </section>
        )}
      </div>
    </div>
  );
};

export default ReportesPage;

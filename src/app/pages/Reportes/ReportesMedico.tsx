import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  getCodigosDeMedico,
  getEvolucion,
  getMiEvolucion,
  getMiResumen,
  getMisCodigos,
  getMisObrasSociales,
  getMisPrestaciones,
  getObrasSociales,
  getPrestaciones,
  getResumen,
} from "./reportes.api";
import type { CodigoStat, PrestacionReporte } from "./reportes.types";
import {
  money,
  moneyExacto,
  numero,
  periodoActual,
  periodoLargo,
  ultimosPeriodos,
} from "./reportes.types";
import {
  BotonesExportar,
  Cargando,
  ErrorBox,
  EstadoChip,
  GraficoEvolucion,
  Kpi,
  Pager,
  SelectorMesAnio,
  Vacio,
} from "./ReportesUI";
import { exportarCsv, exportarExcel, nombreArchivo } from "./exportar";
import styles from "./Reportes.module.scss";

const LIMIT = 20;
const STALE = 5 * 60 * 1000;

interface Props {
  /** Socio del que se muestran los números. */
  nroSocio: string;
  /**
   * `true` cuando el médico está mirando SU PROPIO legajo.
   *
   * No es cosmético: decide contra qué familia de endpoints se pega.
   *   · propio  → `/api/reportes/mios/*`, que sólo piden estar logueado y sacan
   *               el socio del token (el `nroSocio` de arriba ni se manda).
   *   · ajeno   → `/api/reportes/*`, que exigen el scope `facturas:ver`.
   *
   * Así un médico nunca puede pedir los números de otro ni por error ni
   * manipulando la URL: el endpoint que usaría no acepta el parámetro.
   */
  propio: boolean;
}

/**
 * Panel de facturación de UN médico, para la pestaña "Reportes" del legajo.
 *
 * Responde las preguntas concretas que se hacen en el mostrador: cuánto facturó
 * en el período, a qué obras sociales y con qué códigos — por ejemplo cuánto
 * lleva del 420101.
 */
const ReportesMedico: React.FC<Props> = ({ nroSocio, propio }) => {
  const anios = useMemo(() => {
    const set = new Set(ultimosPeriodos(24).map((p) => Number(p.slice(0, 4))));
    return [...set].sort((a, b) => b - a);
  }, []);

  const [periodo, setPeriodo] = useState(periodoActual());
  const [obraSocial, setObraSocial] = useState("");
  const [codigo, setCodigo] = useState("");
  const [offset, setOffset] = useState(0);

  // Cualquier cambio de filtro invalida la página en la que se estaba.
  useEffect(() => {
    setOffset(0);
  }, [periodo, obraSocial, codigo]);

  const comun = { staleTime: STALE, retry: 1 } as const;
  // Entra en todas las claves: sin esto, el caché de "mis números" y el de
  // "los números de este socio" se pisarían entre sí.
  const clave = [propio ? "mio" : "adm", nroSocio];

  const resumen = useQuery({
    queryKey: ["med-resumen", ...clave, periodo],
    queryFn: () =>
      propio ? getMiResumen(periodo) : getResumen(periodo),
    ...comun,
  });

  const evolucion = useQuery({
    queryKey: ["med-evolucion", ...clave],
    queryFn: () =>
      propio
        ? getMiEvolucion(12)
        : // El endpoint del Colegio no filtra la serie por médico, así que se
          // arma con los períodos del propio detalle (ver más abajo).
          getEvolucion({ meses: 12 }),
    // Sólo tiene sentido para el médico: la serie global no es "su" evolución.
    enabled: propio,
    ...comun,
  });

  const codigos = useQuery({
    queryKey: ["med-codigos", ...clave, periodo, obraSocial],
    queryFn: () =>
      propio
        ? getMisCodigos({
            periodo,
            obra_social: obraSocial || undefined,
            limit: LIMIT,
          })
        : getCodigosDeMedico(nroSocio, {
            periodo,
            obra_social: obraSocial || undefined,
            limit: LIMIT,
          }),
    ...comun,
  });

  const obras = useQuery({
    queryKey: ["med-obras", ...clave, periodo],
    queryFn: () =>
      propio
        ? getMisObrasSociales({ periodo, limit: LIMIT })
        : getObrasSociales({ periodo, limit: LIMIT }),
    ...comun,
  });

  const detalle = useQuery({
    queryKey: ["med-detalle", ...clave, periodo, obraSocial, codigo, offset],
    queryFn: () =>
      propio
        ? getMisPrestaciones({
            periodo,
            obra_social: obraSocial || undefined,
            codigo: codigo || undefined,
            limit: LIMIT,
            offset,
          })
        : getPrestaciones({
            periodo,
            nro_socio: nroSocio,
            obra_social: obraSocial || undefined,
            codigo: codigo || undefined,
            limit: LIMIT,
            offset,
          }),
    placeholderData: (prev) => prev,
    ...comun,
  });

  const colsCodigos = [
    { header: "Código", value: (c: CodigoStat) => c.codigo },
    { header: "Descripción", value: (c: CodigoStat) => c.descripcion ?? "" },
    { header: "Cantidad", value: (c: CodigoStat) => c.cantidad },
    { header: "Prestaciones", value: (c: CodigoStat) => c.prestaciones },
    { header: "Facturado", value: (c: CodigoStat) => c.importe_total },
  ];
  const colsDetalle = [
    { header: "Fecha", value: (p: PrestacionReporte) => p.fecha ?? "" },
    { header: "Código", value: (p: PrestacionReporte) => p.codigo ?? "" },
    { header: "Descripción", value: (p: PrestacionReporte) => p.descripcion ?? "" },
    {
      header: "Afiliado",
      value: (p: PrestacionReporte) => p.afiliado ?? p.nro_afiliado ?? "",
    },
    {
      header: "Estado",
      value: (p: PrestacionReporte) => p.validacion_estado ?? "sin validar",
    },
    { header: "Cantidad", value: (p: PrestacionReporte) => p.cantidad },
    { header: "Importe", value: (p: PrestacionReporte) => p.importe_total },
  ];

  const r = resumen.data;
  // Cuando lo mira el Colegio, el resumen es del período completo y no del
  // médico: sus totales propios salen de la tabla de códigos.
  const totalCodigos = (codigos.data ?? []).reduce(
    (a, c) => a + c.importe_total,
    0
  );
  const prestacionesMedico = (codigos.data ?? []).reduce(
    (a, c) => a + c.prestaciones,
    0
  );

  return (
    <div className={styles.medicoPanel}>
      <div className={styles.controls}>
        <SelectorMesAnio periodo={periodo} onChange={setPeriodo} anios={anios} />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="rm-os">
            Obra social
          </label>
          <select
            id="rm-os"
            className={styles.select}
            value={obraSocial}
            onChange={(e) => setObraSocial(e.target.value)}
          >
            <option value="">Todas</option>
            {(obras.data ?? []).map((o) => (
              <option key={o.obra_social_nro} value={o.obra_social_nro}>
                {o.nombre ?? `O.S. ${o.obra_social_nro}`}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="rm-cod">
            Código
          </label>
          <select
            id="rm-cod"
            className={styles.select}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          >
            <option value="">Todos</option>
            {(codigos.data ?? []).map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.codigo}
                {c.descripcion ? ` · ${c.descripcion.slice(0, 34)}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── KPIs ── */}
      {codigos.isError || resumen.isError ? (
        <ErrorBox>
          No se pudieron cargar los números de este período.
          {!propio && " Puede que no tengas permiso para ver facturación."}
        </ErrorBox>
      ) : codigos.isLoading ? (
        <div className={styles.kpis}>
          <Cargando filas={1} />
          <Cargando filas={1} />
          <Cargando filas={1} />
        </div>
      ) : (
        <div className={styles.kpis}>
          <Kpi
            label="Facturado en el período"
            value={money.format(propio && r ? r.importe_total : totalCodigos)}
            hint={periodoLargo(periodo)}
            accent="gold"
          />
          <Kpi
            label="Prestaciones"
            value={numero.format(
              propio && r ? r.prestaciones : prestacionesMedico
            )}
            hint={`${numero.format((codigos.data ?? []).length)} códigos distintos`}
          />
          <Kpi
            label="Obras sociales"
            // Sólo se sabe en el perfil propio: el resumen del Colegio cuenta
            // las obras sociales del período entero, no las de este médico.
            value={propio && r ? numero.format(r.obras_sociales) : "—"}
            hint={propio ? "con facturación" : "ver el detalle"}
            accent="blue"
          />
        </div>
      )}

      {/* La evolución sólo se muestra en el perfil propio: el endpoint del
          Colegio devuelve la serie global, que no es la de este médico. */}
      {propio && (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h3 className={styles.cardTitle}>Evolución</h3>
              <p className={styles.cardSub}>Últimos 12 períodos con actividad.</p>
            </div>
          </div>
          {evolucion.isLoading ? (
            <Cargando filas={2} />
          ) : (
            <GraficoEvolucion datos={evolucion.data ?? []} />
          )}
        </section>
      )}

      {/* ── Códigos ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <h3 className={styles.cardTitle}>Por código</h3>
            <p className={styles.cardSub}>
              Qué se facturó en {periodoLargo(periodo)}
              {obraSocial ? ", en la obra social elegida" : ""}.
            </p>
          </div>
          <BotonesExportar
            disabled={!(codigos.data ?? []).length}
            onCsv={() =>
              exportarCsv(
                codigos.data ?? [],
                colsCodigos,
                nombreArchivo(`codigos-socio-${nroSocio}`, periodo)
              )
            }
            onExcel={() =>
              exportarExcel(
                codigos.data ?? [],
                colsCodigos,
                nombreArchivo(`codigos-socio-${nroSocio}`, periodo),
                "Códigos"
              )
            }
          />
        </div>

        {codigos.isLoading ? (
          <Cargando />
        ) : (codigos.data ?? []).length === 0 ? (
          <Vacio>Sin facturación en este período.</Vacio>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th className={styles.num}>Cant.</th>
                  <th className={styles.num}>Prest.</th>
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
                        onClick={() => setCodigo(c.codigo)}
                        title="Ver sólo este código"
                      >
                        {c.codigo}
                      </button>
                    </td>
                    <td className={styles.nombre}>{c.descripcion ?? "—"}</td>
                    <td className={styles.num}>{numero.format(c.cantidad)}</td>
                    <td className={styles.num}>{numero.format(c.prestaciones)}</td>
                    <td className={styles.num}>{money.format(c.importe_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Detalle ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <h3 className={styles.cardTitle}>Prestaciones</h3>
            <p className={styles.cardSub}>
              Una por una, con lo que respondió la obra social.
            </p>
          </div>
          <BotonesExportar
            disabled={!(detalle.data?.items ?? []).length}
            onCsv={() =>
              exportarCsv(
                detalle.data?.items ?? [],
                colsDetalle,
                nombreArchivo(`prestaciones-socio-${nroSocio}`, periodo)
              )
            }
            onExcel={() =>
              exportarExcel(
                detalle.data?.items ?? [],
                colsDetalle,
                nombreArchivo(`prestaciones-socio-${nroSocio}`, periodo),
                "Prestaciones"
              )
            }
          />
        </div>

        {detalle.isError ? (
          <ErrorBox>No se pudo cargar el detalle.</ErrorBox>
        ) : detalle.isLoading && !detalle.data ? (
          <Cargando filas={4} />
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
                      <td className={styles.nombre}>
                        {p.afiliado ?? p.nro_afiliado ?? "—"}
                      </td>
                      <td>
                        <EstadoChip estado={p.validacion_estado} />
                      </td>
                      <td className={styles.num}>{numero.format(p.cantidad)}</td>
                      <td className={styles.num}>
                        {moneyExacto.format(p.importe_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pager
              offset={offset}
              limit={LIMIT}
              total={detalle.data?.total ?? 0}
              onChange={setOffset}
              cargando={detalle.isFetching}
            />
          </>
        )}
      </section>
    </div>
  );
};

export default ReportesMedico;

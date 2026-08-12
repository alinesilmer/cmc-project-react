import type React from "react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";

import {
  getMiEvolucion,
  getMiResumen,
  getMisCodigos,
  getMisObrasSociales,
  getMisPrestaciones,
} from "./reportes.api";
import {
  money,
  moneyExacto,
  numero,
  periodoActual,
  periodoLargo,
  ultimosPeriodos,
} from "./reportes.types";
import {
  Cargando,
  ErrorBox,
  EstadoChip,
  GraficoEvolucion,
  Kpi,
  Pager,
  SelectorPeriodo,
  Vacio,
} from "./ReportesUI";
import styles from "./Reportes.module.scss";

const LIMIT = 25;
const STALE = 5 * 60 * 1000;

/**
 * "Mis números" — la versión del médico.
 *
 * Es a propósito MÁS SIMPLE que la del Colegio: sin rankings entre colegas, sin
 * comparativas y sin filtro por médico. Sólo lo propio, que es exactamente lo
 * que devuelven los endpoints `/api/reportes/mios/*`: el número de socio sale
 * del token y no hay forma de pedir los datos de otro.
 */
const MisReportes: React.FC = () => {
  const periodos = useMemo(() => ultimosPeriodos(24), []);
  const [periodo, setPeriodo] = useState(periodoActual());
  const [offset, setOffset] = useState(0);

  const comun = { staleTime: STALE, retry: 1 } as const;

  const resumen = useQuery({
    queryKey: ["mis-resumen", periodo],
    queryFn: () => getMiResumen(periodo),
    ...comun,
  });

  const evolucion = useQuery({
    queryKey: ["mis-evolucion"],
    queryFn: () => getMiEvolucion(12),
    ...comun,
  });

  const codigos = useQuery({
    queryKey: ["mis-codigos", periodo],
    queryFn: () => getMisCodigos({ periodo, limit: LIMIT }),
    ...comun,
  });

  const obras = useQuery({
    queryKey: ["mis-obras", periodo],
    queryFn: () => getMisObrasSociales({ periodo, limit: LIMIT }),
    ...comun,
  });

  const detalle = useQuery({
    queryKey: ["mis-prestaciones", periodo, offset],
    queryFn: () => getMisPrestaciones({ periodo, limit: LIMIT, offset }),
    placeholderData: (prev) => prev,
    ...comun,
  });

  const r = resumen.data;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.head}>
          <div>
            <h1 className={styles.title}>
              <TrendingUp size={24} style={{ verticalAlign: "-3px", marginRight: 8 }} />
              Mis números
            </h1>
            <p className={styles.subtitle}>
              Lo que facturaste en {periodoLargo(periodo)}.
            </p>
          </div>
          <div className={styles.controls}>
            <SelectorPeriodo
              value={periodo}
              onChange={(v) => {
                setPeriodo(v);
                setOffset(0);
              }}
              periodos={periodos}
            />
          </div>
        </header>

        {resumen.isError ? (
          <ErrorBox>No se pudieron cargar tus totales. Probá de nuevo en un momento.</ErrorBox>
        ) : resumen.isLoading || !r ? (
          <div className={styles.kpis}>
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
              label="Obras sociales"
              value={numero.format(r.obras_sociales)}
              hint="a las que le facturaste"
              accent="blue"
            />
          </div>
        )}

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.cardTitle}>Cómo venís</h2>
              <p className={styles.cardSub}>Tus últimos 12 períodos con actividad.</p>
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

        <div className={styles.grid2}>
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <h2 className={styles.cardTitle}>Tus códigos</h2>
                <p className={styles.cardSub}>Qué facturaste en el período.</p>
              </div>
            </div>
            {codigos.isLoading ? (
              <Cargando />
            ) : codigos.isError ? (
              <ErrorBox>No se pudieron cargar tus códigos.</ErrorBox>
            ) : (codigos.data ?? []).length === 0 ? (
              <Vacio>No facturaste prestaciones en este período.</Vacio>
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
                    {(codigos.data ?? []).map((c) => (
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

          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <h2 className={styles.cardTitle}>Por obra social</h2>
                <p className={styles.cardSub}>A quién le facturaste más.</p>
              </div>
            </div>
            {obras.isLoading ? (
              <Cargando />
            ) : obras.isError ? (
              <ErrorBox>No se pudieron cargar las obras sociales.</ErrorBox>
            ) : (obras.data ?? []).length === 0 ? (
              <Vacio>Sin facturación en este período.</Vacio>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Obra social</th>
                      <th className={styles.num}>Prest.</th>
                      <th className={styles.num}>Facturado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(obras.data ?? []).map((o) => (
                      <tr key={o.obra_social_nro}>
                        <td className={styles.nombre}>
                          {o.nombre ?? `O.S. ${o.obra_social_nro}`}
                        </td>
                        <td className={styles.num}>{numero.format(o.prestaciones)}</td>
                        <td className={styles.num}>{money.format(o.importe_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.cardTitle}>Tus prestaciones</h2>
              <p className={styles.cardSub}>
                Una por una, con lo que respondió la obra social.
              </p>
            </div>
          </div>

          {detalle.isError ? (
            <ErrorBox>No se pudo cargar el detalle.</ErrorBox>
          ) : detalle.isLoading && !detalle.data ? (
            <Cargando filas={5} />
          ) : (detalle.data?.items ?? []).length === 0 ? (
            <Vacio>No hay prestaciones en este período.</Vacio>
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
                        <td className={styles.num}>{moneyExacto.format(p.importe_total)}</td>
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
    </div>
  );
};

export default MisReportes;

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJSON, patchJSON, postJSON } from "@/app/shared/lib/http";
import { useAppSnackbar } from "../../../../hooks/useAppSnackbar";
import Button from "@/app/components/ui/Button/Button";
import SelectableTable from "@/app/components/ui/SelectableTable/SelectableTable";
import type {
  ActionDef,
  ColumnDef,
} from "@/app/components/ui/SelectableTable/types";
import styles from "./tabs.module.scss";
import {
  type Pago,
  type Liquidacion,
  type ObraSocial,
  type FacturaPagoDisp,
  avisoDeCarga,
  etiquetaFactura,
  nroFacturaMarcado,
  fmt,
  mesLabel,
} from "../../types";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";
import Dialogo from "@/app/components/ui/Dialogo/Dialogo";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import {
  COMPENSACIONES_LISTA_URL,
  COMPENSACION_ESTADO_URL,
  type Compensacion,
  importeConSigno,
} from "../../Compensaciones/utiles";
import {
  ADELANTOS_LISTA_URL,
  ADELANTO_ESTADO_URL,
  type AdelantoListaRow,
  estadoAdelantoLabel,
} from "../../Adelantos/utiles";

const LIQUIDACIONES_URL = (pagoId: number) =>
  `/api/liquidacion/liquidaciones_por_os/?pago_id=${pagoId}`;
const CREAR_LIQ_URL = "/api/liquidacion/liquidaciones_por_os/crear";
const DEL_LIQ_URL = (id: number) =>
  `/api/liquidacion/liquidaciones_por_os/${id}`;
const OBRAS_SOCIALES_URL = "/api/obras_social/";
const FACTURAS_PARA_PAGO_URL = (osId: number, pagoId: number) =>
  `/api/periodos/facturas_para_pago?obra_social_id=${osId}&pago_id=${pagoId}`;
type Props = {
  pago: Pago;
  pagoId: number;
  onPagoChange?: (p: Pago) => void;
  onRefresh?: () => void;
};

const TabFacturas: React.FC<Props> = ({ pago, pagoId, onRefresh }) => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();
  const isOpen = pago.estado === "A";

  const [rows, setRows] = useState<Liquidacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Prestaciones que quedaron afuera de la última factura agregada; se queda hasta cerrarlo.
  const [avisoCarga, setAvisoCarga] = useState<string | null>(null);

  // Adelantos que están en este pago (se pagan además de las facturas)
  const [adelantos, setAdelantos] = useState<AdelantoListaRow[]>([]);
  const [quitandoAdelanto, setQuitandoAdelanto] = useState<number | null>(null);

  // Compensaciones de este pago (plata a favor o en contra de socios, sin concepto)
  const [compensaciones, setCompensaciones] = useState<Compensacion[]>([]);
  const [quitandoComp, setQuitandoComp] = useState<number | null>(null);

  // Modal agregar
  const [addOpen, setAddOpen] = useState(false);
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [loadingOS, setLoadingOS] = useState(false);
  const [selectedOS, setSelectedOS] = useState<number | "">("");
  const [facturas, setFacturas] = useState<FacturaPagoDisp[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getJSON<Liquidacion[]>(LIQUIDACIONES_URL(pagoId));
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las facturas.");
    } finally {
      setLoading(false);
    }
  }, [pagoId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const fetchAdelantos = useCallback(async () => {
    try {
      const data = await getJSON<AdelantoListaRow[]>(ADELANTOS_LISTA_URL, { pago_id: pagoId });
      setAdelantos(Array.isArray(data) ? data : []);
    } catch {
      setAdelantos([]);
    }
  }, [pagoId]);

  useEffect(() => {
    void fetchAdelantos();
  }, [fetchAdelantos]);

  const fetchCompensaciones = useCallback(async () => {
    try {
      const data = await getJSON<{ items: Compensacion[] }>(COMPENSACIONES_LISTA_URL, { pago_id: pagoId });
      setCompensaciones(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setCompensaciones([]);
    }
  }, [pagoId]);

  useEffect(() => {
    void fetchCompensaciones();
  }, [fetchCompensaciones]);

  const quitarCompensacion = async (c: Compensacion) => {
    setQuitandoComp(c.id);
    try {
      await patchJSON(COMPENSACION_ESTADO_URL(c.id), { estado: "pendiente" });
      notify(`Compensación #${c.id} quitada del pago.`);
      await fetchCompensaciones();
      onRefresh?.();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(typeof detail === "string" ? detail : (e?.message ?? "No se pudo quitar la compensación."), "error");
    } finally {
      setQuitandoComp(null);
    }
  };

  const quitarAdelanto = async (a: AdelantoListaRow) => {
    setQuitandoAdelanto(a.id);
    try {
      await patchJSON(ADELANTO_ESTADO_URL(a.id), { estado: "C" });
      notify(`Adelanto #${a.id} quitado del pago.`);
      await fetchAdelantos();
      onRefresh?.();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(typeof detail === "string" ? detail : (e?.message ?? "No se pudo quitar el adelanto."), "error");
    } finally {
      setQuitandoAdelanto(null);
    }
  };

  const openAddModal = async () => {
    setSelectedOS("");
    setSelectedFactura("");
    setFacturas([]);
    setAddOpen(true);
    if (obrasSociales.length === 0) {
      setLoadingOS(true);
      try {
        const data = await getJSON<ObraSocial[]>(OBRAS_SOCIALES_URL);
        setObrasSociales(Array.isArray(data) ? data : []);
      } catch {
        /* ignore */
      } finally {
        setLoadingOS(false);
      }
    }
  };

  const handleOSSelect = async (val: string | number | null) => {
    const numVal = val ? Number(val) : ("" as const);
    setSelectedOS(numVal);
    setSelectedFactura("");
    setFacturas([]);
    if (!numVal) return;
    setLoadingFacturas(true);
    try {
      const data = await getJSON<FacturaPagoDisp[]>(
        FACTURAS_PARA_PAGO_URL(numVal, pagoId),
      );
      setFacturas(Array.isArray(data) ? data : []);
    } catch {
      setFacturas([]);
    } finally {
      setLoadingFacturas(false);
    }
  };

  const facturaElegida = facturas.find(
    (f) => String(f.FACTURA_ID) === selectedFactura,
  );

  const handleAdd = async () => {
    if (!selectedOS || !selectedFactura) return;
    setAdding(true);
    try {
      const created = await postJSON<Liquidacion>(CREAR_LIQ_URL, {
        pago_id: pagoId,
        obra_social_id: selectedOS,
        factura_id: Number(selectedFactura),
      });
      setRows((prev) => [...prev, created]);
      setAddOpen(false);
      const r = created.resumen_carga;
      const afuera = r ? avisoDeCarga(r) : "";
      if (r && afuera) {
        setAvisoCarga(`Factura ${created.nro_factura}: ${r.cargadas} de ${r.total} prestaciones cargadas. Revisar: ${afuera}.`);
        notify(
          `Factura agregada con ${r.total - r.cargadas - r.ya_liquidadas - (r.reservadas ?? 0)} prestaciones sin cargar` +
            (r.reservadas ? ` y ${r.reservadas} reservadas en adelantos.` : "."),
          "warning",
        );
      } else {
        setAvisoCarga(null);
        notify(r ? `Factura agregada: ${r.cargadas} de ${r.total} prestaciones cargadas.` : "Factura agregada correctamente.");
      }
      onRefresh?.();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (e?.message ?? "Error al agregar la factura."),
        "error",
      );
    } finally {
      setAdding(false);
    }
  };

  const columns: ColumnDef<Liquidacion>[] = [
    { key: "obra_social_id", header: "Obra Social (ID)" },
    {
      key: "periodo",
      header: "Período",
      render: (r) => `${mesLabel(r.mes_periodo)} ${r.anio_periodo}`,
    },
    {
      key: "nro_factura",
      header: "Nro. Factura",
      render: (r) => nroFacturaMarcado(r.nro_factura, r.factura_version),
    },
    {
      key: "total_honorarios",
      header: "Honorarios",
      alignRight: true,
      render: (r) => `$${fmt(r.total_honorarios)}`,
    },
    {
      key: "total_gastos",
      header: "Gastos",
      alignRight: true,
      render: (r) => `$${fmt(r.total_gastos)}`,
    },
    {
      key: "total_debitos",
      header: "Débitos",
      alignRight: true,
      render: (r) => (
        <span className={styles.negative}>-${fmt(r.total_debitos)}</span>
      ),
    },
    {
      key: "total_creditos",
      header: "Créditos",
      alignRight: true,
      render: (r) => (
        <span className={styles.positive}>+${fmt(r.total_creditos)}</span>
      ),
    },
    {
      key: "total_neto",
      header: "Neto",
      alignRight: true,
      render: (r) => `$${fmt(r.total_neto)}`,
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (r) => (
        <BotonVer
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/panel/liquidation/${pagoId}/facturas/${r.id}`);
          }}
        />
      ),
    },
  ];

  const bulkActions: ActionDef<Liquidacion>[] = [
    {
      label: "Quitar del pago",
      method: "DELETE",
      endpoint: (r) => DEL_LIQ_URL(r.id),
      restrictions: [
        {
          message: "No se pueden quitar facturas de un pago cerrado.",
          isAllowed: () => isOpen,
        },
      ],
      confirmMessage: (n) =>
        `¿Quitar ${n} factura${n !== 1 ? "s" : ""} del pago?`,
      onSuccess: (ok, fail) => {
        if (ok) {
          notify(
            `${ok} factura${ok !== 1 ? "s quitadas" : " quitada"} del pago.`,
          );
          onRefresh?.();
        }
        if (fail)
          notify(
            `${fail} no pudo${fail !== 1 ? "ron" : ""} quitarse.`,
            "error",
          );
      },
    },
  ];

  return (
    <div className={styles.tabWrap}>
      <div className={styles.toolbar}>
        <span style={{ fontSize: 13, color: "#64748b" }}>
          {rows.length} factura{rows.length !== 1 ? "s" : ""} en este pago
        </span>
        <div className={styles.toolbarLeft}>
          <Button variant="primary" onClick={openAddModal} disabled={!isOpen}>
            + Agregar factura
          </Button>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {avisoCarga && (
        <div className={styles.errorBanner} role="status">
          {avisoCarga}{" "}
          <button type="button" onClick={() => setAvisoCarga(null)} style={{ textDecoration: "underline", background: "none", border: 0, cursor: "pointer", color: "inherit" }}>
            Cerrar aviso
          </button>
        </div>
      )}

      <SelectableTable
        rows={rows}
        columns={columns}
        actions={bulkActions}
        isSelectable={() => isOpen}
        emptyMessage={
          isOpen
            ? "No hay facturas. Agregá una para comenzar."
            : "No hay facturas. El pago está cerrado."
        }
        loading={loading}
        onActionComplete={fetchRows}
      />

      {(adelantos.length > 0 || isOpen) && (
        <section aria-labelledby="pago-adelantos" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className={styles.toolbar}>
            <h3 id="pago-adelantos" style={{ margin: 0, fontSize: 18 }}>Adelantos en este pago</h3>
            <div className={styles.toolbarLeft}>
              <Button variant="ghost" onClick={() => navigate("/panel/adelantos")}>
                Ir a Adelantos →
              </Button>
            </div>
          </div>
          {adelantos.length === 0 ? (
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Ningún adelanto en este pago. Los adelantos cerrados se pasan al pago desde Adelantos.
            </span>
          ) : (
            <>
              <Tabla>
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Obra social</th>
                    <th>Factura</th>
                    <th>Médicos</th>
                    <th>Prest.</th>
                    <th>Importe</th>
                    <th>Estado</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {adelantos.map((a) => (
                    <tr key={a.id}>
                      <td>#{a.id}</td>
                      <td>{a.obra_social_nombre}</td>
                      <td>
                        {nroFacturaMarcado(a.nro_factura, a.factura_version)}
                        <br />
                        <small style={{ color: "#64748b" }}>
                          {mesLabel(a.mes_periodo)} {a.anio_periodo}
                        </small>
                      </td>
                      <td>
                        {a.medico_nombre ?? "—"}
                        {a.medicos > 1 && (
                          <>
                            <br />
                            <small style={{ color: "#64748b" }}>y {a.medicos - 1} más</small>
                          </>
                        )}
                      </td>
                      <td>{a.prestaciones}</td>
                      <td>${fmt(a.importe)}</td>
                      <td>{estadoAdelantoLabel(a.estado)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <BotonVer onClick={() => navigate(`/panel/adelantos/${a.id}`)} />
                          {isOpen && a.estado === "L" && (
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={quitandoAdelanto === a.id}
                              onClick={() => void quitarAdelanto(a)}
                            >
                              {quitandoAdelanto === a.id ? "Quitando…" : "Quitar del pago"}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
              <span style={{ fontSize: 13, color: "#64748b" }}>
                Las facturas de arriba entran sin las prestaciones de estos adelantos: las paga el adelanto. Factura y adelanto
                pueden estar en el mismo pago.
              </span>
            </>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Resumen rotulo="Facturas" valor={`$${fmt(Number(pago.total_bruto) - Number(pago.total_adelantos ?? 0))}`} />
            <Resumen rotulo="Adelantos" valor={`$${fmt(pago.total_adelantos ?? 0)}`} />
            <Resumen
              rotulo="Compensaciones"
              valor={importeConSigno(pago.total_compensaciones ?? 0)}
              nota={`${compensaciones.length} en este pago`}
            />
            <Resumen
              rotulo="Producción (base de porcentuales)"
              valor={`$${fmt(pago.total_bruto)}`}
              nota="Facturas + adelantos. Las compensaciones no entran."
              destacado
            />
          </div>
        </section>
      )}

      {(compensaciones.length > 0 || isOpen) && (
        <section aria-labelledby="pago-compensaciones" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className={styles.toolbar}>
            <h3 id="pago-compensaciones" style={{ margin: 0, fontSize: 18 }}>Compensaciones en este pago</h3>
            <div className={styles.toolbarLeft}>
              <Button variant="ghost" onClick={() => navigate("/panel/compensaciones")}>
                Ir a Compensaciones →
              </Button>
            </div>
          </div>
          {compensaciones.length === 0 ? (
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Ninguna compensación en este pago. Se pasan al pago desde Compensaciones.
            </span>
          ) : (
            <>
              <Tabla>
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Socio</th>
                    <th>Leyenda del recibo</th>
                    <th>Importe</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {compensaciones.map((c) => (
                    <tr key={c.id}>
                      <td>#{c.id}</td>
                      <td>
                        {c.medico_nombre ?? "—"}
                        {c.medico_nro_socio ? (
                          <>
                            <br />
                            <small style={{ color: "#64748b" }}>Socio {c.medico_nro_socio}</small>
                          </>
                        ) : null}
                      </td>
                      <td>{c.leyenda}</td>
                      <td style={{ fontWeight: 700, color: Number(c.importe) < 0 ? "#b42318" : "#13623a" }}>
                        {importeConSigno(c.importe)}
                      </td>
                      <td>
                        {isOpen && c.estado === "en_pago" && (
                          <Button size="sm" variant="danger" disabled={quitandoComp === c.id} onClick={() => void quitarCompensacion(c)}>
                            {quitandoComp === c.id ? "Quitando…" : "Quitar del pago"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
              <span style={{ fontSize: 13, color: "#64748b" }}>
                La negativa se resta antes de las deducciones, como un débito. Si al socio no le alcanza, al cerrar el pago el
                faltante queda como «Saldo deudor de débitos» y se le cobra en el próximo pago.
              </span>
            </>
          )}
        </section>
      )}

      {/* Modal agregar */}
      {addOpen && (
        <Dialogo
          titulo="Agregar factura"
          onClose={() => setAddOpen(false)}
          acciones={
            <>
              <Button
                variant="secondary"
                onClick={() => setAddOpen(false)}
                disabled={adding}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleAdd}
                disabled={adding || !selectedOS || !selectedFactura}
              >
                {adding ? "Agregando…" : "Agregar"}
              </Button>
            </>
          }
        >
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Obra Social</label>
                <AppSearchSelect
                  ordenar
                  options={obrasSociales.map((os) => ({
                    id: String(os.nro_obra_social),
                    label: `${os.nro_obra_social} - ${os.nombre}`,
                  }))}
                  value={selectedOS !== "" ? String(selectedOS) : null}
                  onChange={handleOSSelect}
                  loading={loadingOS}
                  disabled={adding}
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="pago-factura">
                  Factura a pagar
                </label>
                {!selectedOS ? (
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                    Seleccioná una obra social primero.
                  </span>
                ) : loadingFacturas ? (
                  <span style={{ fontSize: 13, color: "#64748b" }}>
                    Cargando facturas…
                  </span>
                ) : facturas.length === 0 ? (
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                    Esta obra social no tiene facturas con prestaciones por pagar.
                  </span>
                ) : (
                  <select
                    id="pago-factura"
                    className={styles.formSelect}
                    value={selectedFactura}
                    onChange={(e) => setSelectedFactura(e.target.value)}
                    disabled={adding}
                  >
                    <option value="">Seleccioná una factura…</option>
                    {facturas.map((f) => (
                      <option key={f.FACTURA_ID} value={f.FACTURA_ID}>
                        {etiquetaFactura(f)} — {mesLabel(f.MES)} {f.ANIO}
                      </option>
                    ))}
                  </select>
                )}
                {facturaElegida && (
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {facturaElegida.CANTIDAD} prestaci
                    {facturaElegida.CANTIDAD !== 1 ? "ones" : "ón"} cerrada
                    {facturaElegida.CANTIDAD !== 1 ? "s" : ""} por $
                    {fmt(facturaElegida.IMPORTE)}
                  </span>
                )}
                {facturaElegida && (facturaElegida.RESERVADAS ?? 0) > 0 && (
                  <div
                    role="note"
                    style={{
                      marginTop: 8,
                      padding: "10px 12px",
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "#5c3300",
                      background: "#fff7e6",
                      border: "1px solid #f5d9a0",
                      borderRadius: 10,
                    }}
                  >
                    <b>
                      {facturaElegida.RESERVADAS} prestaci{facturaElegida.RESERVADAS !== 1 ? "ones quedan" : "ón queda"} afuera
                    </b>{" "}
                    (${fmt(facturaElegida.IMPORTE_RESERVADO ?? 0)}): reservada
                    {facturaElegida.RESERVADAS !== 1 ? "s" : ""} en adelantos. Se pagan cuando esos adelantos pasen a un pago.
                  </div>
                )}
              </div>
            </Dialogo>
      )}
    </div>
  );
};

const Resumen: React.FC<{ rotulo: string; valor: string; destacado?: boolean; nota?: string }> = ({ rotulo, valor, destacado, nota }) => (
  <div
    style={{
      flex: "1 1 200px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      padding: "12px 16px",
      background: destacado ? "#eef4fc" : "#fff",
      border: `1px solid ${destacado ? "#c9daf0" : "#e2e8f0"}`,
      borderRadius: 14,
    }}
  >
    <span style={{ fontSize: 12, fontWeight: 600, color: destacado ? "#173f70" : "#475569" }}>{rotulo}</span>
    <b style={{ fontSize: 20, fontVariantNumeric: "tabular-nums", color: destacado ? "#173f70" : "inherit" }}>{valor}</b>
    {nota && <span style={{ fontSize: 12, color: destacado ? "#173f70" : "#475569" }}>{nota}</span>}
  </div>
);

export default TabFacturas;

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJSON, postJSON } from "@/app/shared/lib/http";
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
        notify(`Factura agregada con ${r.total - r.cargadas - r.ya_liquidadas} prestaciones sin cargar.`, "warning");
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
              </div>
            </Dialogo>
      )}
    </div>
  );
};

export default TabFacturas;

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { crearLiquidacion, listarLiquidacionesDePago, listarObrasSociales, listarPeriodosDisponibles, urlLiquidacion } from "@/app/pages/Pagos/pagos.api";
import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
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
  type PeriodoDisp,
  fmt,
  mesLabel,
} from "../../types";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";
import Dialogo from "@/app/components/ui/Dialogo/Dialogo";
import paleta from "@/app/styles/paleta.module.scss";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";

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

  // Modal agregar
  const [addOpen, setAddOpen] = useState(false);
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [loadingOS, setLoadingOS] = useState(false);
  const [selectedOS, setSelectedOS] = useState<number | "">("");
  const [periodos, setPeriodos] = useState<PeriodoDisp[]>([]);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [selectedMes, setSelectedMes] = useState<number | "">("");
  const [selectedAnio, setSelectedAnio] = useState<number | "">("");
  const [adding, setAdding] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarLiquidacionesDePago(pagoId);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      const err = comoErrorApi(e);
      setError(err?.message || "No se pudieron cargar las facturas.");
    } finally {
      setLoading(false);
    }
  }, [pagoId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const openAddModal = async () => {
    setSelectedOS("");
    setSelectedMes("");
    setSelectedAnio("");
    setPeriodos([]);
    setAddOpen(true);
    if (obrasSociales.length === 0) {
      setLoadingOS(true);
      try {
        const data = await listarObrasSociales();
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
    setSelectedMes("");
    setSelectedAnio("");
    setPeriodos([]);
    if (!numVal) return;
    setLoadingPeriodos(true);
    try {
      const data = await listarPeriodosDisponibles(numVal);
      setPeriodos(Array.isArray(data) ? data : []);
    } catch {
      setPeriodos([]);
    } finally {
      setLoadingPeriodos(false);
    }
  };

  const handlePeriodoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setSelectedMes("");
      setSelectedAnio("");
      return;
    }
    const [anio, mes] = val.split("-").map(Number);
    setSelectedAnio(anio);
    setSelectedMes(mes);
  };

  const getPeriodoAnio = (p: PeriodoDisp) => p.ANIO;
  const getPeriodoMes = (p: PeriodoDisp) => p.MES;

  const handleAdd = async () => {
    if (!selectedOS || !selectedMes || !selectedAnio) return;
    setAdding(true);
    try {
      const created = await crearLiquidacion({
        pago_id: pagoId,
        obra_social_id: selectedOS,
        mes_periodo: selectedMes,
        anio_periodo: selectedAnio,
      });
      setRows((prev) => [...prev, created]);
      setAddOpen(false);
      notify("Factura agregada correctamente.");
      onRefresh?.();
    } catch (e) {
      const err = comoErrorApi(e);
      const detail = err?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (err?.message ?? "Error al agregar la factura."),
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
      render: (r) => r.nro_factura || "—",
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
      endpoint: (r) => urlLiquidacion(r.id),
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
        <span style={{ fontSize: 13, color: paleta.gray500 }}>
          {rows.length} factura{rows.length !== 1 ? "s" : ""} en este pago
        </span>
        <div className={styles.toolbarLeft}>
          <Button variant="primary" onClick={openAddModal} disabled={!isOpen}>
            + Agregar factura
          </Button>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

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
                disabled={
                  adding || !selectedOS || !selectedMes || !selectedAnio
                }
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
                <label className={styles.formLabel}>Período disponible</label>
                {!selectedOS ? (
                  <span style={{ fontSize: 12, color: paleta.gray400 }}>
                    Seleccioná una obra social primero.
                  </span>
                ) : loadingPeriodos ? (
                  <span style={{ fontSize: 13, color: paleta.gray500 }}>
                    Cargando períodos…
                  </span>
                ) : (
                  <select
                    className={styles.formSelect}
                    value={
                      selectedAnio && selectedMes
                        ? `${selectedAnio}-${selectedMes}`
                        : ""
                    }
                    onChange={handlePeriodoChange}
                    disabled={adding}
                  >
                    <option value="">Seleccioná un período…</option>
                    {periodos.map((p) => (
                      <option
                        key={`${getPeriodoAnio(p)}-${getPeriodoMes(p)}`}
                        value={`${getPeriodoAnio(p)}-${getPeriodoMes(p)}`}
                      >
                        {mesLabel(getPeriodoMes(p))} {getPeriodoAnio(p)}
                      </option>
                    ))}
                    {periodos.length === 0 && (
                      <option disabled>Sin períodos disponibles</option>
                    )}
                  </select>
                )}
              </div>
            </Dialogo>
      )}
    </div>
  );
};

export default TabFacturas;

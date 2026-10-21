import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJSON, postJSON } from "@/app/shared/lib/http";
import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import Button from "@/app/components/ui/Button/Button";
import Franja from "@/app/components/layout/Franja/Franja";
import Caja from "@/app/components/ui/Caja/Caja";
import Dialogo, { DialogoCampo } from "@/app/components/ui/Dialogo/Dialogo";
import SelectableTable from "@/app/components/ui/SelectableTable/SelectableTable";
import type {
  ActionDef,
  ColumnDef,
} from "@/app/components/ui/SelectableTable/types";
import lq from "../Liquidacion.module.scss";
import {
  type ObraSocial,
  type FacturaDisp,
  type LoteAjuste,
  etiquetaFactura,
  mesLabel,
  MESES,
  fmt,
} from "../types";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import { Plus, RotateCcw, Search } from "lucide-react";
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";
import { ESTADO_URL } from "@/app/pages/Pagos/utiles";
import { DELETE_LOTE_URL } from "@/app/pages/Pagos/utiles";

const LISTA_URL = (params: Record<string, string>) => {
  const p = new URLSearchParams({ tipo: "refacturacion", ...params });
  return `/api/lotes/snaps/lista?${p}`;
};
// Se refactura una factura que ya puede tener lote (y refacturaciones anteriores): van todas.
const FACTURAS_DISP_URL = (id: number) =>
  `/api/periodos/disponibles_lotes_ajustes?obra_social_id=${id}&incluir_con_lote=true`;
const OBRAS_SOCIALES_URL = "/api/obras_social/";
const CREAR_REFAC_URL = "/api/lotes/snaps/crear_refacturacion";
type LoteListItem = {
  id: number;
  tipo: "normal" | "refacturacion";
  estado: "A" | "C" | "L" | "AP";
  mes_periodo: number;
  anio_periodo: number;
  pago_id: number | null;
  obra_social_id: number;
  obra_social_nombre: string;
  nro_factura: string | null;
  snap_origen_id: number | null;
  total_debitos: string;
  total_creditos: string;
};

const estadoLabel = (e: string) =>
  ({ A: "Abierto", C: "Cerrado", L: "En Liquidaciones", AP: "Aplicado" })[e] ?? e;
const estadoClass = (e: string) =>
  ({ A: lq.abierto, C: lq.cerrado, L: lq.enLiquidacion, AP: lq.aplicado })[e] ?? "";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

const RefacturacionesList: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  // Filters
  const [filterOs, setFilterOs] = useState("");
  const [filterMes, setFilterMes] = useState("");
  const [filterAnio, setFilterAnio] = useState("");
  const [filterEstado, setFilterEstado] = useState("A");

  // List
  const [lotes, setLotes] = useState<LoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [obras, setObras] = useState<ObraSocial[]>([]);
  const [obrasLoading, setObrasLoading] = useState(false);
  const [addOs, setAddOs] = useState("");
  const [facturas, setFacturas] = useState<FacturaDisp[]>([]);
  const [addFactura, setAddFactura] = useState("");
  const [facturasLoading, setFacturasLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const buildParams = useCallback(() => {
    const p: Record<string, string> = {};
    if (filterOs) p.obra_social_id = filterOs;
    if (filterMes) p.mes = filterMes;
    if (filterAnio) p.anio = filterAnio;
    if (filterEstado) p.estado = filterEstado;
    return p;
  }, [filterOs, filterMes, filterAnio, filterEstado]);

  const fetchLotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getJSON<LoteListItem[]>(LISTA_URL(buildParams()));
      setLotes(data ?? []);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las refacturaciones.");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

  // Load obras sociales on mount (needed for filter + modal)
  useEffect(() => {
    (async () => {
      setObrasLoading(true);
      try {
        const data = await getJSON<ObraSocial[]>(OBRAS_SOCIALES_URL);
        setObras(data ?? []);
      } finally {
        setObrasLoading(false);
      }
    })();
  }, []);

  const openAddModal = () => {
    setAddOpen(true);
    setAddOs("");
    setFacturas([]);
    setAddFactura("");
  };

  const handleAddOsChange = async (val: string) => {
    setAddOs(val);
    setFacturas([]);
    setAddFactura("");
    if (!val) return;
    setFacturasLoading(true);
    try {
      const data = await getJSON<FacturaDisp[]>(FACTURAS_DISP_URL(Number(val)));
      setFacturas(data ?? []);
    } catch {
      setFacturas([]);
    } finally {
      setFacturasLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!addOs || !addFactura) return;
    setAdding(true);
    try {
      // El lote que se corrige (la última refacturación o el lote normal de la factura) lo resuelve la API.
      const lote = await postJSON<LoteAjuste>(CREAR_REFAC_URL, {
        obra_social_id: Number(addOs),
        factura_id: Number(addFactura),
      });
      navigate(`/panel/refacturaciones/${lote.id}`);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (e?.message ?? "Error al crear refacturación."),
        "error",
      );
    } finally {
      setAdding(false);
    }
  };

  const columns: ColumnDef<LoteListItem>[] = [
    {
      key: "obra_social_nombre",
      header: "Obra social",
      render: (l) => (
        <span>
          <span className={lq.tenue}>#{l.obra_social_id}</span> {l.obra_social_nombre}
        </span>
      ),
    },
    {
      key: "nro_factura",
      header: "Factura",
      render: (l) => <span className={lq.mono}>{l.nro_factura ?? "—"}</span>,
    },
    {
      key: "periodo",
      header: "Período",
      render: (l) => (
        <span className={lq.monto}>
          {mesLabel(l.mes_periodo)} {l.anio_periodo}
        </span>
      ),
    },
    {
      key: "snap_origen_id",
      header: "Corrige",
      render: (l) =>
        l.snap_origen_id ? (
          <button
            type="button"
            className={lq.enlace}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/panel/debitos-creditos/${l.snap_origen_id}`);
            }}
          >
            Lote #{l.snap_origen_id}
          </button>
        ) : (
          <span className={lq.tenue}>—</span>
        ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (l) => (
        <span className={`${lq.estado} ${estadoClass(l.estado)}`}>
          {estadoLabel(l.estado)}
        </span>
      ),
    },
    {
      key: "pago_id",
      header: "Pago",
      render: (l) => (l.pago_id ? `#${l.pago_id}` : <span className={lq.tenue}>—</span>),
    },
    {
      key: "total_debitos",
      header: "Débitos",
      render: (l) => <span className={`${lq.monto} ${lq.menos}`}>-${fmt(l.total_debitos)}</span>,
    },
    {
      key: "total_creditos",
      header: "Créditos",
      render: (l) => <span className={`${lq.monto} ${lq.mas}`}>+${fmt(l.total_creditos)}</span>,
    },
    {
      key: "acciones",
      header: "",
      render: (l) => (
        <BotonVer
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/panel/refacturaciones/${l.id}`);
          }}
        />
      ),
    },
  ];

  const bulkActions: ActionDef<LoteListItem>[] = [
    {
      label: "Pasar al pago",
      method: "PATCH",
      endpoint: (l) => ESTADO_URL(l.id),
      payload: () => ({ estado: "L" }),
      restrictions: [
        {
          message:
            "Solo se pueden pasar al pago refacturaciones con estado Cerrado.",
          isAllowed: (rows) => rows.every((r) => r.estado === "C"),
        },
      ],
      confirmMessage: (n) =>
        `¿Pasar ${n} refacturación${n !== 1 ? "es" : ""} al pago?`,
      onSuccess: (ok, fail) => {
        if (ok)
          notify(
            `${ok} refacturación${ok !== 1 ? "es pasadas" : " pasada"} al pago.`,
          );
        if (fail)
          notify(
            `${fail} no pudo${fail !== 1 ? "ron" : ""} pasarse al pago.`,
            "error",
          );
      },
    },
    {
      label: "Eliminar",
      method: "DELETE",
      endpoint: (l) => DELETE_LOTE_URL(l.id),
      restrictions: [
        {
          message:
            "Solo se pueden eliminar refacturaciones con estado Abierto.",
          isAllowed: (rows) => rows.every((r) => r.estado === "A"),
        },
      ],
      confirmMessage: (n) =>
        `¿Eliminar ${n} refacturación${n !== 1 ? "es" : ""}? Esta acción no se puede deshacer.`,
      onSuccess: (ok, fail) => {
        if (ok)
          notify(
            `${ok} refacturación${ok !== 1 ? "es eliminadas" : " eliminada"}.`,
          );
        if (fail)
          notify(
            `${fail} no pudo${fail !== 1 ? "ron" : ""} eliminarse.`,
            "error",
          );
      },
    },
  ];

  const opcionesOs = obras.map((o) => ({
    id: String(o.nro_obra_social),
    label: `${o.nro_obra_social} — ${o.nombre}`,
  }));

  return (
    <div className={lq.pagina}>
      <Franja titulo="Refacturaciones" icono={RotateCcw} />

      <Caja titulo="Configuración">
        <div className={lq.filtros}>
          <div className={`${lq.campo} ${lq.campoAncho}`}>
            <span className={lq.rotulo}>Obra social</span>
            <AppSearchSelect
              options={opcionesOs}
              value={filterOs || null}
              onChange={(val) => setFilterOs(val ? String(val) : "")}
            />
          </div>
          <label className={lq.campo}>
            <span className={lq.rotulo}>Mes</span>
            <select className={lq.select} value={filterMes} onChange={(e) => setFilterMes(e.target.value)}>
              <option value="">Todos</option>
              {MESES.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </label>
          <label className={lq.campo}>
            <span className={lq.rotulo}>Año</span>
            <select className={lq.select} value={filterAnio} onChange={(e) => setFilterAnio(e.target.value)}>
              <option value="">Todos</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className={lq.campo}>
            <span className={lq.rotulo}>Estado</span>
            <select className={lq.select} value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="A">Abierto</option>
              <option value="C">Cerrado</option>
              <option value="L">En liquidaciones</option>
              <option value="AP">Aplicado</option>
            </select>
          </label>
          <Button variant="ghost" size="md" leftIcon={<Search size={18} aria-hidden="true" />} onClick={fetchLotes} disabled={loading}>
            {loading ? "Buscando…" : "Buscar"}
          </Button>
        </div>
      </Caja>

      <div className={lq.barra}>
        <div className={lq.acciones}>
          <Button variant="primary" size="md" leftIcon={<Plus size={18} aria-hidden="true" />} onClick={openAddModal}>
            Nueva refacturación
          </Button>
        </div>
      </div>

      {error && <div className={lq.error} role="alert">{error}</div>}

      <SelectableTable
        rows={lotes}
        columns={columns}
        actions={bulkActions}
        isSelectable={(r) => r.estado === "A" || r.estado === "C"}
        emptyMessage="Sin refacturaciones que coincidan con los filtros."
        loading={loading}
        onActionComplete={fetchLotes}
      />

      {addOpen && (
        <Dialogo
          titulo="Nueva refacturación"
          icono={RotateCcw}
          onClose={adding ? undefined : () => setAddOpen(false)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={adding}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleAdd}
                disabled={adding || !addOs || !addFactura}
              >
                {adding ? "Creando…" : "Crear refacturación"}
              </Button>
            </>
          }
        >
          <DialogoCampo rotulo="Obra social">
            <AppSearchSelect
              options={opcionesOs}
              value={addOs || null}
              onChange={(val) => handleAddOsChange(val ? String(val) : "")}
              disabled={obrasLoading || adding}
              loading={obrasLoading}
            />
          </DialogoCampo>
          <DialogoCampo rotulo="Factura a corregir" htmlFor="rf-factura">
            {!addOs ? (
              <p className={lq.tenue}>Elegí primero la obra social.</p>
            ) : facturasLoading ? (
              <p className={lq.tenue}>Cargando facturas…</p>
            ) : facturas.length === 0 ? (
              <p className={lq.tenue}>Esta obra social no tiene facturas cerradas.</p>
            ) : (
              <select
                id="rf-factura"
                value={addFactura}
                onChange={(e) => setAddFactura(e.target.value)}
                disabled={adding}
              >
                <option value="">Elegí una factura…</option>
                {facturas.map((f) => (
                  <option key={f.FACTURA_ID} value={f.FACTURA_ID}>
                    {etiquetaFactura(f)} — {mesLabel(f.MES)} {f.ANIO}
                  </option>
                ))}
              </select>
            )}
          </DialogoCampo>
        </Dialogo>
      )}
    </div>
  );
};

export default RefacturacionesList;

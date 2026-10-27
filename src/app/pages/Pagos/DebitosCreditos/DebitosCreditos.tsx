import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { borrarLote, crearLoteSinFactura, listarLotes, listarFacturasParaLotes, listarObrasSociales, obtenerOCrearLote } from "@/app/pages/Pagos/pagos.api";
import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import Button from "@/app/components/ui/Button/Button";
import Franja from "@/app/components/layout/Franja/Franja";
import Caja from "@/app/components/ui/Caja/Caja";
import Dialogo, { DialogoAviso, DialogoCampo, DialogoDatos } from "@/app/components/ui/Dialogo/Dialogo";
import SelectableTable from "@/app/components/ui/SelectableTable/SelectableTable";
import type {
  ActionDef,
  ColumnDef,
} from "@/app/components/ui/SelectableTable/types";
import lq from "../Liquidacion.module.scss";
import {
  type ObraSocial,
  type FacturaDisp,
  etiquetaFactura,
  mesLabel,
  MESES,
  fmt,
  type LoteListItem,
} from "../types";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";
import { ESTADO_URL } from "@/app/pages/Pagos/utiles";
import { DELETE_LOTE_URL } from "@/app/pages/Pagos/utiles";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";

const estadoLabel = (e: string) =>
  ({ A: "Abierto", C: "Cerrado", L: "En Liquidaciones", AP: "Aplicado" })[e] ??
  e;
const estadoClass = (e: string) =>
  ({
    A: lq.abierto,
    C: lq.cerrado,
    L: lq.enLiquidacion,
    AP: lq.aplicado,
  })[e] ?? "";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

const DebitosCreditos: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  // Filters
  const [filterOs, setFilterOs] = useState("");
  const [filterMes, setFilterMes] = useState("");
  const [filterAnio, setFilterAnio] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterTipo, setFilterTipo] = useState("");

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

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<LoteListItem | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleting, setDeleting] = useState(false);

  const openDeleteModal = (lote: LoteListItem) => {
    setDeleteTarget(lote);
    setDeleteStep(1);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await borrarLote(deleteTarget.id);
      notify("Lote eliminado correctamente.");
      setDeleteTarget(null);
      fetchLotes();
    } catch (e) {
      const err = comoErrorApi(e);
      const detail = err?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (err?.message ?? "Error al eliminar el lote."),
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  // Sin factura modal
  const [addSfOpen, setAddSfOpen] = useState(false);
  const [addSfOs, setAddSfOs] = useState("");
  const [addSfMes, setAddSfMes] = useState("");
  const [addSfAnio, setAddSfAnio] = useState("");
  const [addingSf, setAddingSf] = useState(false);

  const buildParams = useCallback(() => {
    const p: Record<string, string> = {};
    if (filterOs) p.obra_social_id = filterOs;
    if (filterMes) p.mes = filterMes;
    if (filterAnio) p.anio = filterAnio;
    if (filterEstado) p.estado = filterEstado;
    if (filterTipo) p.tipo = filterTipo;
    // Las refacturaciones se ven sólo en su pantalla.
    else p.excluir_tipo = "refacturacion";
    return p;
  }, [filterOs, filterMes, filterAnio, filterEstado, filterTipo]);

  const fetchLotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarLotes(buildParams());
      setLotes(data ?? []);
    } catch (e) {
      const err = comoErrorApi(e);
      setError(err?.message || "No se pudieron cargar los lotes.");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

  useEffect(() => {
    (async () => {
      setObrasLoading(true);
      try {
        const data = await listarObrasSociales();
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
      const data = await listarFacturasParaLotes(Number(val));
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
      const lote = await obtenerOCrearLote({
        obra_social_id: Number(addOs),
        factura_id: Number(addFactura),
      });
      navigate(`/panel/debitos-creditos/${lote.id}`);
    } catch (e) {
      const err = comoErrorApi(e);
      const detail = err?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (err?.message ?? "Error al crear el lote."),
        "error",
      );
    } finally {
      setAdding(false);
    }
  };

  const openAddSfModal = () => {
    setAddSfOpen(true);
    setAddSfOs("");
    setAddSfMes("");
    setAddSfAnio(String(currentYear));
  };

  const handleAddSinFactura = async () => {
    if (!addSfOs || !addSfMes || !addSfAnio) return;
    setAddingSf(true);
    try {
      const lote = await crearLoteSinFactura({
        obra_social_id: Number(addSfOs),
        mes_periodo: Number(addSfMes),
        anio_periodo: Number(addSfAnio),
      });
      navigate(`/panel/debitos-creditos-sin-factura/${lote.id}`);
    } catch (e) {
      const err = comoErrorApi(e);
      const detail = err?.response?.data?.detail;
      notify(
        typeof detail === "string"
          ? detail
          : (err?.message ?? "Error al crear el lote."),
        "error",
      );
    } finally {
      setAddingSf(false);
    }
  };

  const columns: ColumnDef<LoteListItem>[] = [
    {
      key: "tipo",
      header: "Tipo",
      render: (l) => (
        <span className={`${lq.tipo} ${l.tipo === "sin_factura" ? lq.tipoSinFactura : lq.tipoNormal}`}>
          {l.tipo === "sin_factura" ? "Sin factura" : "Normal"}
        </span>
      ),
    },
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
        <div className={lq.accionesFila}>
          <BotonVer
            onClick={(e) => {
              e.stopPropagation();
              const base =
                l.tipo === "sin_factura"
                  ? "/panel/debitos-creditos-sin-factura"
                  : "/panel/debitos-creditos";
              navigate(`${base}/${l.id}`);
            }}
          />
          {l.estado !== "L" && l.estado !== "AP" && (
            <button
              type="button"
              className={lq.botonIconoPeligro}
              title="Eliminar"
              aria-label={`Eliminar lote de ${l.obra_social_nombre}`}
              onClick={(e) => {
                e.stopPropagation();
                openDeleteModal(l);
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
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
          message: "Solo se pueden pasar al pago lotes con estado Cerrado.",
          isAllowed: (rows) => rows.every((r) => r.estado === "C"),
        },
      ],
      confirmMessage: (n) => `¿Pasar ${n} lote${n !== 1 ? "s" : ""} al pago?`,
      onSuccess: (ok, fail) => {
        if (ok)
          notify(`${ok} lote${ok !== 1 ? "s pasados" : " pasado"} al pago.`);
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
          message: "Solo se pueden eliminar lotes con estado Abierto.",
          isAllowed: (rows) => rows.every((r) => r.estado === "A"),
        },
      ],
      confirmMessage: (n) =>
        `¿Eliminar ${n} lote${n !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`,
      onSuccess: (ok, fail) => {
        if (ok)
          notify(`${ok} lote${ok !== 1 ? "s eliminados" : " eliminado"}.`);
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
    label: `${o.nro_obra_social} - ${o.nombre}`,
  }));

  return (
    <div className={lq.pagina}>
      <Franja titulo="Débitos y créditos" icono={ArrowLeftRight} />

      <Caja titulo="Configuración">
        <div className={lq.filtros}>
          <div className={`${lq.campo} ${lq.campoAncho}`}>
            <span className={lq.rotulo}>Obra social</span>
            <AppSearchSelect
              ordenar
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
          <label className={lq.campo}>
            <span className={lq.rotulo}>Tipo</span>
            <select className={lq.select} value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
              <option value="">Todos</option>
              <option value="normal">Normal</option>
              <option value="sin_factura">Sin factura</option>
            </select>
          </label>
        </div>
      </Caja>

      <div className={lq.barra}>
        <div className={lq.acciones}>
          <Button variant="ghost" size="md" leftIcon={<Plus size={18} aria-hidden="true" />} onClick={openAddSfModal}>
            Lote sin factura
          </Button>
          <Button variant="primary" size="md" leftIcon={<Plus size={18} aria-hidden="true" />} onClick={openAddModal}>
            Nuevo lote
          </Button>
        </div>
      </div>

      {error && <div className={lq.error} role="alert">{error}</div>}

      <SelectableTable
        rows={lotes}
        columns={columns}
        actions={bulkActions}
        isSelectable={(r) => r.estado === "A" || r.estado === "C"}
        emptyMessage="Sin lotes que coincidan con los filtros."
        loading={loading}
        onActionComplete={fetchLotes}
      />

      {addSfOpen && (
        <Dialogo
          titulo="Nuevo lote sin factura"
          icono={Plus}
          onClose={addingSf ? undefined : () => setAddSfOpen(false)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setAddSfOpen(false)} disabled={addingSf}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleAddSinFactura}
                disabled={addingSf || !addSfOs || !addSfMes || !addSfAnio}
              >
                {addingSf ? "Creando…" : "Crear lote"}
              </Button>
            </>
          }
        >
          <DialogoCampo rotulo="Obra social">
            <AppSearchSelect
              ordenar
              options={opcionesOs}
              value={addSfOs || null}
              onChange={(val) => setAddSfOs(val ? String(val) : "")}
              disabled={obrasLoading || addingSf}
              loading={obrasLoading}
            />
          </DialogoCampo>
          <DialogoCampo rotulo="Mes" htmlFor="sf-mes">
            <select id="sf-mes" value={addSfMes} onChange={(e) => setAddSfMes(e.target.value)} disabled={addingSf}>
              <option value="">Elegí un mes…</option>
              {MESES.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </DialogoCampo>
          <DialogoCampo rotulo="Año" htmlFor="sf-anio">
            <select id="sf-anio" value={addSfAnio} onChange={(e) => setAddSfAnio(e.target.value)} disabled={addingSf}>
              <option value="">Elegí un año…</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </DialogoCampo>
        </Dialogo>
      )}

      {deleteTarget && (
        <Dialogo
          titulo={deleteStep === 1 ? "Eliminar lote" : "Confirmar eliminación"}
          icono={Trash2}
          peligro
          onClose={deleting ? undefined : closeDeleteModal}
          acciones={
            deleteStep === 1 ? (
              <>
                <Button variant="ghost" onClick={closeDeleteModal}>Cancelar</Button>
                <Button variant="danger" onClick={() => setDeleteStep(2)}>Continuar</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setDeleteStep(1)} disabled={deleting}>Volver</Button>
                <Button variant="danger" onClick={handleDeleteConfirm} disabled={deleting}>
                  {deleting ? "Eliminando…" : "Eliminar definitivamente"}
                </Button>
              </>
            )
          }
        >
          {deleteStep === 1 ? (
            <>
              <DialogoDatos
                filas={[
                  { rotulo: "Obra social", valor: `${deleteTarget.obra_social_nombre} (#${deleteTarget.obra_social_id})` },
                  { rotulo: "Período", valor: `${mesLabel(deleteTarget.mes_periodo)} ${deleteTarget.anio_periodo}` },
                  { rotulo: "Tipo", valor: deleteTarget.tipo === "sin_factura" ? "Sin factura" : "Normal" },
                  ...(deleteTarget.nro_factura
                    ? [{ rotulo: "Factura", valor: <span className={lq.mono}>{deleteTarget.nro_factura}</span> }]
                    : []),
                  {
                    rotulo: "Estado",
                    valor: (
                      <span className={`${lq.estado} ${estadoClass(deleteTarget.estado)}`}>
                        {estadoLabel(deleteTarget.estado)}
                      </span>
                    ),
                  },
                ]}
              />
              <DialogoAviso tono="peligro">
                Se borran para siempre todos los débitos y créditos de este lote.
              </DialogoAviso>
            </>
          ) : (
            <>
              <p>
                ¿Eliminar definitivamente el lote de <strong>{deleteTarget.obra_social_nombre}</strong>,{" "}
                <strong>{mesLabel(deleteTarget.mes_periodo)} {deleteTarget.anio_periodo}</strong>?
              </p>
              <DialogoAviso tono="peligro">No se puede deshacer.</DialogoAviso>
            </>
          )}
        </Dialogo>
      )}

      {addOpen && (
        <Dialogo
          titulo="Nuevo lote de débitos y créditos"
          icono={Plus}
          onClose={adding ? undefined : () => setAddOpen(false)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={adding}>Cancelar</Button>
              <Button
                variant="primary"
                onClick={handleAdd}
                disabled={adding || !addOs || !addFactura}
              >
                {adding ? "Creando…" : "Crear o abrir lote"}
              </Button>
            </>
          }
        >
          <DialogoCampo rotulo="Obra social">
            <AppSearchSelect
              ordenar
              options={opcionesOs}
              value={addOs || null}
              onChange={(val) => handleAddOsChange(val ? String(val) : "")}
              disabled={obrasLoading || adding}
              loading={obrasLoading}
            />
          </DialogoCampo>
          <DialogoCampo rotulo="Factura" htmlFor="dc-factura">
            {!addOs ? (
              <p className={lq.tenue}>Elegí primero la obra social.</p>
            ) : facturasLoading ? (
              <p className={lq.tenue}>Cargando facturas…</p>
            ) : facturas.length === 0 ? (
              <p className={lq.tenue}>Esta obra social no tiene facturas cerradas sin lote.</p>
            ) : (
              <select
                id="dc-factura"
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

export default DebitosCreditos;

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Plus, Trash2 } from "lucide-react";
import { borrarPago, crearPago, listarPagos, type PagoNuevo } from "@/app/pages/Pagos/pagos.api";
import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import Button from "@/app/components/ui/Button/Button";
import Franja from "@/app/components/layout/Franja/Franja";
import Caja from "@/app/components/ui/Caja/Caja";
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";
import Dialogo, { DialogoAviso, DialogoCampo } from "@/app/components/ui/Dialogo/Dialogo";
import l from "../Liquidacion.module.scss";
import { type Pago, fmt, mesLabel, MESES } from "../types";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { comoErrorApi, detalleDeError, detalleObjeto } from "@/app/shared/lib/httpErrors";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

const now = new Date();
const YEAR_OPTIONS: number[] = Array.from({ length: 8 }, (_, i) => now.getFullYear() + 2 - i);
const MES_OPTIONS = MESES.map((nombre, i) => ({ value: i + 1, label: nombre }));

const PagosList: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [rows, setRows] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert409, setAlert409] = useState<{ pagoId: number; message: string } | null>(null);

  // Filtros
  const [filterAnio, setFilterAnio] = useState<string>("");
  const [filterMes, setFilterMes] = useState<string>("");
  const [filterEstado, setFilterEstado] = useState<string>("");

  // Modal crear
  const [openCreate, setOpenCreate] = useState(false);
  const [createAnio, setCreateAnio] = useState<number>(now.getFullYear());
  const [createMes, setCreateMes] = useState<number>(now.getMonth() + 1);
  const [createDesc, setCreateDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Modal confirmar eliminar
  const [deleteTarget, setDeleteTarget] = useState<Pago | null>(null);
  const [deleting, setDeleting] = useState(false);

  const hasOpenPago = useMemo(() => rows.some((p) => p.estado === "A"), [rows]);

  const fetchPagos = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params: Record<string, unknown> = { skip: 0, limit: 200 };
    if (filterAnio) params.anio = Number(filterAnio);
    if (filterMes) params.mes = Number(filterMes);
    if (filterEstado) params.estado = filterEstado;
    try {
      const data = await listarPagos(params);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      const err = comoErrorApi(e);
      setError(err?.message || "No se pudieron cargar los pagos.");
    } finally {
      setLoading(false);
    }
  }, [filterAnio, filterMes, filterEstado]);

  useEffect(() => { fetchPagos(); }, [fetchPagos]);

  const openCreateModal = () => {
    setCreateAnio(now.getFullYear());
    setCreateMes(now.getMonth() + 1);
    setCreateDesc("");
    setAlert409(null);
    setOpenCreate(true);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const body: PagoNuevo = { anio: createAnio, mes: createMes };
      if (createDesc.trim()) body.descripcion = createDesc.trim();
      const created = await crearPago(body);
      setRows((prev) => [created, ...prev].sort((a, b) => {
        if (b.anio !== a.anio) return b.anio - a.anio;
        return b.mes - a.mes;
      }));
      setOpenCreate(false);
      notify("Pago creado correctamente.");
    } catch (e) {
      const err = comoErrorApi(e);
      const status = err.response?.status ?? err.status;
      if (status === 409) {
        const detail = detalleObjeto(e);
        if (detail?.reason === "pago_abierto_existe" && detail.pago_id !== undefined) {
          setAlert409({ pagoId: detail.pago_id, message: detail.message ?? "" });
          setOpenCreate(false);
        } else {
          notify(detail?.message ?? "Conflicto al crear el pago.", "error");
        }
      } else {
        notify(detalleDeError(e, "Error al crear el pago."), "error");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await borrarPago(deleteTarget.id);
      setRows((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      notify("Pago eliminado correctamente.");
    } catch (e) {
      const err = comoErrorApi(e);
      const detail = err?.response?.data?.detail;
      notify(typeof detail === "string" ? detail : err?.message ?? "No se pudo eliminar el pago.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const estadoLabel = (e: string) => e === "A" ? "Abierto" : e === "P" ? "Pagado" : "Cerrado";
  const estadoClass = (e: string) => e === "A" ? l.abierto : e === "P" ? l.aplicado : l.cerrado;

  return (
    <div className={l.pagina}>
      <Franja titulo="Pagos" icono={DollarSign} />

      <Caja titulo="Configuración">
        <div className={l.filtros}>
          <label className={l.campo}>
            <span className={l.rotulo}>Año</span>
            <select className={l.select} value={filterAnio} onChange={(e) => setFilterAnio(e.target.value)}>
              <option value="">Todos</option>
              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className={l.campo}>
            <span className={l.rotulo}>Mes</span>
            <select className={l.select} value={filterMes} onChange={(e) => setFilterMes(e.target.value)}>
              <option value="">Todos</option>
              {MES_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <label className={l.campo}>
            <span className={l.rotulo}>Estado</span>
            <select className={l.select} value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="A">Abierto</option>
              <option value="C">Cerrado</option>
              <option value="P">Pagado</option>
            </select>
          </label>
        </div>
      </Caja>

      <div className={l.barra}>
        <div className={l.acciones}>
          {/* Hay un solo pago abierto a la vez: el botón lo dice en vez de fallar. */}
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={18} aria-hidden="true" />}
            onClick={openCreateModal}
            disabled={hasOpenPago}
          >
            {hasOpenPago ? "Hay un pago abierto" : "Nuevo pago"}
          </Button>
        </div>
      </div>

      {error && <div className={l.error} role="alert">{error}</div>}

      {alert409 && (
        <div className={l.alerta} role="status">
          {alert409.message}
          <BotonPlano
            type="button"
            className={l.enlace}
            onClick={() => { setAlert409(null); navigate(`/panel/liquidation/${alert409.pagoId}`); }}
          >
            Ver pago #{alert409.pagoId}
          </BotonPlano>
        </div>
      )}

      <div className={l.tablaCaja}>
        {loading ? (
          <div className={l.cargando}>Cargando…</div>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <th>Período</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Cierre</th>
                <th>Bruto</th>
                <th>Débitos</th>
                <th>Créditos</th>
                <th>Deducciones</th>
                <th>Neto</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className={l.vacio}>
                    No hay pagos. Creá el primero.
                  </td>
                </tr>
              )}
              {rows.map((p) => (
                <tr key={p.id} className={l.fila} onClick={() => navigate(`/panel/liquidation/${p.id}`)}>
                  <td>{mesLabel(p.mes)} {p.anio}</td>
                  <td>{p.descripcion ?? <span className={l.tenue}>—</span>}</td>
                  <td>
                    <span className={`${l.estado} ${estadoClass(p.estado)}`}>
                      {estadoLabel(p.estado)}
                    </span>
                  </td>
                  <td>
                    {p.cierre_timestamp
                      ? new Date(p.cierre_timestamp).toLocaleDateString("es-AR")
                      : <span className={l.tenue}>—</span>}
                  </td>
                  <td className={l.monto}>${fmt(p.total_bruto)}</td>
                  <td className={`${l.monto} ${l.menos}`}>-${fmt(p.total_debitos)}</td>
                  <td className={`${l.monto} ${l.mas}`}>+${fmt(p.total_creditos)}</td>
                  <td className={`${l.monto} ${l.menos}`}>-${fmt(p.total_deduccion)}</td>
                  <td className={`${l.monto} ${l.neto}`}>${fmt(p.total_neto)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className={l.accionesFila}>
                      <BotonVer to={`/panel/liquidation/${p.id}`} etiqueta={`Ver pago de ${mesLabel(p.mes)} ${p.anio}`} />
                      <BotonPlano
                        type="button"
                        className={l.botonIconoPeligro}
                        onClick={() => setDeleteTarget(p)}
                        title="Eliminar"
                        aria-label={`Eliminar pago de ${mesLabel(p.mes)} ${p.anio}`}
                      >
                        <Trash2 size={16} />
                      </BotonPlano>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </div>

      {openCreate && (
        <Dialogo
          titulo="Nuevo pago"
          icono={Plus}
          onClose={creating ? undefined : () => setOpenCreate(false)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setOpenCreate(false)} disabled={creating}>Cancelar</Button>
              <Button variant="primary" onClick={handleCreate} disabled={creating}>
                {creating ? "Creando…" : "Crear"}
              </Button>
            </>
          }
        >
          <DialogoCampo rotulo="Año" htmlFor="pago-anio">
            <select id="pago-anio" value={createAnio} onChange={(e) => setCreateAnio(Number(e.target.value))}>
              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </DialogoCampo>
          <DialogoCampo rotulo="Mes" htmlFor="pago-mes">
            <select id="pago-mes" value={createMes} onChange={(e) => setCreateMes(Number(e.target.value))}>
              {MES_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </DialogoCampo>
          <DialogoCampo rotulo="Descripción (opcional)" htmlFor="pago-desc">
            <input
              id="pago-desc"
              type="text"
              placeholder="Ej: Primer pago Marzo 2026"
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              disabled={creating}
            />
          </DialogoCampo>
          <DialogoAviso>Se crea abierto, con totales en $0.</DialogoAviso>
        </Dialogo>
      )}

      {deleteTarget && (
        <Dialogo
          titulo="Eliminar pago"
          icono={Trash2}
          peligro
          onClose={deleting ? undefined : () => setDeleteTarget(null)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </Button>
            </>
          }
        >
          <p>¿Eliminar el pago de <strong>{mesLabel(deleteTarget.mes)} {deleteTarget.anio}</strong>?</p>
          <DialogoAviso tono="peligro">Esta acción no se puede deshacer.</DialogoAviso>
        </Dialogo>
      )}
    </div>
  );
};

export default PagosList;

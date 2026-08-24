import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { abrirAdjunto } from "../../../lib/archivos";
import { formatFecha, hoyISO } from "../../../lib/fechas";
import { useNotify } from "../../../hooks/useNotify";
import { mensajeDeError } from "../../../lib/httpErrors";
import { usePermisos } from "../../../auth/usePermisos";
import {
  createPago,
  deleteFactura,
  deletePago,
  getPagos,
  updatePago,
  uploadFactura,
} from "./pagos.api";
import {
  COLOR_ESTADO,
  ESTADOS,
  LABEL_ESTADO,
  formatMonto,
  type EstadoPago,
  type PagoInput,
  type PagoOS,
  type ResumenPagosOS,
} from "./pagos.types";
import s from "./Pagos.module.scss";

/**
 * Pestaña «Pagos» del perfil de una obra social.
 *
 * Registro mínimo por pedido del Colegio: **fecha, monto y estado**, más la
 * factura adjunta (PDF o foto del papel). Nada de concepto, período ni
 * vencimiento — campos que nadie completa sólo ensucian la pantalla.
 */
export default function PagosObraSocial({ obraId }: { obraId: number }) {
  const { error: avisarError, success: avisarOk } = useNotify();
  const { can } = usePermisos();
  const puedeEditar = can("catalogo:editar");

  const [items, setItems] = useState<PagoOS[]>([]);
  const [resumen, setResumen] = useState<ResumenPagosOS | null>(null);
  const [cargando, setCargando] = useState(true);

  const [editando, setEditando] = useState<{ id?: number; body: PagoInput } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState<number | null>(null);

  // Un input de archivo oculto, compartido: se dispara desde el clip de la fila
  // que se esté tocando. Uno por fila sería un nodo por pago sin ninguna razón.
  const fileRef = useRef<HTMLInputElement>(null);
  const destinoRef = useRef<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await getPagos(obraId);
      setItems(r.items);
      setResumen(r.resumen);
    } catch {
      avisarError("No se pudieron cargar los pagos.");
    } finally {
      setCargando(false);
    }
  }, [obraId, avisarError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async () => {
    if (!editando || guardando) return;
    const { id, body } = editando;
    if (!body.fecha || !body.monto.trim()) return;

    setGuardando(true);
    try {
      await (id ? updatePago(obraId, id, body) : createPago(obraId, body));
      setEditando(null);
      await cargar();
      avisarOk(id ? "Deuda actualizada." : "Deuda registrada.");
    } catch (err) {
      avisarError(mensajeDeError(err, "No se pudo guardar la deuda."));
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (p: PagoOS) => {
    try {
      await deletePago(obraId, p.id);
      await cargar();
      avisarOk("Registro eliminado.");
    } catch (err) {
      avisarError(mensajeDeError(err, "No se pudo eliminar el registro."));
    }
  };

  const pedirArchivo = (pagoId: number) => {
    destinoRef.current = pagoId;
    fileRef.current?.click();
  };

  const subir = async (archivo: File) => {
    const pagoId = destinoRef.current;
    if (!pagoId) return;
    setSubiendo(pagoId);
    try {
      await uploadFactura(obraId, pagoId, archivo);
      await cargar();
      avisarOk("Factura adjuntada.");
    } catch (err) {
      avisarError(mensajeDeError(err, "No se pudo adjuntar la factura."));
    } finally {
      setSubiendo(null);
      destinoRef.current = null;
      // Sin esto, volver a elegir el mismo archivo no dispara `onChange`.
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const quitarFactura = async (p: PagoOS) => {
    try {
      await deleteFactura(obraId, p.id);
      await cargar();
      avisarOk("Factura eliminada.");
    } catch (err) {
      avisarError(mensajeDeError(err, "No se pudo eliminar la factura."));
    }
  };

  const ver = (p: PagoOS) =>
    p.factura_url && abrirAdjunto(p.factura_url).catch((e) => avisarError(e.message));

  const cambiar = (parche: Partial<PagoInput>) =>
    setEditando((prev) => (prev ? { ...prev, body: { ...prev.body, ...parche } } : prev));

  return (
    <div className={s.wrap}>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff"
        className={s.hiddenFile}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void subir(f);
        }}
      />

      {resumen && (
        <div className={s.resumen}>
          <div className={s.metrica}>
            <span className={s.metricaLabel}>Total registrado</span>
            <span className={s.metricaValor}>{formatMonto(resumen.total)}</span>
          </div>
          <div className={s.metrica}>
            <span className={s.metricaLabel}>Adeudado</span>
            <span className={`${s.metricaValor} ${s.metricaSaldo}`}>
              {formatMonto(resumen.adeudado)}
            </span>
          </div>
          <div className={s.metrica}>
            <span className={s.metricaLabel}>Pagado</span>
            <span className={`${s.metricaValor} ${s.metricaOk}`}>
              {formatMonto(resumen.pagado)}
            </span>
          </div>
          <div className={s.metrica}>
            <span className={s.metricaLabel}>Sin saldar</span>
            <span className={s.metricaValor}>{resumen.pendientes}</span>
          </div>

          {puedeEditar && (
            <button
              type="button"
              className={s.primaryBtn}
              onClick={() =>
                setEditando({
                  // La fecha arranca en hoy, que es lo que se carga el 95% de
                  // las veces. `hoyISO()` usa componentes locales: con
                  // `toISOString()` después de las 21:00 daría mañana.
                  body: { fecha: hoyISO(), monto: "", estado: "pendiente" },
                })
              }
            >
              <Plus size={15} /> Registrar deuda
            </button>
          )}
        </div>
      )}

      {editando && (
        <div className={s.form}>
          <label className={s.field}>
            <span className={s.label}>Fecha</span>
            <input
              type="date"
              className={s.input}
              value={editando.body.fecha}
              onChange={(e) => cambiar({ fecha: e.target.value })}
            />
          </label>

          <label className={s.field}>
            <span className={s.label}>Monto</span>
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              className={s.input}
              value={editando.body.monto}
              onChange={(e) => cambiar({ monto: e.target.value })}
            />
          </label>

          <label className={s.field}>
            <span className={s.label}>Estado</span>
            <select
              className={s.input}
              value={editando.body.estado}
              onChange={(e) => cambiar({ estado: e.target.value as EstadoPago })}
            >
              {ESTADOS.map((x) => (
                <option key={x.valor} value={x.valor}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>

          <div className={s.formActions}>
            <button type="button" className={s.ghostBtn} onClick={() => setEditando(null)}>
              <X size={15} /> Cancelar
            </button>
            <button
              type="button"
              className={s.primaryBtn}
              onClick={guardar}
              disabled={!editando.body.fecha || !editando.body.monto.trim() || guardando}
            >
              {guardando ? <Loader2 size={15} className={s.spin} /> : <Save size={15} />}
              Guardar
            </button>
          </div>
        </div>
      )}

      {cargando ? (
        <div className={s.loading}>
          <Loader2 size={16} className={s.spin} /> Cargando…
        </div>
      ) : !items.length ? (
        <div className={s.empty}>
          <FileText size={26} />
          <p>No hay deudas registradas para esta obra social.</p>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.colFecha}>Fecha</th>
                <th className={s.colMonto}>Monto</th>
                <th className={s.colEstado}>Estado</th>
                <th className={s.colFactura}>Factura</th>
                {puedeEditar && <th className={s.colAcciones} />}
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td className={s.colFecha}>{formatFecha(p.fecha)}</td>
                  <td className={s.colMonto}>{formatMonto(p.monto)}</td>
                  <td className={s.colEstado}>
                    <span className={s.badge} style={{ background: COLOR_ESTADO[p.estado] }}>
                      {LABEL_ESTADO[p.estado]}
                    </span>
                  </td>
                  <td className={s.colFactura}>
                    {p.factura_url ? (
                      <div className={s.facturaCell}>
                        <button type="button" className={s.linkBtn} onClick={() => ver(p)}>
                          <FileText size={13} />
                          {p.factura_nombre || "Ver factura"}
                        </button>
                        {puedeEditar && (
                          <button
                            type="button"
                            className={s.iconDanger}
                            title="Quitar factura"
                            onClick={() => quitarFactura(p)}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    ) : puedeEditar ? (
                      <button
                        type="button"
                        className={s.linkBtn}
                        onClick={() => pedirArchivo(p.id)}
                        disabled={subiendo === p.id}
                      >
                        {subiendo === p.id ? (
                          <Loader2 size={13} className={s.spin} />
                        ) : (
                          <Paperclip size={13} />
                        )}
                        Adjuntar
                      </button>
                    ) : (
                      <span className={s.sinFactura}>—</span>
                    )}
                  </td>
                  {puedeEditar && (
                    <td className={s.colAcciones}>
                      {p.factura_url && (
                        <button
                          type="button"
                          className={s.iconBtn}
                          title="Reemplazar factura"
                          onClick={() => pedirArchivo(p.id)}
                        >
                          <Upload size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={s.iconBtn}
                        onClick={() =>
                          setEditando({
                            id: p.id,
                            body: { fecha: p.fecha, monto: p.monto, estado: p.estado },
                          })
                        }
                      >
                        <Pencil size={13} />
                      </button>
                      <button type="button" className={s.iconDanger} onClick={() => borrar(p)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightToLine, Plus, Trash2 } from "lucide-react";
import { getJSON, postJSON, delJSON } from "@/app/shared/lib/http";
import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import Button from "@/app/components/ui/Button/Button";
import Franja from "@/app/components/layout/Franja/Franja";
import Caja from "@/app/components/ui/Caja/Caja";
import Dialogo, { DialogoAviso, DialogoCampo } from "@/app/components/ui/Dialogo/Dialogo";
import SelectableTable from "@/app/components/ui/SelectableTable/SelectableTable";
import type { ActionDef, ColumnDef } from "@/app/components/ui/SelectableTable/types";
import AppSearchSelect, { type AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";
import { fetchMedicos } from "@/app/pages/Deducciones/api";
import type { MedicoOption } from "@/app/pages/Deducciones/types";
import lq from "../Liquidacion.module.scss";
import s from "./Adelantos.module.scss";
import { type ObraSocial, MESES, fmt, mesLabel, nroFacturaMarcado } from "../types";
import {
  ADELANTOS_FACTURAS_URL,
  ADELANTOS_LISTA_URL,
  ADELANTOS_RAIZ,
  ADELANTO_ESTADO_URL,
  ADELANTO_URL,
  type Adelanto,
  type AdelantoListaRow,
  type FacturaParaAdelanto,
  estadoAdelantoLabel,
} from "./utiles";

const OBRAS_SOCIALES_URL = "/api/obras_social/";

const estadoClass = (e: string) =>
  ({ A: lq.abierto, C: lq.cerrado, L: lq.enLiquidacion, AP: lq.aplicado })[e] ?? "";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

const mensajeDe = (e: any, porDefecto: string) => {
  const detail = e?.response?.data?.detail;
  return typeof detail === "string" ? detail : (e?.message ?? porDefecto);
};

const Adelantos: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  // Filtros
  const [filterOs, setFilterOs] = useState("");
  const [filterMedico, setFilterMedico] = useState<number | null>(null);
  const [filterMes, setFilterMes] = useState("");
  const [filterAnio, setFilterAnio] = useState("");
  const [filterEstado, setFilterEstado] = useState("");

  // Lista
  const [adelantos, setAdelantos] = useState<AdelantoListaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Catálogos de los filtros
  const [obras, setObras] = useState<ObraSocial[]>([]);
  const [obrasLoading, setObrasLoading] = useState(false);
  const [medicos, setMedicos] = useState<MedicoOption[]>([]);
  const [medicosLoading, setMedicosLoading] = useState(false);

  // Alta
  const [addOpen, setAddOpen] = useState(false);
  const [addOs, setAddOs] = useState("");
  const [facturas, setFacturas] = useState<FacturaParaAdelanto[]>([]);
  const [facturasLoading, setFacturasLoading] = useState(false);
  const [addFactura, setAddFactura] = useState<number | null>(null);
  const [addObs, setAddObs] = useState("");
  const [adding, setAdding] = useState(false);

  // Baja
  const [deleteTarget, setDeleteTarget] = useState<AdelantoListaRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const buildParams = useCallback(() => {
    const p: Record<string, string | number> = {};
    if (filterOs) p.obra_social_id = filterOs;
    if (filterMedico) p.medico_id = filterMedico;
    if (filterMes) p.mes = filterMes;
    if (filterAnio) p.anio = filterAnio;
    if (filterEstado) p.estado = filterEstado;
    return p;
  }, [filterOs, filterMedico, filterMes, filterAnio, filterEstado]);

  const fetchAdelantos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getJSON<AdelantoListaRow[]>(ADELANTOS_LISTA_URL, buildParams());
      setAdelantos(data ?? []);
    } catch (e: any) {
      setError(mensajeDe(e, "No se pudieron cargar los adelantos."));
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    void fetchAdelantos();
  }, [fetchAdelantos]);

  useEffect(() => {
    void (async () => {
      setObrasLoading(true);
      try {
        setObras((await getJSON<ObraSocial[]>(OBRAS_SOCIALES_URL)) ?? []);
      } finally {
        setObrasLoading(false);
      }
    })();
  }, []);

  // Sólo vale la última búsqueda: al tipear rápido las anteriores llegan tarde y se descartan.
  const ultimaBusqueda = useRef(0);
  const searchMedicos = async (query: string) => {
    const mia = ++ultimaBusqueda.current;
    setMedicosLoading(true);
    try {
      const rows = await fetchMedicos(query);
      if (mia === ultimaBusqueda.current) setMedicos(rows);
    } finally {
      if (mia === ultimaBusqueda.current) setMedicosLoading(false);
    }
  };
  useEffect(() => { void searchMedicos(""); }, []);

  const opcionesOs = useMemo<AppSearchSelectOption[]>(
    () => obras.map((o) => ({ id: String(o.nro_obra_social), label: `${o.nro_obra_social} - ${o.nombre}` })),
    [obras],
  );
  const opcionesMedico = useMemo<AppSearchSelectOption[]>(
    () => medicos.map((m) => ({ id: m.id, label: m.nombre, subtitle: m.nro_socio ? `#${m.nro_socio}` : undefined })),
    [medicos],
  );

  // ── Alta ──────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setAddOpen(true);
    setAddOs("");
    setFacturas([]);
    setAddFactura(null);
    setAddObs("");
  };

  const elegirOsDelAlta = async (val: string) => {
    setAddOs(val);
    setFacturas([]);
    setAddFactura(null);
    if (!val) return;
    setFacturasLoading(true);
    try {
      setFacturas((await getJSON<FacturaParaAdelanto[]>(ADELANTOS_FACTURAS_URL(Number(val)))) ?? []);
    } catch {
      setFacturas([]);
    } finally {
      setFacturasLoading(false);
    }
  };

  const crear = async () => {
    if (!addFactura) return;
    setAdding(true);
    try {
      const a = await postJSON<Adelanto>(ADELANTOS_RAIZ, {
        factura_id: addFactura,
        observacion: addObs.trim() || null,
      });
      navigate(`/panel/adelantos/${a.id}`);
    } catch (e: any) {
      notify(mensajeDe(e, "No se pudo crear el adelanto."), "error");
    } finally {
      setAdding(false);
    }
  };

  // ── Baja ──────────────────────────────────────────────────────────────────
  const eliminar = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await delJSON(ADELANTO_URL(deleteTarget.id));
      notify("Adelanto eliminado.");
      setDeleteTarget(null);
      void fetchAdelantos();
    } catch (e: any) {
      notify(mensajeDe(e, "No se pudo eliminar el adelanto."), "error");
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<AdelantoListaRow>[] = [
    { key: "id", header: "N°", render: (a) => <span className={lq.monto}>#{a.id}</span> },
    {
      key: "obra_social_nombre",
      header: "Obra social",
      render: (a) => (
        <span>
          <span className={lq.tenue}>#{a.obra_social_id}</span> {a.obra_social_nombre}
        </span>
      ),
    },
    {
      key: "nro_factura",
      header: "Factura",
      render: (a) => (
        <span className={s.celdaDoble}>
          <span className={lq.mono}>{nroFacturaMarcado(a.nro_factura, a.factura_version)}</span>
          <small>
            {mesLabel(a.mes_periodo)} {a.anio_periodo}
          </small>
        </span>
      ),
    },
    {
      key: "medico_nombre",
      header: "Médicos",
      render: (a) =>
        a.medicos === 0 ? (
          <span className={lq.tenue}>Sin prestaciones</span>
        ) : (
          <span className={s.celdaDoble}>
            {a.medico_nombre ?? "—"}
            {a.medicos > 1 && <small>y {a.medicos - 1} más</small>}
          </span>
        ),
    },
    { key: "prestaciones", header: "Prest.", alignRight: true, render: (a) => <span className={lq.monto}>{a.prestaciones}</span> },
    { key: "importe", header: "Importe", alignRight: true, render: (a) => <span className={lq.monto}>${fmt(a.importe)}</span> },
    {
      key: "estado",
      header: "Estado",
      render: (a) => <span className={`${lq.estado} ${estadoClass(a.estado)}`}>{estadoAdelantoLabel(a.estado)}</span>,
    },
    { key: "pago_id", header: "Pago", render: (a) => (a.pago_id ? `#${a.pago_id}` : <span className={lq.tenue}>—</span>) },
    {
      key: "acciones",
      header: "",
      render: (a) => (
        <div className={lq.accionesFila}>
          <BotonVer
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/panel/adelantos/${a.id}`);
            }}
          />
          {a.estado === "A" && (
            <button
              type="button"
              className={lq.botonIconoPeligro}
              title="Eliminar"
              aria-label={`Eliminar el adelanto ${a.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(a);
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const bulkActions: ActionDef<AdelantoListaRow>[] = [
    {
      label: "Pasar al pago",
      method: "PATCH",
      endpoint: (a) => ADELANTO_ESTADO_URL(a.id),
      payload: () => ({ estado: "L" }),
      restrictions: [
        {
          message: "Solo se pueden pasar al pago adelantos cerrados.",
          isAllowed: (rows) => rows.every((r) => r.estado === "C"),
        },
      ],
      confirmMessage: (n) => `¿Pasar ${n} adelanto${n !== 1 ? "s" : ""} al pago abierto?`,
      onSuccess: (ok, fail) => {
        if (ok) notify(`${ok} adelanto${ok !== 1 ? "s pasados" : " pasado"} al pago.`);
        if (fail) notify(`${fail} no pudo${fail !== 1 ? "ron" : ""} pasarse al pago.`, "error");
      },
    },
    {
      label: "Eliminar",
      method: "DELETE",
      endpoint: (a) => ADELANTO_URL(a.id),
      restrictions: [
        {
          message: "Solo se pueden eliminar adelantos abiertos.",
          isAllowed: (rows) => rows.every((r) => r.estado === "A"),
        },
      ],
      confirmMessage: (n) => `¿Eliminar ${n} adelanto${n !== 1 ? "s" : ""}? Sus prestaciones quedan libres.`,
      onSuccess: (ok, fail) => {
        if (ok) notify(`${ok} adelanto${ok !== 1 ? "s eliminados" : " eliminado"}.`);
        if (fail) notify(`${fail} no pudo${fail !== 1 ? "ron" : ""} eliminarse.`, "error");
      },
    },
  ];

  return (
    <div className={lq.pagina}>
      <Franja titulo="Adelantos" icono={ArrowRightToLine} />

      <p className={s.intro}>
        Prestaciones de una factura cerrada que se pagan antes que el resto. Cada adelanto es de <strong>una factura</strong> y
        entra al pago como un lote de débitos y créditos.
      </p>

      <Caja titulo="Configuración">
        <div className={lq.filtros}>
          <div className={`${lq.campo} ${lq.campoAncho}`}>
            <span className={lq.rotulo}>Obra social</span>
            <AppSearchSelect
              ordenar
              options={opcionesOs}
              value={filterOs || null}
              onChange={(val) => setFilterOs(val ? String(val) : "")}
              disabled={obrasLoading}
              loading={obrasLoading}
            />
          </div>
          <div className={`${lq.campo} ${lq.campoAncho}`}>
            <span className={lq.rotulo}>Médico</span>
            <AppSearchSelect
              options={opcionesMedico}
              value={filterMedico}
              onChange={(id) => setFilterMedico(id ? Number(id) : null)}
              onQueryChange={searchMedicos}
              loading={medicosLoading}
            />
          </div>
          <label className={lq.campo}>
            <span className={lq.rotulo}>Mes de la factura</span>
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
              <option value="L">En el pago</option>
              <option value="AP">Pagado</option>
            </select>
          </label>
        </div>
      </Caja>

      <div className={lq.barra}>
        <div className={lq.acciones}>
          <Button variant="primary" size="md" leftIcon={<Plus size={18} aria-hidden="true" />} onClick={openAdd}>
            Nuevo adelanto
          </Button>
        </div>
      </div>

      {error && <div className={lq.error} role="alert">{error}</div>}

      <SelectableTable
        rows={adelantos}
        columns={columns}
        actions={bulkActions}
        isSelectable={(r) => r.estado === "A" || r.estado === "C"}
        emptyMessage="Sin adelantos que coincidan con los filtros."
        loading={loading}
        onActionComplete={fetchAdelantos}
      />

      {addOpen && (
        <Dialogo
          titulo="Nuevo adelanto"
          icono={Plus}
          onClose={adding ? undefined : () => setAddOpen(false)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={adding}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={crear} disabled={adding || !addFactura}>
                {adding ? "Creando…" : "Crear y elegir prestaciones"}
              </Button>
            </>
          }
        >
          <DialogoCampo rotulo="Obra social">
            <AppSearchSelect
              ordenar
              options={opcionesOs}
              value={addOs || null}
              onChange={(val) => void elegirOsDelAlta(val ? String(val) : "")}
              disabled={obrasLoading || adding}
              loading={obrasLoading}
            />
          </DialogoCampo>

          <DialogoCampo rotulo="Factura cerrada">
            {!addOs ? (
              <p className={lq.tenue}>Elegí primero la obra social.</p>
            ) : facturasLoading ? (
              <p className={lq.tenue}>Cargando facturas…</p>
            ) : facturas.length === 0 ? (
              <p className={lq.tenue}>Esta obra social no tiene facturas cerradas con prestaciones para adelantar.</p>
            ) : (
              <div className={s.facturas} role="radiogroup" aria-label="Factura cerrada">
                {facturas.map((f) => (
                  <label key={f.FACTURA_ID} className={`${s.factura} ${addFactura === f.FACTURA_ID ? s.facturaElegida : ""}`}>
                    <input
                      type="radio"
                      name="factura"
                      checked={addFactura === f.FACTURA_ID}
                      onChange={() => setAddFactura(f.FACTURA_ID)}
                      disabled={adding}
                    />
                    <span className={s.celdaDoble}>
                      <span>
                        <span className={lq.mono}>{f.NRO_FACTURA ?? "—"}</span> · {mesLabel(f.MES)} {f.ANIO}
                      </span>
                      <small>
                        {f.VERSION > 1 ? `Complementaria ${f.VERSION - 1}` : "Original"} · {f.MEDICOS} médico{f.MEDICOS !== 1 ? "s" : ""}
                        {f.RESERVADAS > 0 ? ` · ${f.RESERVADAS} ya reservada${f.RESERVADAS !== 1 ? "s" : ""} en otros adelantos` : ""}
                      </small>
                    </span>
                    <span className={`${s.celdaDoble} ${s.derecha}`}>
                      <b>${fmt(f.IMPORTE_DISPONIBLE)}</b>
                      <small>{f.DISPONIBLES} disponibles</small>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </DialogoCampo>

          <DialogoCampo rotulo="Observación (opcional)" htmlFor="adel-obs">
            <input
              id="adel-obs"
              type="text"
              maxLength={255}
              value={addObs}
              onChange={(e) => setAddObs(e.target.value)}
              disabled={adding}
              placeholder="Por qué se adelanta, quién lo pidió…"
            />
          </DialogoCampo>

          <DialogoAviso>
            Solo aparecen facturas cerradas con prestaciones disponibles: las que no están pagadas, ni en un pago, ni en otro
            adelanto. Las prestaciones se eligen en el paso siguiente.
          </DialogoAviso>
        </Dialogo>
      )}

      {deleteTarget && (
        <Dialogo
          titulo="Eliminar adelanto"
          icono={Trash2}
          peligro
          onClose={deleting ? undefined : () => setDeleteTarget(null)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={eliminar} disabled={deleting}>
                {deleting ? "Eliminando…" : "Eliminar"}
              </Button>
            </>
          }
        >
          <p>
            ¿Eliminar el adelanto <strong>#{deleteTarget.id}</strong> de <strong>{deleteTarget.obra_social_nombre}</strong>
            {deleteTarget.nro_factura ? <> (factura <span className={lq.mono}>{deleteTarget.nro_factura}</span>)</> : null}?
          </p>
          <DialogoAviso tono="peligro">Sus {deleteTarget.prestaciones} prestaciones quedan libres para otro adelanto o para la factura.</DialogoAviso>
        </Dialogo>
      )}
    </div>
  );
};

export default Adelantos;

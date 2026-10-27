import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ban, HandCoins, Pencil, Plus } from "lucide-react";
import { getJSON, patchJSON, postJSON } from "@/app/shared/lib/http";
import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import Button from "@/app/components/ui/Button/Button";
import Franja from "@/app/components/layout/Franja/Franja";
import Caja from "@/app/components/ui/Caja/Caja";
import Dialogo, { DialogoAviso, DialogoCampo } from "@/app/components/ui/Dialogo/Dialogo";
import SelectableTable from "@/app/components/ui/SelectableTable/SelectableTable";
import type { ActionDef, ColumnDef } from "@/app/components/ui/SelectableTable/types";
import AppSearchSelect, { type AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import { fetchMedicos } from "@/app/pages/Deducciones/api";
import type { MedicoOption } from "@/app/pages/Deducciones/types";
import lq from "../Liquidacion.module.scss";
import s from "./Compensaciones.module.scss";
import { fmt } from "../types";
import {
  COMPENSACIONES_LISTA_URL,
  COMPENSACIONES_RAIZ,
  COMPENSACION_ANULAR_URL,
  COMPENSACION_ESTADO_URL,
  COMPENSACION_URL,
  type Compensacion,
  type CompensacionesLista,
  estadoCompensacionLabel,
  fechaCorta,
  importeConSigno,
} from "./utiles";

const estadoClass = (e: string) =>
  ({
    pendiente: lq.abierto,
    en_pago: lq.enLiquidacion,
    pagada: lq.aplicado,
    en_caja: lq.cerrado,
    anulada: lq.anulado,
  })[e] ?? "";

const mensajeDe = (e: any, porDefecto: string) => {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg).replace(/^Value error, /, "");
  return e?.message ?? porDefecto;
};

type Destino = "pendiente" | "pago" | "caja";

const Compensaciones: React.FC = () => {
  const notify = useAppSnackbar();

  // Filtros
  const [filterMedico, setFilterMedico] = useState<number | null>(null);
  const [filterEstado, setFilterEstado] = useState("");
  const [filterSentido, setFilterSentido] = useState("");
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");

  // Lista
  const [data, setData] = useState<CompensacionesLista | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selector de socios
  const [medicos, setMedicos] = useState<MedicoOption[]>([]);
  const [medicosLoading, setMedicosLoading] = useState(false);

  // Alta / edición
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Compensacion | null>(null);
  const [fMedico, setFMedico] = useState<number | null>(null);
  const [fSentido, setFSentido] = useState<"favor" | "contra">("favor");
  const [fImporte, setFImporte] = useState("");
  const [fLeyenda, setFLeyenda] = useState("");
  const [fNota, setFNota] = useState("");
  const [fDestino, setFDestino] = useState<Destino>("pendiente");
  const [guardando, setGuardando] = useState(false);

  // Anulación
  const [anulando, setAnulando] = useState<Compensacion | null>(null);
  const [motivo, setMotivo] = useState("");
  const [procesandoAnular, setProcesandoAnular] = useState(false);

  const buildParams = useCallback(() => {
    const p: Record<string, string | number> = {};
    if (filterMedico) p.medico_id = filterMedico;
    if (filterEstado) p.estado = filterEstado;
    if (filterSentido) p.sentido = filterSentido;
    if (filterDesde) p.desde = filterDesde;
    if (filterHasta) p.hasta = filterHasta;
    return p;
  }, [filterMedico, filterEstado, filterSentido, filterDesde, filterHasta]);

  const fetchLista = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getJSON<CompensacionesLista>(COMPENSACIONES_LISTA_URL, buildParams()));
    } catch (e: any) {
      setError(mensajeDe(e, "No se pudieron cargar las compensaciones."));
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    void fetchLista();
  }, [fetchLista]);

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

  const opcionesMedico = useMemo<AppSearchSelectOption[]>(() => {
    const base = medicos.map((m) => ({ id: m.id, label: m.nombre, subtitle: m.nro_socio ? `#${m.nro_socio}` : undefined }));
    // Al editar, el socio actual tiene que estar entre las opciones aunque la búsqueda no lo traiga.
    if (editando && !base.some((o) => o.id === editando.medico_id)) {
      base.unshift({
        id: editando.medico_id,
        label: editando.medico_nombre ?? `Socio ${editando.medico_id}`,
        subtitle: editando.medico_nro_socio ? `#${editando.medico_nro_socio}` : undefined,
      });
    }
    return base;
  }, [medicos, editando]);

  // ── Alta / edición ────────────────────────────────────────────────────────
  const abrirAlta = () => {
    setEditando(null);
    setFMedico(null);
    setFSentido("favor");
    setFImporte("");
    setFLeyenda("");
    setFNota("");
    setFDestino("pendiente");
    setFormOpen(true);
  };

  const abrirEdicion = (c: Compensacion) => {
    setEditando(c);
    setFMedico(c.medico_id);
    setFSentido(Number(c.importe) < 0 ? "contra" : "favor");
    setFImporte(String(Math.abs(Number(c.importe))));
    setFLeyenda(c.leyenda);
    setFNota(c.nota_interna ?? "");
    setFormOpen(true);
  };

  const importeNumero = Number(fImporte.replace(",", "."));
  const formValido = !!fMedico && Number.isFinite(importeNumero) && importeNumero > 0 && fLeyenda.trim().length > 0;

  const guardar = async () => {
    if (!formValido || !fMedico) return;
    const importe = fSentido === "contra" ? -importeNumero : importeNumero;
    setGuardando(true);
    try {
      if (editando) {
        await patchJSON(COMPENSACION_URL(editando.id), {
          medico_id: fMedico,
          importe,
          leyenda: fLeyenda.trim(),
          nota_interna: fNota.trim() || null,
        });
        notify("Compensación actualizada.");
      } else {
        await postJSON(COMPENSACIONES_RAIZ, {
          medico_id: fMedico,
          importe,
          leyenda: fLeyenda.trim(),
          nota_interna: fNota.trim() || null,
          destino: fDestino,
        });
        notify(
          fDestino === "pago"
            ? "Compensación creada y pasada al pago abierto."
            : fDestino === "caja"
              ? "Compensación registrada como pagada en caja."
              : "Compensación creada.",
        );
      }
      setFormOpen(false);
      void fetchLista();
    } catch (e: any) {
      notify(mensajeDe(e, "No se pudo guardar la compensación."), "error");
    } finally {
      setGuardando(false);
    }
  };

  // ── Anulación ─────────────────────────────────────────────────────────────
  const anular = async () => {
    if (!anulando || !motivo.trim()) return;
    setProcesandoAnular(true);
    try {
      await postJSON(COMPENSACION_ANULAR_URL(anulando.id), { motivo: motivo.trim() });
      notify("Compensación anulada.");
      setAnulando(null);
      setMotivo("");
      void fetchLista();
    } catch (e: any) {
      notify(mensajeDe(e, "No se pudo anular la compensación."), "error");
    } finally {
      setProcesandoAnular(false);
    }
  };

  const columns: ColumnDef<Compensacion>[] = [
    { key: "id", header: "N°", render: (c) => <span className={lq.monto}>#{c.id}</span> },
    {
      key: "created_at",
      header: "Cargada",
      render: (c) => (
        <span className={s.celdaDoble}>
          {fechaCorta(c.created_at)}
          <small>{c.creada_por ?? "—"}</small>
        </span>
      ),
    },
    {
      key: "medico_nombre",
      header: "Socio",
      render: (c) => (
        <span className={s.celdaDoble}>
          {c.medico_nombre ?? "—"}
          <small>{c.medico_nro_socio ? `Socio ${c.medico_nro_socio}` : ""}</small>
        </span>
      ),
    },
    {
      key: "leyenda",
      header: "Leyenda del recibo",
      render: (c) => (
        <span className={s.celdaDoble}>
          {c.leyenda}
          {c.motivo_anulacion ? (
            <small>Anulada: {c.motivo_anulacion}</small>
          ) : c.nota_interna ? (
            <small>{c.nota_interna}</small>
          ) : null}
        </span>
      ),
    },
    {
      key: "importe",
      header: "Importe",
      alignRight: true,
      render: (c) => (
        <span
          className={`${lq.monto} ${c.estado === "anulada" ? s.anulada : Number(c.importe) < 0 ? lq.menos : lq.mas}`}
          style={{ fontWeight: 700 }}
        >
          {importeConSigno(c.importe)}
        </span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (c) => (
        <span className={s.celdaDoble}>
          <span className={`${lq.estado} ${estadoClass(c.estado)}`}>{estadoCompensacionLabel(c.estado)}</span>
          {c.estado === "en_caja" && c.fecha_caja && <small>{fechaCorta(c.fecha_caja)}</small>}
        </span>
      ),
    },
    { key: "pago_id", header: "Pago", render: (c) => (c.pago_id ? `#${c.pago_id}` : <span className={lq.tenue}>—</span>) },
    {
      key: "acciones",
      header: "",
      render: (c) =>
        c.estado === "pendiente" ? (
          <div className={lq.accionesFila}>
            <button
              type="button"
              className={lq.botonIcono}
              title="Editar"
              aria-label={`Editar la compensación ${c.id}`}
              onClick={(e) => {
                e.stopPropagation();
                abrirEdicion(c);
              }}
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              className={lq.botonIconoPeligro}
              title="Anular"
              aria-label={`Anular la compensación ${c.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setAnulando(c);
                setMotivo("");
              }}
            >
              <Ban size={16} />
            </button>
          </div>
        ) : null,
    },
  ];

  const aviso = (ok: number, fail: number, singular: string, plural: string) => {
    if (ok) notify(`${ok} compensaci${ok !== 1 ? "ones" : "ón"} ${ok !== 1 ? plural : singular}.`);
    if (fail) notify(`${fail} no se pudo${fail !== 1 ? "ieron" : ""} completar.`, "error");
  };

  const cambio = (
    label: string,
    estado: "pendiente" | "en_pago" | "en_caja",
    soloDesde: Compensacion["estado"],
    mensajeRestriccion: string,
    confirmar: (n: number) => string,
    singular: string,
    plural: string,
  ): ActionDef<Compensacion> => ({
    label,
    method: "PATCH",
    endpoint: (c) => COMPENSACION_ESTADO_URL(c.id),
    payload: () => ({ estado }),
    restrictions: [{ message: mensajeRestriccion, isAllowed: (rows) => rows.every((r) => r.estado === soloDesde) }],
    confirmMessage: confirmar,
    onSuccess: (ok, fail) => aviso(ok, fail, singular, plural),
  });

  const bulkActions: ActionDef<Compensacion>[] = [
    cambio(
      "Pasar al pago",
      "en_pago",
      "pendiente",
      "Solo se pueden pasar al pago compensaciones pendientes.",
      (n) => `¿Pasar ${n} compensaci${n !== 1 ? "ones" : "ón"} al pago abierto?`,
      "pasada al pago",
      "pasadas al pago",
    ),
    cambio(
      "Pagar en caja",
      "en_caja",
      "pendiente",
      "Solo se pueden pagar en caja compensaciones pendientes.",
      (n) => `¿Registrar ${n} compensaci${n !== 1 ? "ones" : "ón"} como pagada${n !== 1 ? "s" : ""} en caja hoy?`,
      "pagada en caja",
      "pagadas en caja",
    ),
    cambio(
      "Quitar del pago",
      "pendiente",
      "en_pago",
      "Solo se pueden quitar del pago compensaciones que estén en el pago abierto.",
      (n) => `¿Quitar ${n} compensaci${n !== 1 ? "ones" : "ón"} del pago? Vuelven a pendientes.`,
      "quitada del pago",
      "quitadas del pago",
    ),
    cambio(
      "Deshacer pago en caja",
      "pendiente",
      "en_caja",
      "Solo se puede deshacer el pago en caja de compensaciones pagadas en caja.",
      (n) => `¿Deshacer el pago en caja de ${n} compensaci${n !== 1 ? "ones" : "ón"}? Vuelven a pendientes.`,
      "vuelta a pendiente",
      "vueltas a pendiente",
    ),
  ];

  const items = data?.items ?? [];

  return (
    <div className={lq.pagina}>
      <Franja titulo="Compensaciones" icono={HandCoins} />

      <p className={s.intro}>
        Plata que se le da o se le cobra a un socio por única vez, sin un concepto del catálogo: un regalo, un reintegro, una
        rotura. Entra a un pago o se paga en caja.
      </p>

      <Caja titulo="Configuración">
        <div className={lq.filtros}>
          <div className={`${lq.campo} ${lq.campoAncho}`}>
            <span className={lq.rotulo}>Socio</span>
            <AppSearchSelect
              options={opcionesMedico}
              value={filterMedico}
              onChange={(id) => setFilterMedico(id ? Number(id) : null)}
              onQueryChange={searchMedicos}
              loading={medicosLoading}
            />
          </div>
          <label className={lq.campo}>
            <span className={lq.rotulo}>Estado</span>
            <select className={lq.select} value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
              <option value="">Sin anuladas</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_pago">En el pago</option>
              <option value="pagada">Pagada</option>
              <option value="en_caja">Pagada en caja</option>
              <option value="anulada">Anulada</option>
              <option value="todas">Todas</option>
            </select>
          </label>
          <label className={lq.campo}>
            <span className={lq.rotulo}>Sentido</span>
            <select className={lq.select} value={filterSentido} onChange={(e) => setFilterSentido(e.target.value)}>
              <option value="">Todas</option>
              <option value="favor">A favor del socio (+)</option>
              <option value="contra">En contra del socio (−)</option>
            </select>
          </label>
          <label className={lq.campo}>
            <span className={lq.rotulo}>Cargada desde</span>
            <input className={lq.input} type="date" value={filterDesde} onChange={(e) => setFilterDesde(e.target.value)} />
          </label>
          <label className={lq.campo}>
            <span className={lq.rotulo}>Hasta</span>
            <input className={lq.input} type="date" value={filterHasta} onChange={(e) => setFilterHasta(e.target.value)} />
          </label>
        </div>
      </Caja>

      <div className={lq.barra}>
        <div className={lq.acciones}>
          <Button variant="primary" size="md" leftIcon={<Plus size={18} aria-hidden="true" />} onClick={abrirAlta}>
            Nueva compensación
          </Button>
        </div>
      </div>

      {error && <div className={lq.error} role="alert">{error}</div>}

      <SelectableTable
        rows={items}
        columns={columns}
        actions={bulkActions}
        isSelectable={(c) => c.estado === "pendiente" || c.estado === "en_pago" || c.estado === "en_caja"}
        emptyMessage="Sin compensaciones que coincidan con los filtros."
        loading={loading}
        onActionComplete={fetchLista}
      />

      {data && (
        <div className={s.totales}>
          <div className={s.total}>
            <span>A favor de socios</span>
            <b className={lq.mas}>+${fmt(data.totales.a_favor)}</b>
          </div>
          <div className={s.total}>
            <span>En contra de socios</span>
            <b className={lq.menos}>−${fmt(data.totales.en_contra)}</b>
          </div>
          <div className={s.total}>
            <span>Pendientes de pasar</span>
            <b>{data.totales.pendientes}</b>
          </div>
        </div>
      )}

      {formOpen && (
        <Dialogo
          titulo={editando ? `Editar compensación #${editando.id}` : "Nueva compensación"}
          icono={editando ? Pencil : Plus}
          onClose={guardando ? undefined : () => setFormOpen(false)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={guardando}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={() => void guardar()} disabled={guardando || !formValido}>
                {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear compensación"}
              </Button>
            </>
          }
        >
          <DialogoCampo rotulo="Socio">
            <AppSearchSelect
              options={opcionesMedico}
              value={fMedico}
              onChange={(id) => setFMedico(id ? Number(id) : null)}
              onQueryChange={searchMedicos}
              loading={medicosLoading}
              disabled={guardando}
            />
          </DialogoCampo>

          <DialogoCampo rotulo="Sentido">
            <div className={s.sentidos} role="radiogroup" aria-label="Sentido">
              <label className={`${s.sentido} ${fSentido === "favor" ? s.sentidoFavor : ""}`}>
                <input type="radio" name="sentido" checked={fSentido === "favor"} onChange={() => setFSentido("favor")} disabled={guardando} />
                <span className={s.celdaDoble}>
                  <b>A favor del socio (+)</b>
                  <small>Se le suma a lo que cobra. Un regalo, un reintegro.</small>
                </span>
              </label>
              <label className={`${s.sentido} ${fSentido === "contra" ? s.sentidoContra : ""}`}>
                <input type="radio" name="sentido" checked={fSentido === "contra"} onChange={() => setFSentido("contra")} disabled={guardando} />
                <span className={s.celdaDoble}>
                  <b>En contra del socio (−)</b>
                  <small>Se le resta. Una rotura, un pago bancario duplicado.</small>
                </span>
              </label>
            </div>
          </DialogoCampo>

          <DialogoCampo rotulo="Importe ($)" htmlFor="comp-importe">
            <input
              id="comp-importe"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={fImporte}
              onChange={(e) => setFImporte(e.target.value)}
              disabled={guardando}
              placeholder="0,00"
            />
          </DialogoCampo>

          <DialogoCampo rotulo="Leyenda del recibo (la ve el socio)" htmlFor="comp-leyenda">
            <input
              id="comp-leyenda"
              type="text"
              maxLength={160}
              value={fLeyenda}
              onChange={(e) => setFLeyenda(e.target.value)}
              disabled={guardando}
              placeholder="Regalo por su cumpleaños"
            />
          </DialogoCampo>

          <DialogoCampo rotulo="Nota interna (opcional, solo el Colegio)" htmlFor="comp-nota">
            <textarea
              id="comp-nota"
              rows={2}
              maxLength={500}
              value={fNota}
              onChange={(e) => setFNota(e.target.value)}
              disabled={guardando}
            />
          </DialogoCampo>

          {!editando && (
            <DialogoCampo rotulo="Cómo se paga">
              <div className={s.destinos} role="radiogroup" aria-label="Cómo se paga">
                <label className={lq.casilla}>
                  <input type="radio" name="destino" checked={fDestino === "pago"} onChange={() => setFDestino("pago")} disabled={guardando} />
                  Pasar al pago abierto
                </label>
                <label className={lq.casilla}>
                  <input type="radio" name="destino" checked={fDestino === "pendiente"} onChange={() => setFDestino("pendiente")} disabled={guardando} />
                  Dejar pendiente, para pasarla a un pago más adelante
                </label>
                <label className={lq.casilla}>
                  <input type="radio" name="destino" checked={fDestino === "caja"} onChange={() => setFDestino("caja")} disabled={guardando} />
                  Ya se pagó en caja (hoy)
                </label>
              </div>
            </DialogoCampo>
          )}

          <DialogoAviso>
            No paga contribuciones ni impuestos. Si el socio tiene deudas o cuotas pendientes, se le descuentan en el pago, como con
            cualquier cobro.
          </DialogoAviso>
        </Dialogo>
      )}

      {anulando && (
        <Dialogo
          titulo="Anular compensación"
          icono={Ban}
          peligro
          onClose={procesandoAnular ? undefined : () => setAnulando(null)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setAnulando(null)} disabled={procesandoAnular}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => void anular()} disabled={procesandoAnular || !motivo.trim()}>
                {procesandoAnular ? "Anulando…" : "Anular"}
              </Button>
            </>
          }
        >
          <p>
            ¿Anular la compensación <strong>#{anulando.id}</strong> de <strong>{anulando.medico_nombre}</strong> por{" "}
            <strong>{importeConSigno(anulando.importe)}</strong> ({anulando.leyenda})?
          </p>
          <DialogoCampo rotulo="Motivo (obligatorio)" htmlFor="comp-motivo">
            <input
              id="comp-motivo"
              type="text"
              maxLength={255}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={procesandoAnular}
              placeholder="Se cargó al socio equivocado"
            />
          </DialogoCampo>
          <DialogoAviso tono="peligro">No se borra: queda en la lista con su motivo.</DialogoAviso>
        </Dialogo>
      )}
    </div>
  );
};

export default Compensaciones;

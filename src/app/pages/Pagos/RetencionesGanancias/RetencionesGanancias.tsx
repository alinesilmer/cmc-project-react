import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Landmark } from "lucide-react";
import { getJSON } from "@/app/shared/lib/http";
import { abrirVentanaPdf, mostrarPdf } from "@/app/shared/lib/abrirPdf";
import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import Button from "@/app/components/ui/Button/Button";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
import Franja from "@/app/components/layout/Franja/Franja";
import Caja from "@/app/components/ui/Caja/Caja";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { exportarExcel, exportarPdf, nombreArchivo, type ColumnaExport, type DocumentoReporte } from "@/app/pages/Reportes/exportar";
import lq from "../Liquidacion.module.scss";
import s from "./RetencionesGanancias.module.scss";
import { MESES, fmt, mesLabel } from "../types";
import { construirComprobantes } from "./comprobantesPdf";
import {
  ESCALAS_GANANCIAS_URL,
  RETENCIONES_GANANCIAS_URL,
  type EscalaGanancias,
  type FilaRetencion,
  type ListadoRetenciones,
  formatCuit,
  tipoSujetoLabel,
} from "./utiles";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

const mensajeDe = (e: any, porDefecto: string) => {
  const detail = e?.response?.data?.detail;
  return typeof detail === "string" ? detail : e?.message ?? porDefecto;
};

const hoy = new Date();

const RetencionesGanancias: React.FC = () => {
  const notify = useAppSnackbar();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());

  const [data, setData] = useState<ListadoRetenciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [escalas, setEscalas] = useState<EscalaGanancias[]>([]);
  const [generando, setGenerando] = useState<"pdf" | "excel" | "comprobantes" | null>(null);

  const fetchListado = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getJSON<ListadoRetenciones>(RETENCIONES_GANANCIAS_URL, { anio, mes }));
    } catch (e: any) {
      setData(null);
      setError(mensajeDe(e, "No se pudo cargar el listado."));
    } finally {
      setLoading(false);
    }
  }, [anio, mes]);

  useEffect(() => {
    void fetchListado();
  }, [fetchListado]);

  useEffect(() => {
    getJSON<EscalaGanancias[]>(ESCALAS_GANANCIAS_URL).then(setEscalas).catch(() => setEscalas([]));
  }, []);

  // La escala que rige el mes elegido, por tipo de socio.
  const escalasDelMes = useMemo(() => {
    const primero = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const porTipo = new Map<string, EscalaGanancias>();
    for (const e of escalas) {
      if (e.vigente_desde <= primero && (!porTipo.has(e.tipo_sujeto) || porTipo.get(e.tipo_sujeto)!.vigente_desde < e.vigente_desde)) {
        porTipo.set(e.tipo_sujeto, e);
      }
    }
    return (["persona", "clinica", "juridica"] as const).map((t) => porTipo.get(t)).filter(Boolean) as EscalaGanancias[];
  }, [escalas, anio, mes]);

  const filas = data?.filas ?? [];
  const conComprobante = filas.filter((f) => f.retenido > 0);
  const periodo = `${mesLabel(mes)} ${anio}`;

  const documento = (): DocumentoReporte<FilaRetencion> => {
    const columnas: ColumnaExport<FilaRetencion>[] = [
      { header: "Nº socio", value: (f) => (f.nro_socio ? String(f.nro_socio) : "") },
      { header: "Socio", value: (f) => f.nombre },
      { header: "CUIT", value: (f) => formatCuit(f.cuit) },
      { header: "Tipo", value: (f) => (f.medico_id ? tipoSujetoLabel(f.tipo_sujeto) : "") },
      { header: "Honorarios", value: (f) => f.honorarios, tipo: "moneda" },
      { header: "Gastos", value: (f) => f.gastos, tipo: "moneda" },
      { header: "Monto imponible", value: (f) => f.base, tipo: "moneda" },
      { header: "Retención calculada", value: (f) => f.calculado, tipo: "moneda" },
      { header: "Retenido", value: (f) => f.retenido, tipo: "moneda" },
    ];
    const t = data!.totales;
    const total: FilaRetencion = {
      medico_id: 0, nro_socio: null, nombre: "TOTAL", cuit: null, tipo_sujeto: "persona",
      honorarios: t.honorarios, gastos: t.gastos, base: t.base, calculado: t.calculado, retenido: t.retenido,
    };
    const ag = data!.agente;
    return {
      titulo: "Retenciones de Ganancias",
      encabezado: "Retenciones de Ganancias",
      sinTotal: true,
      periodo,
      obraSocial: ag.nro_agente_retencion ? `Agente de retención Nº ${ag.nro_agente_retencion}` : "Impuesto a las Ganancias",
      columnas,
      filas: [...filas, total],
      nombre: nombreArchivo("retenciones-ganancias", `${anio}-${String(mes).padStart(2, "0")}`),
    };
  };

  const exportar = async (formato: "pdf" | "excel") => {
    setGenerando(formato);
    try {
      await (formato === "pdf" ? exportarPdf(documento()) : exportarExcel(documento()));
    } catch (e: any) {
      notify(mensajeDe(e, "No se pudo generar el archivo."), "error");
    } finally {
      setGenerando(null);
    }
  };

  const comprobantes = async (cuales: FilaRetencion[]) => {
    if (!data) return;
    const ventana = abrirVentanaPdf();
    setGenerando("comprobantes");
    try {
      const blob = await construirComprobantes(data, cuales);
      const sufijo = cuales.length === 1 ? `-socio-${cuales[0].nro_socio ?? cuales[0].medico_id}` : "";
      await mostrarPdf(blob, ventana, `${nombreArchivo("comprobantes-ganancias", `${anio}-${String(mes).padStart(2, "0")}`)}${sufijo}.pdf`);
    } catch (e: any) {
      ventana?.close();
      notify(mensajeDe(e, "No se pudieron generar los comprobantes."), "error");
    } finally {
      setGenerando(null);
    }
  };

  const anios = useMemo(() => {
    const out: number[] = [];
    for (let a = hoy.getFullYear() + 1; a >= 2023; a--) out.push(a);
    return out;
  }, []);

  return (
    <div className={lq.pagina}>
      <Franja titulo="Retenciones de Ganancias" icono={Landmark} />

      <p className={s.intro}>
        Lo que el Colegio retuvo del Impuesto a las Ganancias a cada socio en los pagos cerrados del mes, como agente de retención.
        De acá salen el listado para el contador y el comprobante que se le entrega a cada socio.
      </p>

      <Caja titulo="Mes">
        <div className={lq.filtros}>
          <label className={lq.campo}>
            <span className={lq.rotulo}>Mes</span>
            <select className={lq.select} value={mes} onChange={(e) => setMes(Number(e.target.value))}>
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </label>
          <label className={lq.campo}>
            <span className={lq.rotulo}>Año</span>
            <select className={lq.select} value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
              {anios.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
        </div>
        {escalasDelMes.length > 0 && (
          <p className={s.escala}>
            Escala vigente: no se retiene por debajo de{" "}
            {escalasDelMes.map((e, i) => (
              <React.Fragment key={e.id}>
                {i > 0 && (i === escalasDelMes.length - 1 ? " y " : ", ")}
                <b>${fmt(e.minimo_no_imponible)}</b> al mes ({tipoSujetoLabel(e.tipo_sujeto).toLowerCase()})
              </React.Fragment>
            ))}
            .
          </p>
        )}
      </Caja>

      <div className={lq.barra}>
        <div className={lq.acciones}>
          <BotonDescarga formato="pdf" onClick={() => void exportar("pdf")} disabled={!filas.length} cargando={generando === "pdf"} />
          <BotonDescarga formato="excel" onClick={() => void exportar("excel")} disabled={!filas.length} cargando={generando === "excel"} />
          <Button
            variant="primary"
            size="md"
            leftIcon={<FileText size={18} aria-hidden="true" />}
            onClick={() => void comprobantes(conComprobante)}
            disabled={!conComprobante.length || generando !== null}
          >
            {generando === "comprobantes" ? "Generando…" : `Comprobantes (${conComprobante.length})`}
          </Button>
        </div>
      </div>

      {data && data.pagos_abiertos.length > 0 && (
        <div className={lq.alerta} role="status">
          {data.pagos_abiertos.length === 1 ? `El pago #${data.pagos_abiertos[0]} de este mes está abierto` : `Los pagos #${data.pagos_abiertos.join(", #")} de este mes están abiertos`}
          : no entra{data.pagos_abiertos.length === 1 ? "" : "n"} en el listado hasta que se cierre{data.pagos_abiertos.length === 1 ? "" : "n"}.
        </div>
      )}
      {data && !data.agente.nro_agente_retencion && (
        <div className={lq.alerta} role="status">
          Falta el número de agente de retención en Datos del Colegio: los comprobantes salen sin él.
        </div>
      )}
      {error && <div className={lq.error} role="alert">{error}</div>}

      <div className={lq.tablaCaja}>
        {loading ? (
          <div className={lq.cargando}>Cargando retenciones…</div>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <th>Socio</th>
                <th>CUIT</th>
                <th>Tipo</th>
                <th className={s.num}>Honorarios</th>
                <th className={s.num}>Gastos</th>
                <th className={s.num}>Monto imponible</th>
                <th className={s.num}>Retenido</th>
                <th aria-label="Comprobante" />
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 && (
                <tr>
                  <td colSpan={8} className={lq.vacio}>
                    {data && data.pagos_incluidos.length === 0
                      ? `No hay pagos cerrados en ${periodo}.`
                      : `Nadie llegó al mínimo para retener en ${periodo}.`}
                  </td>
                </tr>
              )}
              {filas.map((f) => {
                const falta = f.calculado - f.retenido;
                return (
                  <tr key={f.medico_id}>
                    <td>
                      <span className={s.celdaDoble}>
                        <b>{f.nombre}</b>
                        {f.nro_socio && <small>#{f.nro_socio}</small>}
                      </span>
                    </td>
                    <td className={lq.mono}>{formatCuit(f.cuit) || <span className={lq.tenue}>sin CUIT</span>}</td>
                    <td>{tipoSujetoLabel(f.tipo_sujeto)}</td>
                    <td className={lq.monto}>${fmt(f.honorarios)}</td>
                    <td className={lq.monto}>${fmt(f.gastos)}</td>
                    <td className={lq.monto}>${fmt(f.base)}</td>
                    <td className={lq.monto}>
                      <span className={s.celdaDoble}>
                        <b>${fmt(f.retenido)}</b>
                        {falta > 0.005 && <small className={lq.menos}>faltó retener ${fmt(falta)}</small>}
                        {falta < -0.005 && <small>incluye ${fmt(-falta)} de meses anteriores</small>}
                      </span>
                    </td>
                    <td>
                      {f.retenido > 0 && (
                        <div className={lq.accionesFila}>
                          <BotonPlano
                            type="button"
                            className={lq.botonIcono}
                            title="Comprobante de retención"
                            aria-label={`Comprobante de retención de ${f.nombre}`}
                            onClick={() => void comprobantes([f])}
                            disabled={generando !== null}
                          >
                            <FileText size={16} />
                          </BotonPlano>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filas.length > 0 && data && (
              <tfoot>
                <tr className={s.total}>
                  <td colSpan={3}>Total · {filas.length} socio{filas.length !== 1 ? "s" : ""}</td>
                  <td className={lq.monto}>${fmt(data.totales.honorarios)}</td>
                  <td className={lq.monto}>${fmt(data.totales.gastos)}</td>
                  <td className={lq.monto}>${fmt(data.totales.base)}</td>
                  <td className={lq.monto}>${fmt(data.totales.retenido)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </Tabla>
        )}
      </div>

      {data && data.pagos_incluidos.length > 0 && (
        <p className={s.pie}>
          Pagos incluidos: #{data.pagos_incluidos.join(", #")}. «Retenido» es lo que se descontó de verdad; si a un socio no le
          alcanzó la plata, lo que faltó queda como deuda y se retiene en un pago siguiente.
        </p>
      )}
    </div>
  );
};

export default RetencionesGanancias;

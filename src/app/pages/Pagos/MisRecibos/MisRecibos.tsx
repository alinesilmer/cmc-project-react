import React, { useEffect, useRef, useState } from "react";
import { ReceiptText } from "lucide-react";

import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import Franja from "@/app/components/layout/Franja/Franja";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
import { comoErrorApi, detalleDeError } from "@/app/shared/lib/httpErrors";
import { CMC_LOGO_SRC, fetchAsDataUrl } from "@/app/shared/lib/documentos/institucion";
import l from "../Liquidacion.module.scss";
import { fechaDMA, fmt, mesLabel } from "../types";
import { generarReciboPdf } from "../pdf/reciboPdf";
import { getMiRecibo, listarMisRecibos, type MiRecibo } from "./misRecibos.api";

/**
 * Los recibos de liquidación del socio. Aparece cada uno cuando el Colegio lo emite (al marcar el pago como
 * pagado); hasta entonces es un borrador que puede cambiar y no se muestra.
 */
const MisRecibos: React.FC = () => {
  const notify = useAppSnackbar();
  const [rows, setRows] = useState<MiRecibo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // El logo se baja una sola vez: la segunda descarga ya lo tiene.
  const logoRef = useRef<ReturnType<typeof fetchAsDataUrl> | null>(null);
  const obtenerLogo = () => (logoRef.current ??= fetchAsDataUrl(CMC_LOGO_SRC));

  useEffect(() => {
    let cancelado = false;
    listarMisRecibos()
      .then((data) => { if (!cancelado) setRows(Array.isArray(data) ? data : []); })
      .catch((e: unknown) => {
        if (!cancelado) setError(detalleDeError(e, comoErrorApi(e).message || "No pudimos traer tus recibos."));
      })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, []);

  const descargar = async (r: MiRecibo) => {
    try {
      const detalle = await getMiRecibo(r.id);
      const logo = await obtenerLogo();
      const doc = await generarReciboPdf(
        { medico_id: 0, total_neto: detalle.total_neto, emision_timestamp: detalle.emision_timestamp, estado: detalle.estado, detalle_json: detalle.detalle_json ?? undefined },
        { id: detalle.pago_id, mes: detalle.mes, anio: detalle.anio },
        logo,
      );
      doc.save(`recibo_liquidacion_${detalle.pago_id}.pdf`);
    } catch (e) {
      notify(detalleDeError(e, "No pudimos armar el recibo."), "error");
    }
  };

  return (
    <div className={l.pagina}>
      <Franja titulo="Mis recibos" icono={ReceiptText} />

      {error && <div className={l.error} role="alert">{error}</div>}

      <div className={l.tablaCaja}>
        {loading ? (
          <div className={l.cargando}>Cargando…</div>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <th>Liquidación</th>
                <th>Período</th>
                <th>Emitido</th>
                <th>Neto a cobrar</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className={l.vacio}>
                    Todavía no tenés recibos emitidos. Aparecen acá cuando el Colegio paga la liquidación.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>Nº {r.pago_id}</td>
                  <td>{mesLabel(r.mes)} {r.anio}</td>
                  <td>{fechaDMA(r.emision_timestamp)}</td>
                  <td>${fmt(r.total_neto)}</td>
                  <td><BotonDescarga formato="pdf" onClick={() => descargar(r)} /></td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </div>
    </div>
  );
};

export default MisRecibos;

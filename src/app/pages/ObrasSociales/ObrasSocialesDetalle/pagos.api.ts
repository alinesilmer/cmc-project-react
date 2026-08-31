import { delJSON, getJSON, postForm, postJSON, putJSON } from "../../../lib/http";
import type { PagoInput, PagoOS, PagosPageOS } from "./pagos.types";

const base = (obraId: number) => `/api/obras_social/${obraId}/pagos`;

/** Los pagos de la obra social con sus totales. `catalogo:leer`. */
export const getPagos = (obraId: number): Promise<PagosPageOS> =>
  getJSON<PagosPageOS>(base(obraId));

export const createPago = (obraId: number, body: PagoInput): Promise<PagoOS> =>
  postJSON<PagoOS>(base(obraId), body);

/** Edita los datos. **La factura adjunta queda como estaba.** */
export const updatePago = (obraId: number, pagoId: number, body: PagoInput): Promise<PagoOS> =>
  putJSON<PagoOS>(`${base(obraId)}/${pagoId}`, body);

export const deletePago = (obraId: number, pagoId: number): Promise<void> =>
  delJSON<void>(`${base(obraId)}/${pagoId}`);

/**
 * Adjunta o reemplaza la factura: PDF o imagen escaneada.
 *
 * El backend valida el tipo por magic bytes, no por la extensión del nombre, y
 * si ya había una factura borra el archivo anterior del disco.
 */
export const uploadFactura = (obraId: number, pagoId: number, archivo: File): Promise<PagoOS> => {
  const form = new FormData();
  form.append("archivo", archivo);
  return postForm<PagoOS>(`${base(obraId)}/${pagoId}/factura`, form);
};

/** Saca la factura sin borrar el registro de la deuda. */
export const deleteFactura = (obraId: number, pagoId: number): Promise<PagoOS> =>
  delJSON<PagoOS>(`${base(obraId)}/${pagoId}/factura`);

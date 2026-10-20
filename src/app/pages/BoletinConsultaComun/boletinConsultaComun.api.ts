// Valor de la consulta común por obra social, leído del nomenclador nuevo (`nm_historial_precio_codigo`).

import { getJSON } from "@/app/shared/lib/http";
import { hoyISO } from "@/app/shared/lib/fechas";
import { aNumero } from "@/app/shared/lib/utiles";
import { listObrasSociales } from "@/app/pages/ObrasSociales/obrasSociales.api";
import {
  CONSULTA_COMUN_CODE,
  EXCLUDED_OS,
  SWISS_MEDICAL_CODE,
  SWISS_MEDICAL_NRO,
} from "./boletinConsultaComun.constants";
import { normalizeText } from "./boletinConsultaComun.helpers";
import { SIN_GALENOS, type ConsultaComunItem } from "./boletinConsultaComun.types";

interface ApiPrecio {
  obra_social_nro: number;
  precio_total: number | string;
  vigencia_desde: string | null;
  /** `null` = precio general; si no, el de una especialidad. */
  especialidad_id_colegio?: number | null;
}

interface ApiBoletinOut {
  items: ApiPrecio[];
}

/** El precio general le gana al de una especialidad; entre iguales, la vigencia más reciente y, si empatan, el precio más alto. */
function gana(item: ApiPrecio, previo: ApiPrecio): boolean {
  const esGeneral = item.especialidad_id_colegio == null;
  if (esGeneral !== (previo.especialidad_id_colegio == null)) return esGeneral;

  const nueva = item.vigencia_desde ?? "";
  const vieja = previo.vigencia_desde ?? "";
  if (nueva !== vieja) return nueva > vieja;
  return aNumero(item.precio_total) > aNumero(previo.precio_total);
}

/** Un precio por obra social para un código a una fecha. */
async function preciosPorOS(codigo: string, fecha: string): Promise<Map<number, ApiPrecio>> {
  const res = await getJSON<ApiBoletinOut>("/api/reportes_nm/boletin", { fecha, codigo });
  const porOS = new Map<number, ApiPrecio>();
  for (const item of res.items ?? []) {
    if (!item.obra_social_nro) continue;
    const previo = porOS.get(item.obra_social_nro);
    if (!previo || gana(item, previo)) porOS.set(item.obra_social_nro, item);
  }
  return porOS;
}

export async function fetchConsultaComun(): Promise<ConsultaComunItem[]> {
  const fecha = hoyISO();

  const [obras, consulta, swiss] = await Promise.all([
    listObrasSociales(),
    preciosPorOS(CONSULTA_COMUN_CODE, fecha),
    // Swiss Medical factura la consulta con su propio código; si no está cargado se sigue sin él.
    preciosPorOS(SWISS_MEDICAL_CODE, fecha).catch(() => new Map<number, ApiPrecio>()),
  ]);

  const swissPrecio = swiss.get(SWISS_MEDICAL_NRO);
  if (swissPrecio) consulta.set(SWISS_MEDICAL_NRO, swissPrecio);

  const nombres = new Map(
    obras.map((o) => [o.nro_obra_social, (o.nombre || o.denominacion || "").trim()] as const)
  );

  const items: ConsultaComunItem[] = [];
  for (const [nro, precio] of consulta) {
    const valor = aNumero(precio.precio_total);
    if (valor <= 0 || EXCLUDED_OS.has(nro)) continue;
    items.push({
      nro,
      nombre: normalizeText(nombres.get(nro) || `OS ${nro}`),
      valor,
      fechaCambio: precio.vigencia_desde,
      observaciones: [],
      galenos: SIN_GALENOS,
    });
  }

  return items.sort(
    (a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }) || a.nro - b.nro
  );
}

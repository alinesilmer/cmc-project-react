import { http } from "@/app/shared/lib/http";
import type { ObraSocial, Prestador } from "./types";
import {
  safeStr,
  sanitizePhone,
  cleanEspecialidades,
  coerceToStringArray,
} from "./helpers";

/** Todas las llamadas usan `http`, el cliente compartido: es el que agrega el `Authorization` y resuelve la base de la API. */

const ENDPOINTS = {
  obrasSociales: "/api/obras_social/",
  medicosByOS: (nroOS: number) => `/api/padrones/obras-sociales/${nroOS}/medicos`,
  medicosExportByOS: (nroOS: number) => `/api/padrones/obras-sociales/${nroOS}/medicos/export`,
};

/** Una fila tal como llega de la API: sin tipo hasta que se la mapea. */
type Crudo = Record<string, unknown>;

function mapObraSocialRawToOS(raw: Crudo | null | undefined): ObraSocial {
  const nro =
    raw?.NRO_OBRA_SOCIAL ??
    raw?.NRO_OBRASOCIAL ??
    raw?.nro_obra_social ??
    raw?.nro_obrasocial ??
    0;
  const nombre =
    raw?.NOMBRE ?? raw?.OBRA_SOCIAL ?? raw?.obra_social ?? raw?.nombre ?? "";
  const codigo = (raw?.CODIGO ??
    (Number.isFinite(Number(nro))
      ? `OS${String(Number(nro)).padStart(3, "0")}`
      : null)) as string | null;
  const activo = raw?.activo;
  const activa = (raw?.ACTIVA ?? (typeof activo === "boolean" ? (activo ? "S" : "N") : undefined)) as ObraSocial["ACTIVA"];
  return {
    NRO_OBRA_SOCIAL: Number(nro),
    NOMBRE: String(nombre),
    CODIGO: codigo,
    ACTIVA: activa,
  };
}

function unwrapPrestadorSource(it: Crudo | null | undefined): Crudo | null | undefined {
  return (it?.prestador ?? it?.medico ?? it?.doctor ?? it?.data ?? it?.item ?? it) as Crudo | null | undefined;
}

/** Primer valor no vacío entre varios alias de la misma columna; `T` es el tipo que promete la API. */
function pick<T = string>(src: Crudo | null | undefined, it: Crudo | null | undefined, ...claves: string[]): T | null {
  for (const k of claves) {
    const v = src?.[k] ?? it?.[k];
    if (v !== null && v !== undefined && v !== "") return v as T;
  }
  return null;
}

type Numerico = string | number;

function mapItemToPrestador(it: Crudo): Prestador {
  const src = unwrapPrestadorSource(it);

  const id = pick<Numerico>(src, it, "ID", "id");
  const nro = pick<Numerico>(src, it, "NRO_SOCIO", "nro_socio", "SOCIO", "socio");
  const nombre = pick(src, it, "NOMBRE", "nombre");

  const telefono_consulta = sanitizePhone(
    pick(src, it, "tel_consulta", "TEL_CONSULTA", "TELEFONO_CONSULTA", "telefono_consulta")
  );

  const especialidadesRaw = pick<unknown>(src, it, "ESPECIALIDADES", "especialidades");
  const especialidadSingle = pick<unknown>(src, it, "ESPECIALIDAD", "especialidad");
  const especialidades = cleanEspecialidades(coerceToStringArray(especialidadesRaw));
  const especialidad =
    especialidades[0] ?? (especialidadSingle ? safeStr(especialidadSingle) : null);

  return {
    id,
    nro_socio: nro,
    socio: nro,
    apellido_nombre: nombre,
    nombre,
    matricula_prov: pick<Numerico>(src, it, "MATRICULA_PROV", "matricula_prov"),
    // Estos cuatro ya venían en la respuesta y se descartaban al mapear; son columnas de exportación que no cuestan ningún pedido extra.
    matricula_nac: pick<Numerico>(src, it, "MATRICULA_NAC", "matricula_nac"),
    categoria: pick(src, it, "CATEGORIA", "categoria"),
    marca: pick(src, it, "MARCA", "marca"),
    especialidades,
    especialidad,
    telefono_consulta,
    domicilio_consulta: pick(src, it, "DOMICILIO_CONSULTA", "domicilio_consulta"),
    mail_particular: pick(src, it, "MAIL_PARTICULAR", "mail_particular"),
    cuit: pick(src, it, "CUIT", "cuit"),
    codigo_postal: pick(src, it, "CODIGO_POSTAL", "codigo_postal"),
  };
}

export async function fetchObrasSociales(
  signal?: AbortSignal
): Promise<ObraSocial[]> {
  // Una empresa con varios planes (Swiss Medical, Medife, Sancor...) tiene un único padrón.
  const { data } = await http.get(ENDPOINTS.obrasSociales, {
    signal,
    timeout: 20_000,
    params: { solo_principales: true },
  });
  const arr = Array.isArray(data) ? data : [];
  return arr
    .map(mapObraSocialRawToOS)
    .sort((a, b) => a.NOMBRE.localeCompare(b.NOMBRE, "es"));
}

export async function fetchPrestadoresAllPages(
  nroOS: number,
  signal?: AbortSignal
): Promise<Prestador[]> {
  // `/medicos/export` devuelve el mismo universo de filas que `/medicos` (misma familia, mismo dedup por NRO_SOCIO) pero sin paginar.
  const { data } = await http.get(ENDPOINTS.medicosExportByOS(nroOS), {
    timeout: 60_000,
    signal,
  });
  const items = Array.isArray(data) ? data : [];
  return items.map(mapItemToPrestador);
}

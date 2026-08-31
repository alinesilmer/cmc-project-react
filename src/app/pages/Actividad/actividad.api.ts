import type { AccionUsuario, FiltrosActividad, PaginaActividad } from "./actividad.types";

// ⚠ Sin backend todavía: devuelve datos de ejemplo.
//
// Cuando la API exista, lo único que cambia es `getActividad`:
//
//     export const getActividad = (f: FiltrosActividad = {}) =>
//       getJSON<PaginaActividad>("/api/actividad", f);
//
// y se borra el resto. La pantalla no se toca: habla contra el contrato de
// `actividad.types.ts`, no contra este mock. Qué le falta al backend está en
// INSTITUCION_AGENDA.md del repo de la API.

/** Para que la pantalla avise que está mostrando humo. */
export const USANDO_DATOS_DE_EJEMPLO = true;

const MODULOS = [
  "Pagos", "Facturación", "Nomenclador", "Socios", "Obras Sociales",
  "Liquidación", "Contenido", "Permisos",
];

const EJEMPLOS: Omit<AccionUsuario, "id" | "fecha">[] = [
  {
    usuario_id: 2402, usuario_nombre: "ANA", usuario_rol: "admin",
    descripcion: "Cerró el pago #4821 de IOSCOR", modulo: "Pagos",
    metodo: "POST", ruta: "/api/pagos/{pago_id}/cerrar",
    resultado: "ok", status_code: 200, ip: "190.51.20.14",
  },
  {
    usuario_id: 2404, usuario_nombre: "SUSANA", usuario_rol: "facturador",
    descripcion: "Cargó 34 prestaciones del período 2026-07", modulo: "Facturación",
    metodo: "POST", ruta: "/api/facturacion/prestaciones",
    resultado: "ok", status_code: 201, ip: "190.51.20.31",
  },
  {
    usuario_id: 2403, usuario_nombre: "GRACIELA", usuario_rol: "admin",
    descripcion: "Actualizó el valor del galeno quirúrgico nivel 4", modulo: "Nomenclador",
    metodo: "PUT", ruta: "/api/galenos/{galeno_id}",
    resultado: "ok", status_code: 200, ip: "190.51.20.9",
  },
  {
    usuario_id: 2446, usuario_nombre: "RIOS GARCIA CAMILA ALEJANDRA", usuario_rol: "liquidador",
    descripcion: "Intentó reabrir el pago #4790", modulo: "Pagos",
    metodo: "POST", ruta: "/api/pagos/{pago_id}/reabrir",
    resultado: "denegado", status_code: 403, ip: "190.51.20.44",
  },
  {
    usuario_id: 2416, usuario_nombre: "CARLOS GAUNA", usuario_rol: "admin",
    descripcion: "Editó el convenio de Swiss Medical", modulo: "Obras Sociales",
    metodo: "PUT", ruta: "/api/obras_social/{id}",
    resultado: "ok", status_code: 200, ip: "190.51.20.7",
  },
  {
    usuario_id: 2408, usuario_nombre: "ESTEBAN", usuario_rol: "admin",
    descripcion: "Publicó la planilla «Consulta IOSCOR 2026»", modulo: "Contenido",
    metodo: "POST", ruta: "/api/planillas/",
    resultado: "ok", status_code: 201, ip: "190.51.20.12",
  },
  {
    usuario_id: 2404, usuario_nombre: "SUSANA", usuario_rol: "facturador",
    descripcion: "Falló al importar el padrón de OSPM", modulo: "Socios",
    metodo: "POST", ruta: "/api/padrones/importar",
    resultado: "error", status_code: 500, ip: "190.51.20.31",
  },
  {
    usuario_id: 2412, usuario_nombre: "NELSON", usuario_rol: "admin",
    descripcion: "Le dio el rol «facturador» a SUSANA", modulo: "Permisos",
    metodo: "POST", ruta: "/api/admin/rbac/users/{user_id}/roles/{role_name}",
    resultado: "ok", status_code: 200, ip: "190.51.20.22",
  },
  {
    usuario_id: 2402, usuario_nombre: "ANA", usuario_rol: "admin",
    descripcion: "Generó la liquidación de agosto para OSDE", modulo: "Liquidación",
    metodo: "POST", ruta: "/api/liquidacion/",
    resultado: "ok", status_code: 201, ip: "190.51.20.14",
  },
  {
    usuario_id: 2427, usuario_nombre: "NATALIA", usuario_rol: "admin",
    descripcion: "Dio de baja el código 42.01.03", modulo: "Nomenclador",
    metodo: "DELETE", ruta: "/api/nomenclador/{id}",
    resultado: "ok", status_code: 204, ip: "190.51.20.18",
  },
];

/** 60 filas repartidas hacia atrás en el tiempo, para que la pantalla tenga cuerpo. */
const FILAS: AccionUsuario[] = Array.from({ length: 60 }, (_, i) => {
  const base = EJEMPLOS[i % EJEMPLOS.length];
  const cuando = new Date();
  // ~2.6 h de separación: cubre varios días sin quedar todo en la misma fecha.
  cuando.setMinutes(cuando.getMinutes() - i * 157);
  return { ...base, id: 1000 + i, fecha: cuando.toISOString() };
});

export const MODULOS_DISPONIBLES = MODULOS;

/** Los usuarios que aparecen en el registro, para el filtro. */
export const USUARIOS_DISPONIBLES = Array.from(
  new Map(EJEMPLOS.map((e) => [e.usuario_id, { id: e.usuario_id!, nombre: e.usuario_nombre }])).values()
).sort((a, b) => a.nombre.localeCompare(b.nombre));

/**
 * El registro paginado. **Hoy filtra en memoria sobre los datos de ejemplo**;
 * cuando exista la API, los mismos filtros viajan como query params.
 */
export async function getActividad(f: FiltrosActividad = {}): Promise<PaginaActividad> {
  // Latencia simulada: sin esto los estados de carga de la pantalla nunca se
  // ven y no se sabe si están bien hasta que llega el backend real.
  await new Promise((r) => setTimeout(r, 220));

  const page = f.page ?? 1;
  const size = f.size ?? 20;
  const aguja = f.q?.trim().toLowerCase();

  const filtradas = FILAS.filter((a) => {
    if (aguja && !`${a.descripcion} ${a.usuario_nombre}`.toLowerCase().includes(aguja)) return false;
    if (f.usuario_id && a.usuario_id !== f.usuario_id) return false;
    if (f.modulo && a.modulo !== f.modulo) return false;
    if (f.resultado && a.resultado !== f.resultado) return false;
    // Se compara sobre los 10 primeros caracteres del ISO (la parte `YYYY-MM-DD`)
    // para no construir un Date y arrastrar el corrimiento de zona horaria.
    if (f.desde && a.fecha.slice(0, 10) < f.desde) return false;
    if (f.hasta && a.fecha.slice(0, 10) > f.hasta) return false;
    return true;
  });

  return {
    items: filtradas.slice((page - 1) * size, page * size),
    total: filtradas.length,
    page,
    size,
  };
}

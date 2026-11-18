// Boletín de pediatría: qué códigos ve un pediatra en cada obra social.

/** ID_COLEGIO_ESPE de Pediatría: quien la tenga en cualquiera de sus slots ve este boletín. */
export const ESPECIALIDAD_PEDIATRIA = 39;

/** La consulta común: en el boletín de pediatría no se muestra, la reemplazan los códigos 320101 y 320002. */
export const CODIGO_CONSULTA_COMUN = "420351";

/** Nombre corto de cada código, tomado de la descripción que tienen cargada las obras sociales (que varía de redacción entre una y otra). */
export const NOMBRE_CODIGO: Record<string, string> = {
  "320101": "Consulta de demanda espontánea",
  "420133": "Consulta 420133",
  "320002": "Consulta programada / interconsulta",
  "420332": "Consulta en internación",
  "320104": "Recién nacido normal en sala de parto",
  "320105": "Recién nacido patológico en sala de parto",
};

const COMPLETO = ["420132", "420232", "420332", "320104", "320105"];

export const CODIGOS_PEDIATRIA: Record<number, string[]> = {
  3: COMPLETO,
  4: COMPLETO,
  6: ["420351", "320104"],
  7: COMPLETO,
  9: COMPLETO,
  12: ["420351", "320104"],
  14: ["420351", "420232", "420332", "320104", "320105"],
  17: COMPLETO,
  25: ["420132", "420332", "320104", "320105"],
  27: COMPLETO,
  29: COMPLETO,
  36: COMPLETO,
  42: COMPLETO,
  52: COMPLETO,
  53: COMPLETO,
  57: COMPLETO,
  58: COMPLETO,
  62: COMPLETO,
  72: COMPLETO,
  77: ["420132", "420232", "320104"],
  81: ["420132", "420133", "420232", "320104", "320105"],
  96: COMPLETO,
  98: COMPLETO,
  103: ["420351", "320104"],
  105: ["420351", "320104", "320105"],
  106: COMPLETO,
  122: ["420132", "420332", "320104", "320105"],
  123: COMPLETO,
  134: ["420132", "420232", "320104", "320105"],
  145: COMPLETO,
  151: COMPLETO,
  189: COMPLETO,
  209: COMPLETO,
  238: COMPLETO,
  243: COMPLETO,
  252: ["420351", "320104"],
  256: ["420351"],
  285: ["420351", "320104"],
  296: ["420132", "420232", "320104", "320105"],
  355: COMPLETO,
  373: ["420351"],
  375: COMPLETO,
  408: COMPLETO,
  411: ["420132", "320104", "320105"],
  415: COMPLETO,
  420: COMPLETO,
  421: COMPLETO,
  424: COMPLETO,
  425: COMPLETO,
  426: ["420132", "420232", "420332", "320104"],
  433: COMPLETO,
  434: COMPLETO,
  435: COMPLETO,
  444: COMPLETO,
};

/** Código que se muestra → el número viejo con el que la obra social puede tenerlo cargado. */
const CODIGO_VIEJO: Record<string, string> = { "320101": "420132", "320002": "420232" };
const CODIGO_NUEVO: Record<string, string> = { "420132": "320101", "420232": "320002" };

/** El número viejo de un código que se muestra con número nuevo; `undefined` si no cambió. */
export const codigoViejo = (codigo: string): string | undefined => CODIGO_VIEJO[codigo];

/** Los códigos que ve el pediatra en una obra social: 420132 y 420232 salen como 320101 y 320002, y la consulta común se cambia por esos dos. */
export function codigosPediatria(nro: number): string[] {
  const codigos = new Set<string>();
  for (const codigo of CODIGOS_PEDIATRIA[nro] ?? []) {
    if (codigo === CODIGO_CONSULTA_COMUN) {
      codigos.add("320101");
      codigos.add("320002");
    } else {
      codigos.add(CODIGO_NUEVO[codigo] ?? codigo);
    }
  }
  return [...codigos];
}

/** Todos los códigos a consultar: los que se muestran y, para 320101 y 320002, también el número viejo por si ahí está el precio. */
export const CODIGOS_CON_PRECIO_PEDIATRICO = [
  ...new Set(
    Object.keys(CODIGOS_PEDIATRIA)
      .flatMap((nro) => codigosPediatria(Number(nro)))
      .flatMap((codigo) => (CODIGO_VIEJO[codigo] ? [codigo, CODIGO_VIEJO[codigo]] : [codigo])),
  ),
];

/** `true` si el médico tiene Pediatría en cualquiera de sus especialidades. */
export const esPediatra = (especialidades: readonly number[] | undefined): boolean =>
  Boolean(especialidades?.includes(ESPECIALIDAD_PEDIATRIA));

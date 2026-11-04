// El motivo de un rechazo, en una línea corta. Cada obra social contesta a su manera (algunas en mayúsculas, con códigos HL7 o con el prefijo de su propio estado); acá se llevan a un texto claro y parejo. Lo que no se reconoce se muestra limpio, sin perder información.

/** Lo que el panel puso adelante de las filas viejas de Sancor/Nobis que quedaron a la espera de la obra social. */
const PREFIJO_PENDIENTE = /^Pendiente de autorización de la obra social\.\s*/i;
/** Estado propio de Nobis delante del mensaje: `R-Rechazada · …`, `P-Pendiente · …`. */
const PREFIJO_LETRA_NOBIS = /^[ARP]-\w+\s*(?:·\s*)?/i;
/** Encabezado de Sancor que viene solo cuando no hay un motivo más específico. */
const SOLO_RECHAZADO = /^(?:rechazad[oa]s?|prestaciones rechazadas)\.?$/i;

const REGLAS: [RegExp, string][] = [
  [/^AE\b.*\b999\b|handshake|servicio interno/i, "El autorizador no respondió. Probá de nuevo en unos minutos"],
  [/no se encuentra token/i, "Falta el token de autenticación"],
  [/token/i, "Token inválido o ya usado"],
  [/plan no convenido/i, "Plan no convenido: se atiende en la red que le asignaron"],
  [/oficinas de sancor/i, "El afiliado debe tramitarla en oficinas de Sancor"],
  [/requiere autorizaci[oó]n seg[uú]n consumo/i, "Requiere autorización de la obra social por consumo del afiliado"],
  [/requiere autorizaci[oó]n/i, "Requiere autorización previa de la obra social"],
  [/inhabilitado para el acceso/i, "Afiliado inhabilitado: debe regularizar su situación en la obra social"],
  [/inactivo|suspendido/i, "Afiliado inactivo en la obra social"],
  [/afiliado inexistente|asociado inexistente|afiliado no encontrado|asociado no encontrado/i, "Afiliado no encontrado: revisá el número de credencial"],
  [/solicitante.*no existe/i, "El médico solicitante no existe en la obra social"],
  [/sin cobertura para el plan/i, "Sin cobertura para el plan del afiliado"],
  [/ya realizada dentro de los 12 meses/i, "Práctica ya realizada en los últimos 12 meses"],
  [/repetida en el d[ií]a/i, "Práctica repetida en el día"],
  [/no habilitada para el prestador|prestador inhabilitado/i, "Prestador no habilitado para esta práctica"],
  [/no habilitada en el online/i, "Práctica no habilitada para validar en línea"],
  [/inexistente/i, "Práctica inexistente en el nomenclador de la obra social"],
  [/sin valor en convenio/i, "Código sin valor en el convenio"],
  [/fecha de prescripci[oó]n.*mayor/i, "La fecha de prescripción es posterior a hoy"],
  [/seg[uú]n sexo/i, "La práctica no corresponde según el sexo del afiliado"],
  [/instancia de control/i, "En instancia de control de la obra social"],
  [/orden anulada/i, "Orden anulada"],
];

/** Pasa a mayúscula inicial y deja el resto como vino (sin tocar siglas ni nombres propios). */
const conInicial = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * El motivo de rechazo en una línea corta y clara. Sirve igual para las filas nuevas y para las anteriores al cambio (que traen el prefijo "Pendiente de autorización de la obra social." o el estado de Nobis adelante).
 * Si no reconoce el mensaje devuelve el texto de la obra social limpio.
 */
export function motivoResumido(detalle?: string | null): string {
  let t = (detalle ?? "").replace(/\s+/g, " ").trim();
  t = t.replace(PREFIJO_PENDIENTE, "").replace(PREFIJO_LETRA_NOBIS, "").trim();
  t = t.replace(/^rechazado\.\s*/i, "").trim();

  if (/^P-\w+\s*$/i.test((detalle ?? "").trim())) return "Orden pendiente de resolución en la obra social";
  if (t === "" || SOLO_RECHAZADO.test(t)) return "Rechazada por la obra social";

  for (const [patron, texto] of REGLAS) {
    if (patron.test(t)) return texto;
  }
  return conInicial(t);
}

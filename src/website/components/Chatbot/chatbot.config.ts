import type { Intent } from "./chatbot.types";
import { INTENTS_MEDICUS } from "./intents/medicus";
import { INTENTS_OBRAS_SOCIALES } from "./intents/obrasSociales";
import { INTENTS_ACCESO } from "./intents/acceso";
import { INTENTS_INSTITUCIONAL } from "./intents/institucional";

export const GREETING =
  "¡Hola! Soy el asistente del Colegio Médico de Corrientes. " +
  "Puedo ayudarle con información sobre nuestros servicios, la quinta, " +
  "cursos, convenios y más. ¿En qué puedo ayudarle?";

export const FALLBACK_MESSAGE =
  "Lo siento, no tengo información sobre ese tema. " +
  "Para consultas personalizadas, puede contactarnos por WhatsApp " +
  "o visitarnos en nuestra página de contacto.";

/**
 * Orden de prioridad: gana el primer intent con alguna palabra clave presente
 * en el mensaje, así que el orden decide qué se responde cuando dos coinciden.
 * Los intents viven agrupados por tema en `intents/`; acá sólo se ordenan.
 */
const PRIORIDAD = [
  "medicus_menu",
  "ordenes",
  "asociarme",
  "quinta",
  // Antes que "obras_sociales": las consultas puntuales («¿tiene convenio
  // con…?») tienen que ganarle al intent genérico.
  "obras_sociales_check",
  "convenio_request",
  // Procedimientos de una obra social en particular: antes del genérico para
  // que el nombre gane, después del check para no pisar la consulta en vivo.
  "swiss_medical",
  "union_personal",
  "obras_sociales",
  "servicios",
  "cursos",
  "noticias",
  "medicos",
  "seguros",
  "contacto",
  "instagram",
  // Acceso: de lo más específico a lo más general.
  "login_problem",
  "login_credentials",
  "login",
  "nosotros",
  "horarios",
  "autorizaciones_practicas",
  "consultar_valores_os",
  "page_error",
  // Subtemas de MEDICUS: al final, porque sus palabras clave son muy
  // específicas y no deben tapar a las generales.
  "medicus_planes",
  "medicus_copagos",
  "medicus_exclusiones",
  "medicus_osfa",
  "medicus_autorizaciones",
] as const;

function ordenar(intents: Intent[]): Intent[] {
  const porId = new Map(intents.map((i) => [i.id, i]));
  const ordenados = PRIORIDAD.map((id) => porId.get(id)).filter((i): i is Intent => Boolean(i));
  // Un intent nuevo que no se agregó a PRIORIDAD nunca respondería: mejor
  // enterarse en desarrollo que descubrirlo en producción.
  if (import.meta.env.DEV && ordenados.length !== intents.length) {
    const faltan = intents.filter((i) => !(PRIORIDAD as readonly string[]).includes(i.id));
    console.error("chatbot: intents sin prioridad asignada:", faltan.map((i) => i.id));
  }
  return ordenados;
}

export const INTENTS: Intent[] = ordenar([
  ...INTENTS_MEDICUS,
  ...INTENTS_OBRAS_SOCIALES,
  ...INTENTS_ACCESO,
  ...INTENTS_INSTITUCIONAL,
]);

/** Botones de acceso rápido: los intents que tienen `chipLabel`, en orden de prioridad. */
export const QUICK_CHIPS = INTENTS.filter((i) => i.chipLabel).map((i) => ({
  key: i.id,
  label: i.chipLabel as string,
}));

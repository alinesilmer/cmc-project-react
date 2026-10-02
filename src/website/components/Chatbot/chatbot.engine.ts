/**
 * Motor de intents: lógica pura, sin efectos ni UI.
 */

import { INTENTS } from "./chatbot.config";
import { WHATSAPP_NUMBERS, type DepartamentoWhatsApp } from "./chatbot.enlaces";
import type { Intent } from "./chatbot.types";
import { normalizar } from "../../lib/texto";
import { linkWhatsApp } from "../../lib/contacto";

/** Largo máximo de un mensaje del usuario. */
export const MAX_MENSAJE = 200;

// ─── Palabras que no forman parte del nombre de una obra social ─────────────────

const OS_STOP_WORDS = new Set([
  // De convenio
  "tiene", "tienen", "convenio", "convenios", "con", "el", "la", "los", "las",
  "trabaja", "trabajan", "opera", "operan", "acepta", "aceptan",
  "cubre", "cubren", "funciona", "funcionan", "atiende", "atienden",
  "colegio", "medico", "obra", "social", "obrasocial",
  "esta", "incluida", "incluye", "incluyen",
  "mi", "tu", "su", "mis", "tus", "sus",
  "me", "te", "se",
  "si", "no", "y", "o", "de", "en", "por", "para", "que", "es", "son",
  "hay", "al", "del", "este", "ese", "esa", "un", "una", "uno",
  "puedo", "puede", "pueden", "atender",
  // De precio: «cuanto cuesta la consulta para SANCOR» → «sancor»
  "precio", "precios", "valor", "valores", "cuanto", "cuantos", "cuanta",
  "cuesta", "cuestan", "cobran", "cobra", "costar", "costo",
  "tarifa", "tarifas", "honorario", "honorarios", "importe", "importes",
  "consulta", "comun", "codigo", "420351", "basico", "general",
  "pagar", "pago",
]);

/**
 * El posible nombre de una obra social dentro de un mensaje: lo que queda al
 * sacar las palabras de relleno. Vacío si no queda nada.
 */
export function extractObrasSocialesQuery(mensaje: string): string {
  return normalizar(mensaje)
    .split(" ")
    .filter((w) => w.length > 1 && !OS_STOP_WORDS.has(w))
    .join(" ");
}

/**
 * Limpia lo que escribió el usuario: sin espacios de más y con tope de largo.
 *
 * No escapa HTML: el texto se muestra como nodo de texto de React, que ya lo
 * escapa. Escaparlo acá además hacía que quien escribía «<» viera «&lt;» en su
 * propio mensaje.
 */
export function sanitizeInput(mensaje: string): string {
  return mensaje.replace(/\s+/g, " ").trim().slice(0, MAX_MENSAJE);
}

/** El primer intent con alguna palabra clave presente en el mensaje, o `null`. */
export function matchIntent(mensaje: string): Intent | null {
  const texto = normalizar(mensaje);
  if (!texto) return null;
  return INTENTS.find((intent) => intent.keywords.some((kw) => texto.includes(normalizar(kw)))) ?? null;
}

/** Enlace de WhatsApp al área indicada, con un saludo ya escrito. */
export function buildWhatsAppUrl(area: DepartamentoWhatsApp): string {
  return linkWhatsApp(WHATSAPP_NUMBERS[area].number, "Hola, quisiera hacer una consulta");
}

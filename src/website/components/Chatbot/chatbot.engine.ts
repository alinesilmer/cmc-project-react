/**
 * chatbot.engine.ts
 * ─────────────────
 * Pure intent-matching logic. No side effects, no UI, no imports from src/app.
 */

import {
  INTENTS,
  WHATSAPP_NUMBERS,
  type Intent,
  type WhatsAppDept,
} from "./chatbot.config";

// ─── Stop words for OS name extraction ───────────────────────────────────────

const OS_STOP_WORDS = new Set([
  // Convenio-related
  "tiene", "tienen", "convenio", "convenios", "con", "el", "la", "los", "las",
  "trabaja", "trabajan", "opera", "operan", "acepta", "aceptan",
  "cubre", "cubren", "funciona", "funcionan", "atiende", "atienden",
  "colegio", "medico", "obra", "social", "obrasocial",
  "esta", "incluida", "incluye", "incluyen",
  "mi", "tu", "su", "mis", "tus", "sus",
  "me", "te", "se",
  "si", "no", "y", "o", "de", "en", "por", "para", "que", "es", "son",
  "hay", "al", "del", "este", "esta", "ese", "esa", "un", "una", "uno",
  "puedo", "puede", "pueden", "atender",
  // Price-related — so "cuanto cuesta la consulta para SANCOR" → "sancor"
  "precio", "precios", "valor", "valores", "cuanto", "cuantos", "cuanta",
  "cuesta", "cuestan", "cobran", "cobra", "costar", "costo",
  "tarifa", "tarifas", "honorario", "honorarios", "importe", "importes",
  "consulta", "comun", "codigo", "420351", "basico", "general",
  "pagar", "pago",
]);

/**
 * Extract a candidate obra social name from a user message.
 * Strips common Spanish stop words and returns the remainder.
 * Returns empty string when nothing meaningful remains.
 */
export function extractObrasSocialesQuery(raw: string): string {
  const words = normalize(raw)
    .split(/\s+/)
    .filter((w) => w.length > 1 && !OS_STOP_WORDS.has(w));
  return words.join(" ").trim();
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

/**
 * Normalize text for comparison:
 * lowercase → strip accents → replace non-alphanumeric with spaces → collapse spaces
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // remove combining diacritics
    .replace(/[^a-z0-9\s]/g, " ")      // strip punctuation / symbols
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Security helpers ─────────────────────────────────────────────────────────

const INJECTION_PATTERN =
  /(<script|javascript:|on\w+\s*=|document\.|window\.|eval\s*\(|alert\s*\()/i;

/** Returns true for inputs that look like injection/XSS attempts */
function isSuspicious(raw: string): boolean {
  return INJECTION_PATTERN.test(raw);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sanitize raw user input before display or matching.
 * - escapes angle brackets (no HTML injection)
 * - strips common JS injection patterns
 * - caps at 200 characters
 */
export function sanitizeInput(raw: string): string {
  return raw
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .slice(0, 200)
    .trim();
}

/**
 * Find the best matching intent for the given user message.
 * Returns null when no intent matches (caller should show fallback).
 */
export function matchIntent(raw: string): Intent | null {
  if (!raw || isSuspicious(raw)) return null;

  const text = normalize(raw);
  if (!text) return null;

  for (const intent of INTENTS) {
    for (const kw of intent.keywords) {
      if (text.includes(normalize(kw))) {
        return intent;
      }
    }
  }

  return null;
}

/**
 * Build a WhatsApp deep-link for the given department.
 * The optional userMessage is included in the pre-filled chat text (capped
 * at 100 chars so the URL stays reasonable).
 */
export function buildWhatsAppUrl(
  dept: WhatsAppDept,
  userMessage?: string
): string {
  const { number } = WHATSAPP_NUMBERS[dept];
  const body = userMessage
    ? `Hola, tengo una consulta: ${userMessage.slice(0, 100)}`
    : "Hola, quisiera hacer una consulta";
  return `https://wa.me/${number}?text=${encodeURIComponent(body)}`;
}

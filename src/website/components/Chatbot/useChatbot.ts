import { useCallback, useEffect, useRef, useState } from "react";
import { FALLBACK_MESSAGE, GREETING, QUICK_CHIPS } from "./chatbot.config";
import { extractObrasSocialesQuery, matchIntent, sanitizeInput } from "./chatbot.engine";
import { checkObraSocial } from "./chatbot.service";
import type { ChatMsg } from "./chatbot.types";

const DEMORA_ESCRIBIENDO_MS = 650;

// Tope de mensajes: 10 por minuto. El bot no consulta nada caro, pero sin
// esto un script podía martillar /api/obras_social desde la página pública.
const LIMITE_MENSAJES = 10;
const VENTANA_MS = 60_000;

let ultimoId = 0;
const nuevoId = () => `m${++ultimoId}`;

type MensajeBot = Omit<ChatMsg, "id" | "role">;

/** Arma la respuesta para un mensaje ya limpio. `null` si se canceló. */
async function resolver(texto: string, signal: AbortSignal): Promise<MensajeBot | null> {
  const intent = matchIntent(texto);
  if (!intent) {
    return { text: FALLBACK_MESSAGE, links: [{ label: "Contacto", href: "/contacto" }], whatsapp: "auditoria" };
  }

  const generica: MensajeBot = {
    text: intent.answer,
    links: intent.links,
    whatsapp: intent.whatsapp,
    menuOptions: intent.menuOptions,
  };

  const consulta = intent.asyncAction === "check_obra_social" ? extractObrasSocialesQuery(texto) : "";
  if (!consulta) return generica;

  const resultado = await checkObraSocial(consulta, signal);
  if (signal.aborted) return null;
  if (resultado === null) return { ...generica, menuOptions: undefined };

  const verConvenios = [{ label: "Ver Convenios", href: "/convenios" }];
  return resultado.found && resultado.name
    ? { text: `Sí, ${resultado.name} tiene convenio vigente con el Colegio Médico de Corrientes.`, links: verConvenios }
    : {
        text: `No encontré "${consulta.slice(0, 50)}" entre las obras sociales con convenio. Verifique el nombre o consulte el listado completo.`,
        links: verConvenios,
      };
}

/** La conversación: mensajes, estado de «escribiendo» y el envío. */
export function useChatbot() {
  const [mensajes, setMensajes] = useState<ChatMsg[]>(() => [{ id: nuevoId(), role: "bot", text: GREETING }]);
  const [escribiendo, setEscribiendo] = useState(false);
  const [chipsVisibles, setChipsVisibles] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const enviosRef = useRef<number[]>([]);

  // Si se desmonta con una consulta en curso, se cancela.
  useEffect(() => () => abortRef.current?.abort(), []);

  const responder = useCallback((msg: MensajeBot) => {
    setEscribiendo(false);
    setMensajes((prev) => [...prev, { ...msg, id: nuevoId(), role: "bot" }]);
    setChipsVisibles(true);
  }, []);

  const enviar = useCallback(
    async (crudo: string) => {
      const texto = sanitizeInput(crudo);
      if (!texto) return;

      const ahora = Date.now();
      enviosRef.current = enviosRef.current.filter((t) => ahora - t < VENTANA_MS);
      if (enviosRef.current.length >= LIMITE_MENSAJES) {
        responder({
          text: "Ha enviado demasiados mensajes en poco tiempo. Por favor espere un momento antes de continuar.",
        });
        return;
      }
      enviosRef.current.push(ahora);

      abortRef.current?.abort();
      const control = new AbortController();
      abortRef.current = control;

      setChipsVisibles(false);
      setMensajes((prev) => [...prev, { id: nuevoId(), role: "user", text: texto }]);
      setEscribiendo(true);

      // Una pausa corta para que la respuesta no aparezca de golpe.
      await new Promise<void>((listo) => {
        const t = setTimeout(listo, DEMORA_ESCRIBIENDO_MS);
        control.signal.addEventListener("abort", () => { clearTimeout(t); listo(); }, { once: true });
      });
      if (control.signal.aborted) return;

      const respuesta = await resolver(texto, control.signal);
      if (respuesta) responder(respuesta);
    },
    [responder]
  );

  const elegirChip = useCallback(
    (clave: string) => {
      const chip = QUICK_CHIPS.find((c) => c.key === clave);
      if (chip) void enviar(chip.label);
    },
    [enviar]
  );

  return { mensajes, escribiendo, chipsVisibles, enviar, elegirChip, chips: QUICK_CHIPS };
}

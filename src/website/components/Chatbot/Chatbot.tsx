import { createPortal } from "react-dom";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "../../assets/images/logoCMC.png";
import { AnimatePresence, motion } from "framer-motion";
import { FiX, FiSend } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

import {
  GREETING,
  FALLBACK_MESSAGE,
  QUICK_CHIPS,
  WHATSAPP_NUMBERS,
  type ChatLink,
  type WhatsAppDept,
  type MenuOption,
} from "./chatbot.config";
import {
  sanitizeInput,
  matchIntent,
  buildWhatsAppUrl,
  extractObrasSocialesQuery,
} from "./chatbot.engine";
import { checkObraSocial } from "./chatbot.service";
import styles from "./Chatbot.module.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

type MsgRole = "bot" | "user";

interface ChatMsg {
  id: string;
  role: MsgRole;
  text: string;
  links?: ChatLink[];
  whatsapp?: WhatsAppDept;
  menuOptions?: MenuOption[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HIDDEN_PATHS = ["/admin", "/403", "/panel"];
const TYPING_DELAY_MS = 650;
const DIALOG_ID = "cmc-chat-dialog";

let _msgId = 0;
const nextId = () => `m${++_msgId}`;

const INITIAL_MESSAGES: ChatMsg[] = [
  { id: nextId(), role: "bot", text: GREETING },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Chatbot() {
  const { pathname } = useLocation();
  // Hooks must be called unconditionally — guard moved to render phase below
  const isHidden = HIDDEN_PATHS.some((p) => pathname.startsWith(p));

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>(INITIAL_MESSAGES);
  const [chipsVisible, setChipsVisible] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);


  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Escape closes chat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Listen for external "open chatbot" events (hero button)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("cmc:open-chatbot", handler);
    return () => window.removeEventListener("cmc:open-chatbot", handler);
  }, []);

  // Cancel pending lookups on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const closeChat = useCallback(() => setOpen(false), []);

  // ── Message flow ─────────────────────────────────────────────────────────────

  const pushBot = useCallback((msg: Omit<ChatMsg, "id" | "role">) => {
    setMessages((prev) => [...prev, { ...msg, id: nextId(), role: "bot" }]);
    setChipsVisible(true);
  }, []);

  const handleSend = useCallback(
    async (rawText: string) => {
      const clean = sanitizeInput(rawText);
      if (!clean) return;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const { signal } = ac;

      setChipsVisible(false);
      setMessages((prev) => [...prev, { id: nextId(), role: "user", text: clean }]);
      setInputValue("");
      setIsTyping(true);

      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, TYPING_DELAY_MS);
        signal.addEventListener("abort", () => { clearTimeout(t); resolve(); }, { once: true });
      });

      if (signal.aborted) return;

      const intent = matchIntent(clean);

      if (!intent) {
        setIsTyping(false);
        pushBot({
          text: FALLBACK_MESSAGE,
          links: [{ label: "Contacto", href: "/contacto" }],
          whatsapp: "auditoria",
        });
        return;
      }

      // ── Async: check if a specific obra social has convenio ────────────────
      if (intent.asyncAction === "check_obra_social") {
        const osQuery = extractObrasSocialesQuery(clean);

        if (osQuery) {
          const result = await checkObraSocial(osQuery, signal);
          if (signal.aborted) return;
          setIsTyping(false);

          if (result === null) {
            pushBot({ text: intent.answer, links: intent.links, whatsapp: intent.whatsapp });
          } else if (result.found && result.name) {
            pushBot({
              text: `Sí, ${result.name} tiene convenio vigente con el Colegio Médico de Corrientes.`,
              links: [{ label: "Ver Convenios", href: "/convenios" }],
            });
          } else {
            pushBot({
              text: `No encontré "${osQuery.slice(0, 50)}" entre las obras sociales con convenio. Verifique el nombre o consulte el listado completo.`,
              links: [{ label: "Ver Convenios", href: "/convenios" }],
            });
          }
          return;
        }

        setIsTyping(false);
        pushBot({ text: intent.answer, links: intent.links, whatsapp: intent.whatsapp });
        return;
      }

      // ── Synchronous intent ────────────────────────────────────────────────
      setIsTyping(false);
      pushBot({
        text: intent.answer,
        links: intent.links,
        whatsapp: intent.whatsapp,
        menuOptions: intent.menuOptions,
      });
    },
    [pushBot]
  );

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); handleSend(inputValue); };
  const onChip = (key: string) => {
    const chip = QUICK_CHIPS.find((c) => c.key === key);
    if (chip) handleSend(chip.label);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const windowContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-hidden="true"
        />
      )}

      {open && (
        <motion.div
          key="window"
          className={`${styles.window} ${styles.windowExpanded}`}
          role="dialog"
          aria-label="Asistente CMC"
          aria-modal={true}
          id={DIALOG_ID}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.96 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.avatar} aria-hidden="true">
                <img src={Logo} alt="Logo CMC" className={styles.avatarImg} />
              </div>
              <div>
                <p className={styles.botName}>Asistente CMC</p>
                <p className={styles.botStatus}>En línea</p>
              </div>
            </div>
            <button
              className={styles.closeBtn}
              onClick={closeChat}
              aria-label="Cerrar chat"
              type="button"
            >
              <FiX aria-hidden="true" />
            </button>
          </div>

          {/* Messages */}
          <div
            className={styles.messages}
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Conversación"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.bubble} ${msg.role === "user" ? styles.bubbleUser : styles.bubbleBot}`}
              >
                <p className={styles.bubbleText}>{msg.text}</p>

                {(msg.links?.length || msg.whatsapp) && (
                  <div className={styles.linkRow}>
                    {msg.links?.map((l) =>
                      l.external ? (
                        <a
                          key={l.href}
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.linkBtn}
                        >
                          {l.label} ↗
                        </a>
                      ) : (
                        <Link
                          key={l.href}
                          to={l.href}
                          className={styles.linkBtn}
                          onClick={closeChat}
                        >
                          {l.label}
                        </Link>
                      )
                    )}

                    {msg.whatsapp && (
                      <a
                        href={buildWhatsAppUrl(msg.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.linkBtn} ${styles.linkWa}`}
                        aria-label={`Abrir WhatsApp ${WHATSAPP_NUMBERS[msg.whatsapp].label}`}
                      >
                        <FaWhatsapp aria-hidden="true" />
                        WhatsApp {WHATSAPP_NUMBERS[msg.whatsapp].label}
                      </a>
                    )}
                  </div>
                )}

                {msg.menuOptions && msg.menuOptions.length > 0 && (
                  <div className={styles.menuOptions} role="group" aria-label="Opciones de consulta">
                    {msg.menuOptions.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        className={styles.menuOptionBtn}
                        onClick={() => handleSend(opt.query)}
                        disabled={isTyping}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div
                className={`${styles.bubble} ${styles.bubbleBot} ${styles.typingBubble}`}
                aria-label="El asistente está escribiendo"
              >
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick-reply chips */}
          {chipsVisible && (
            <div className={styles.chips} role="group" aria-label="Temas frecuentes">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip.key}
                  className={styles.chip}
                  onClick={() => onChip(chip.key)}
                  type="button"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <form className={styles.inputBar} onSubmit={onSubmit} noValidate>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escriba su pregunta…"
              maxLength={200}
              aria-label="Escriba su pregunta"
              className={styles.input}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={!inputValue.trim() || isTyping}
              aria-label="Enviar mensaje"
            >
              <FiSend aria-hidden="true" />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (isHidden) return null;
  return createPortal(windowContent, document.body);
}

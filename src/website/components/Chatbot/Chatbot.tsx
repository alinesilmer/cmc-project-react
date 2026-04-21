import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "../../assets/images/logoCMC.png";
import { AnimatePresence, motion } from "framer-motion";
import { FiX, FiSend, FiMessageSquare } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

import {
  GREETING,
  FALLBACK_MESSAGE,
  QUICK_CHIPS,
  WHATSAPP_NUMBERS,
  type ChatLink,
  type WhatsAppDept,
} from "./chatbot.config";
import { sanitizeInput, matchIntent, buildWhatsAppUrl } from "./chatbot.engine";
import styles from "./Chatbot.module.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

type MsgRole = "bot" | "user";

interface ChatMsg {
  id: string;
  role: MsgRole;
  text: string;
  links?: ChatLink[];
  whatsapp?: WhatsAppDept;
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

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem("cmcChatOpen") === "true";
    } catch {
      return false;
    }
  });

  const [messages, setMessages] = useState<ChatMsg[]>(INITIAL_MESSAGES);
  const [chipsVisible, setChipsVisible] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem("cmcChatOpen", String(open));
    } catch {
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ── Message flow ─────────────────────────────────────────────────────────────

  const pushBot = useCallback(
    (msg: Omit<ChatMsg, "id" | "role">) => {
      setMessages((prev) => [...prev, { ...msg, id: nextId(), role: "bot" }]);
    },
    []
  );

  const handleSend = useCallback(
    (rawText: string) => {
      const clean = sanitizeInput(rawText);
      if (!clean) return;

      setChipsVisible(false);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", text: clean },
      ]);
      setInputValue("");
      setIsTyping(true);

      const timer = setTimeout(() => {
        setIsTyping(false);
        const intent = matchIntent(clean);
        if (intent) {
          pushBot({
            text: intent.answer,
            links: intent.links,
            whatsapp: intent.whatsapp,
          });
        } else {
          pushBot({
            text: FALLBACK_MESSAGE,
            links: [{ label: "Contacto", href: "/contacto" }],
            whatsapp: "auditoria",
          });
        }
      }, TYPING_DELAY_MS);

      return () => clearTimeout(timer);
    },
    [pushBot]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  const onChip = (key: string) => {
    const chip = QUICK_CHIPS.find((c) => c.key === key);
    if (chip) handleSend(chip.label);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>
      {/* ── Chat window ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.window}
            role="dialog"
            aria-label="Asistente CMC"
            aria-modal="false"
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
                onClick={() => setOpen(false)}
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
                  className={`${styles.bubble} ${
                    msg.role === "user" ? styles.bubbleUser : styles.bubbleBot
                  }`}
                >
                  {/* Plain text only — no dangerouslySetInnerHTML */}
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
                            onClick={() => setOpen(false)}
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
                </div>
              ))}

              {/* Typing indicator */}
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
              <div
                className={styles.chips}
                role="group"
                aria-label="Temas frecuentes"
              >
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
                placeholder="Escribí tu pregunta…"
                maxLength={200}
                aria-label="Escribí tu pregunta"
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

      {/* ── FAB toggle button ── */}
      <motion.button
        className={styles.fab}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar chat" : "Abrir chat de ayuda"}
        aria-expanded={open}
        aria-controls={DIALOG_ID}
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              className={styles.fabIcon}
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 45, opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <FiX aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              className={styles.fabIcon}
              initial={{ rotate: 45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -45, opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <FiMessageSquare aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

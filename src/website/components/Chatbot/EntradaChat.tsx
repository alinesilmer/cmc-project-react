import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { MAX_MENSAJE } from "./chatbot.engine";
import styles from "./EntradaChat.module.scss";

type Chip = { key: string; label: string };

type Props = {
  chips: Chip[];
  mostrarChips: boolean;
  onChip: (clave: string) => void;
  onEnviar: (texto: string) => void;
  /** Mientras el asistente responde no se puede mandar otro mensaje. */
  ocupado: boolean;
};

/** Los temas frecuentes y la caja para escribir. */
export default function EntradaChat({ chips, mostrarChips, onChip, onEnviar, ocupado }: Props) {
  const [texto, setTexto] = useState("");
  const input = useRef<HTMLInputElement>(null);

  // Se monta al abrir el chat: el foco va directo a la caja de texto, después
  // de que termina la animación de entrada.
  useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onEnviar(texto);
    setTexto("");
  };

  return (
    <>
      {mostrarChips && (
        <div className={styles.chips} role="group" aria-label="Temas frecuentes">
          {chips.map((chip) => (
            <button key={chip.key} className={styles.chip} onClick={() => onChip(chip.key)} type="button">
              {chip.label}
            </button>
          ))}
        </div>
      )}

      <form className={styles.inputBar} onSubmit={enviar} noValidate>
        <input
          ref={input}
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escriba su pregunta…"
          maxLength={MAX_MENSAJE}
          aria-label="Escriba su pregunta"
          className={styles.input}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button type="submit" className={styles.sendBtn} disabled={!texto.trim() || ocupado} aria-label="Enviar mensaje">
          <Send aria-hidden="true" />
        </button>
      </form>
    </>
  );
}

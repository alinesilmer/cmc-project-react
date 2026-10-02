import { useRef, useState } from "react";
import Button from "../../../components/UI/Button/Button";
import ContenidoMarkdown from "../../../components/Contenido/ContenidoMarkdown/ContenidoMarkdown";
import styles from "./EditorMarkdown.module.scss";

type Props = {
  id: string;
  valor: string;
  onCambio: (valor: string) => void;
};

/** Botones de formato: envuelven la selección (o «texto» si no hay) con la marca. */
const FORMATOS: { etiqueta: string; antes: string; despues?: string }[] = [
  { etiqueta: "Negrita", antes: "**" },
  { etiqueta: "Cursiva", antes: "*" },
  { etiqueta: "H2", antes: "## ", despues: "" },
  { etiqueta: "H3", antes: "### ", despues: "" },
  { etiqueta: "Lista", antes: "- ", despues: "" },
  { etiqueta: "Cita", antes: "> ", despues: "" },
];

const PLACEHOLDER = `Usá Markdown:
## Subtítulo
Párrafo 1.

Párrafo 2 (línea en blanco entre párrafos).
- Item 1
- Item 2
**negrita**, *cursiva*, [link](https://...)`;

/**
 * Editor del cuerpo de una publicación, con barra de formato y vista previa.
 * La vista previa usa el mismo componente que la página pública, así el
 * editor ve exactamente lo que se va a publicar.
 */
export default function EditorMarkdown({ id, valor, onCambio }: Props) {
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  const envolver = (antes: string, despues = antes) => {
    const ta = area.current;
    if (!ta) return;
    const { selectionStart: ini, selectionEnd: fin } = ta;
    const elegido = valor.slice(ini, fin) || "texto";
    onCambio(`${valor.slice(0, ini)}${antes}${elegido}${despues}${valor.slice(fin)}`);
    // Después del render, deja seleccionado el texto formateado.
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(ini + antes.length, ini + antes.length + elegido.length);
    });
  };

  const agregarEnlace = () => onCambio(`${valor}${valor ? "\n" : ""}[texto](https://ejemplo.com)`);

  return (
    <div className={styles.editor}>
      <div className={styles.cabecera}>
        <label htmlFor={id}>Contenido (Markdown)</label>
        <Button variant="outline" size="small" onClick={() => setVistaPrevia((v) => !v)}>
          {vistaPrevia ? "Ocultar vista previa" : "Vista previa"}
        </Button>
      </div>

      <div className={styles.toolbar} role="toolbar" aria-label="Formato">
        {FORMATOS.map((f) => (
          <button key={f.etiqueta} type="button" onClick={() => envolver(f.antes, f.despues)}>
            {f.etiqueta}
          </button>
        ))}
        <button type="button" onClick={agregarEnlace}>
          Enlace
        </button>
      </div>

      <textarea
        id={id}
        ref={area}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        rows={14}
        placeholder={PLACEHOLDER}
        className={styles.textarea}
        required
      />

      {vistaPrevia && <ContenidoMarkdown contenido={valor} className={styles.preview} />}
    </div>
  );
}

import { useRef, useState } from "react";

import s from "./EditorMarkdown.module.scss";
import Button from "@/app/components/ui/Button/Button";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import ContenidoMarkdown from "@/website/components/Contenido/ContenidoMarkdown/ContenidoMarkdown";

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

/** Editor del cuerpo de una publicación, con barra de formato y vista previa. */
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
    <div className={`${c.campo} ${c.campoAncho}`}>
      <div className={s.cabecera}>
        <label className={c.rotulo} htmlFor={id}>Contenido (Markdown)</label>
        <Button variant="ghost" size="sm" onClick={() => setVistaPrevia((v) => !v)}>
          {vistaPrevia ? "Ocultar vista previa" : "Vista previa"}
        </Button>
      </div>

      <div className={s.barra} role="toolbar" aria-label="Formato">
        {FORMATOS.map((f) => (
          <Button key={f.etiqueta} variant="ghost" size="sm" onClick={() => envolver(f.antes, f.despues)}>
            {f.etiqueta}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={agregarEnlace}>
          Enlace
        </Button>
      </div>

      <textarea
        id={id}
        ref={area}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        rows={14}
        placeholder={PLACEHOLDER}
        className={`${c.entrada} ${s.texto}`}
        required
      />

      {vistaPrevia && <ContenidoMarkdown contenido={valor} className={s.vista} />}
    </div>
  );
}

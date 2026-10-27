import { useState, type KeyboardEvent } from "react";

import Button from "@/app/components/ui/Button/Button";
import type { Plantilla } from "../useObservaciones";
import s from "./EditorObservacion.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

const MAX = 1000;

/** Suma la plantilla como un renglón nuevo al final. */
const sumar = (texto: string, plantilla: string) =>
  texto.trim() ? `${texto.replace(/\s+$/, "")}\n${plantilla}` : plantilla;

/** Saca la plantilla del texto sin dejar renglones vacíos. */
const quitar = (texto: string, plantilla: string) =>
  texto
    .replace(plantilla, "")
    .replace(/\n{2,}/g, "\n")
    .replace(/^\n+|\n+$/g, "");

interface Props {
  nombre: string;
  inicial: string;
  plantillas: Plantilla[];
  guardando: boolean;
  onGuardar: (texto: string) => void;
  onCancelar: () => void;
}

/** Edición de la observación de una obra social: texto libre y plantillas que se suman con un toque. */
export default function EditorObservacion({ nombre, inicial, plantillas, guardando, onGuardar, onCancelar }: Props) {
  const [texto, setTexto] = useState(inicial);

  const cambio = texto.trim() !== inicial.trim();
  const quita = texto.trim() === "" && inicial.trim() !== "";

  const alternar = (plantilla: string) =>
    setTexto((previo) => (previo.includes(plantilla) ? quitar(previo, plantilla) : sumar(previo, plantilla)).slice(0, MAX));

  const guardar = () => {
    if (cambio && !guardando) onGuardar(texto);
  };

  const alTeclear = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") onCancelar();
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) guardar();
  };

  return (
    <div className={s.editor}>
      <p className={s.editorTitulo}>
        Observación de <b>{nombre}</b>
      </p>

      {plantillas.length > 0 && (
        <div className={s.editorPlantillas}>
          <span className={s.editorRotulo}>Plantillas · sumá las que quieras</span>
          <div className={s.chips}>
            {plantillas.map((p) => {
              const puesta = texto.includes(p.texto);
              return (
                <BotonPlano
                  key={p.id}
                  type="button"
                  className={`${s.chip} ${puesta ? s.chipPuesta : ""}`}
                  aria-pressed={puesta}
                  title={puesta ? "Quitar del texto" : "Sumar al texto"}
                  onClick={() => alternar(p.texto)}
                >
                  {p.texto}
                </BotonPlano>
              );
            })}
          </div>
        </div>
      )}

      <textarea
        className={s.editorCampo}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={alTeclear}
        maxLength={MAX}
        rows={5}
        placeholder="Escribí la observación. Un renglón por condición."
        autoFocus
      />

      <div className={s.editorPie}>
        <span className={s.contador}>
          {texto.length}/{MAX} · Ctrl+Enter guarda, Esc cancela
        </span>
        <div className={s.editorAcciones}>
          <Button size="md" variant="secondary" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </Button>
          <Button size="md" variant={quita ? "danger" : "primary"} onClick={guardar} disabled={!cambio || guardando}>
            {guardando ? "Guardando…" : quita ? "Quitar observación" : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

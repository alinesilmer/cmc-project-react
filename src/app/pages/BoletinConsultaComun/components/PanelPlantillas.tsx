import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";

import type { Plantilla } from "../useObservaciones";
import s from "../BoletinConsultaComun.module.scss";

interface Props {
  plantillas: Plantilla[];
  ocupado: boolean;
  onAgregar: (texto: string) => Promise<void>;
  onQuitar: (plantilla: Plantilla) => void;
}

/** Las frases de uso frecuente: se crean acá y se suman a cualquier observación desde su editor. */
export default function PanelPlantillas({ plantillas, ocupado, onAgregar, onQuitar }: Props) {
  const [nueva, setNueva] = useState("");

  const agregar = async () => {
    const texto = nueva.trim();
    if (!texto || ocupado) return;
    try {
      await onAgregar(texto);
      setNueva("");
    } catch {
      // El aviso ya lo dio quien agrega; el texto queda para reintentar.
    }
  };

  // Enter agrega; Shift+Enter baja de renglón para las plantillas de más de una línea.
  const alTeclear = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void agregar();
    }
  };

  return (
    <aside className={s.plantillas}>
      <h2 className={s.plantillasTitulo}>Plantillas</h2>

      <div className={s.plantillasAlta}>
        <textarea
          className={s.plantillasCampo}
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={alTeclear}
          maxLength={1000}
          rows={2}
          placeholder="Nueva plantilla…"
          disabled={ocupado}
        />
        <button type="button" className={s.plantillasAgregar} onClick={() => void agregar()} disabled={!nueva.trim() || ocupado}>
          <Plus size={16} aria-hidden="true" />
          Agregar
        </button>
      </div>

      {plantillas.length === 0 ? (
        <p className={s.vacioChico}>Todavía no hay plantillas.</p>
      ) : (
        <ul className={s.plantillasLista}>
          {plantillas.map((p) => (
            <li key={p.id} className={s.plantillaItem}>
              <span className={s.plantillaTexto}>{p.texto}</span>
              <button
                type="button"
                className={s.plantillaQuitar}
                onClick={() => onQuitar(p)}
                title="Eliminar plantilla"
                aria-label={`Eliminar plantilla: ${p.texto}`}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

import { X, Plus } from "lucide-react";
import type { ContactoEntry } from "../obrasSociales.types";
import s from "./ObrasSocialesForm.module.scss";

// ─── Sub-components ───────────────────────────────────────────────────────────

// ─── Contacto list (emails / teléfonos) ──────────────────────────────────────

export function ContactoList({
  entries,
  onChange,
  tipo,
  error,
}: {
  entries: ContactoEntry[];
  onChange: (entries: ContactoEntry[]) => void;
  tipo: "email" | "telefono";
  error?: string;
}) {
  const placeholderValor =
    tipo === "email" ? "Ej: auditoria@os.com.ar" : "Ej: +54 379 4123456";
  const placeholderEtiqueta =
    tipo === "email" ? "Ej: Auditoría" : "Ej: Pagos";
  const inputType = tipo === "email" ? "email" : "tel";

  const update = (i: number, field: keyof ContactoEntry, value: string) => {
    const next = entries.map((e, idx) =>
      idx === i ? { ...e, [field]: value } : e
    );
    onChange(next);
  };

  const remove = (i: number) => {
    onChange(entries.filter((_, idx) => idx !== i));
  };

  const add = () => {
    onChange([...entries, { valor: "", etiqueta: "" }]);
  };

  return (
    <div className={s.contactoList}>
      {entries.map((entry, i) => (
        <div key={i} className={s.contactoRow}>
          <input
            type="text"
            className={s.input}
            value={entry.etiqueta}
            onChange={(e) => update(i, "etiqueta", e.target.value)}
            placeholder={placeholderEtiqueta}
            maxLength={80}
            aria-label="Descripción"
          />
          <input
            type={inputType}
            className={s.input}
            value={entry.valor}
            onChange={(e) => update(i, "valor", e.target.value)}
            placeholder={placeholderValor}
            maxLength={tipo === "email" ? 200 : 50}
            aria-label={tipo === "email" ? "Email" : "Teléfono"}
          />
          {entries.length > 1 && (
            <button
              type="button"
              className={s.contactoRemoveBtn}
              onClick={() => remove(i)}
              aria-label="Eliminar"
              title="Eliminar"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}

      <button type="button" className={s.contactoAddBtn} onClick={add}>
        <Plus size={14} />
        {tipo === "email" ? "Agregar email" : "Agregar teléfono"}
      </button>

      {error && <span className={s.fieldError} role="alert">{error}</span>}
    </div>
  );
}

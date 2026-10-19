// Navegación por teclado del formulario de carga.

export type FocusField =
  | "medico"
  | "medicoEjecutor"
  | "obraSocial"
  | "paciente"
  | "fecha"
  | "codigo"
  | "guardar";

/** Enfoca el primer campo de la lista que exista y sea enfocable, en el orden dado. */
export function focusFirstField(
  container: HTMLElement | null,
  fields: FocusField[],
): boolean {
  if (!container) return false;

  for (const field of fields) {
    const host = container.querySelector<HTMLElement>(`[data-field="${field}"]`);
    if (!host) continue;

    const target =
      host.tagName === "BUTTON"
        ? (host as HTMLButtonElement)
        : host.querySelector<HTMLElement>("input, select, textarea");

    if (!target || !isFocusable(target)) continue;

    target.focus();
    return true;
  }

  if (import.meta.env.DEV) {
    console.warn(
      `[focusNav] ningún candidato enfocable (${fields.join(", ")}) — ¿cambió el markup?`,
    );
  }
  return false;
}

/** Visible, habilitado y alcanzable por Tab. */
function isFocusable(el: HTMLElement): boolean {
  if ((el as HTMLInputElement).disabled) return false;
  if (el.tabIndex < 0) return false;
  // Descarta lo que no está renderizado (display:none, secciones colapsadas).
  return el.getClientRects().length > 0;
}

/** Siguiente campo a enfocar desde `current`, en orden de DOM. */
export function nextFocusable(
  container: HTMLElement | null,
  current: HTMLElement,
): HTMLElement | null {
  if (!container) return null;

  const all = Array.from(
    container.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]), select, textarea',
    ),
  ).filter(isFocusable);

  // Un grupo de radios es una sola parada, igual que con Tab: nos quedamos con el marcado.
  const fields = all.filter((el) => {
    const input = el as HTMLInputElement;
    if (input.type !== "radio" || !input.name) return true;
    const group = all.filter(
      (o) => (o as HTMLInputElement).type === "radio" && (o as HTMLInputElement).name === input.name,
    );
    const checked = group.find((o) => (o as HTMLInputElement).checked);
    return el === (checked ?? group[0]);
  });

  const i = fields.indexOf(current);
  if (i >= 0 && i < fields.length - 1) return fields[i + 1];

  return container.querySelector<HTMLElement>('[data-field="guardar"]');
}

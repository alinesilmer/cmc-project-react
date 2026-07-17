// Navegación por teclado del formulario de carga.
//
// El foco se resuelve buscando en el DOM (`data-field`) y no con refs por campo: el
// recorrido de "Enter avanza" necesita el orden real de los campos, que cambia solo
// cuando aparece/desaparece la sección de ayudantes o se deshabilita un campo. Un
// único mecanismo para foco y recorrido.

export type FocusField =
  | "medico"
  | "obraSocial"
  | "paciente"
  | "fecha"
  | "codigo"
  | "guardar";

/** Enfoca el input de un campo marcado con `data-field`. Devuelve si lo logró. */
export function focusField(
  container: HTMLElement | null,
  field: FocusField,
): boolean {
  if (!container) return false;

  const host = container.querySelector<HTMLElement>(`[data-field="${field}"]`);
  if (!host) {
    if (import.meta.env.DEV) {
      console.warn(`[focusNav] no existe [data-field="${field}"] — ¿cambió el markup?`);
    }
    return false;
  }

  const target =
    host.tagName === "BUTTON"
      ? (host as HTMLButtonElement)
      : host.querySelector<HTMLElement>("input, select, textarea");

  if (!target || !isFocusable(target)) return false;

  target.focus();
  return true;
}

/** Visible, habilitado y alcanzable por Tab. */
function isFocusable(el: HTMLElement): boolean {
  if ((el as HTMLInputElement).disabled) return false;
  if (el.tabIndex < 0) return false;
  // Descarta lo que no está renderizado (display:none, secciones colapsadas).
  return el.getClientRects().length > 0;
}

/**
 * Siguiente campo a enfocar desde `current`, en orden de DOM.
 *
 * Sólo recorre campos de entrada — **nunca botones**. El pie tiene "Limpiar" antes que
 * "Guardar", y Paciente tiene "+ Agregar afiliado" pegado al campo: si los botones
 * entraran al recorrido, un Enter de más borraría el formulario o abriría un modal.
 * Cuando no queda campo siguiente devolvemos el botón Guardar, que es la salida
 * natural y deja el disparo final en manos del operador.
 */
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

  // Un grupo de radios es una sola parada, igual que con Tab: nos quedamos con el
  // marcado (o el primero) para no frenar dos veces en Automático/Manual.
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

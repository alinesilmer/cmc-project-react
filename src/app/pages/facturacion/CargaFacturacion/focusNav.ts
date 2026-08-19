// Navegación por teclado del formulario de carga.
//
// El foco se resuelve buscando en el DOM (`data-field`) y no con refs por campo: el
// recorrido de "Enter avanza" necesita el orden real de los campos, que cambia solo
// cuando aparece/desaparece la sección de ayudantes o se deshabilita un campo. Un
// único mecanismo para foco y recorrido.

export type FocusField =
  | "medico"
  | "medicoEjecutor"
  | "obraSocial"
  | "paciente"
  | "fecha"
  | "codigo"
  | "guardar";

/**
 * Enfoca el primer campo de la lista que exista y sea enfocable, en el orden dado.
 * Los campos se ubican por su `data-field`.
 *
 * La lista es de candidatos, no de campos garantizados: después de guardar, el primer
 * campo vacío depende de los checkboxes de "Mantener entre cargas" **y** de qué
 * secciones están montadas (en una complementaria la obra social va en el badge y no
 * hay input; el médico ejecutor sólo existe si el payee es una clínica). Pasar todos
 * los candidatos y caer al siguiente evita el caso peor: que el foco no quede en
 * ningún lado porque el campo elegido no estaba en pantalla.
 */
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

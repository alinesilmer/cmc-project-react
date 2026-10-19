// Lo que comparten las pantallas de esta carpeta: una sola copia de cada cosa.

export const dosDigitos = (n: number) => String(n).padStart(2, "0");

export const esFechaValida = (d: Date) => !Number.isNaN(d.getTime());

/** Las celdas de fecha de Excel llegan a medianoche UTC: se leen con los getters UTC. */
export const fechaCorta = (d: Date) =>
  `${dosDigitos(d.getUTCDate())}/${dosDigitos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;

export const fechaISO = (d: Date) =>
  `${d.getUTCFullYear()}-${dosDigitos(d.getUTCMonth() + 1)}-${dosDigitos(d.getUTCDate())}`;

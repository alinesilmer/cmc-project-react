import { seccionTabla } from "./base";

/** Las condiciones van en una sola celda por obra social, una por renglón. */
export const observaciones = seccionTabla({
  archivo: "observaciones",
  titulo: "Observaciones",
  cabecera: ["N°", "Obra social", "Condiciones"],
  filas: (items) =>
    items
      .filter((i) => i.observaciones.length > 0)
      .map((i) => [String(i.nro), i.nombre, i.observaciones.join("\n")]),
  columnas: {
    0: { cellWidth: 12, halign: "right" },
    1: { cellWidth: 42 },
  },
});

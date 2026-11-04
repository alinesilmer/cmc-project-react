import { formatoPesos } from "@/app/shared/lib/formatos";
import { seccionTabla } from "./base";

export const consulta = seccionTabla({
  archivo: "consulta",
  titulo: "Valor de consulta",
  cabecera: ["N°", "Obra social", "Consulta"],
  filas: (items) =>
    items
      .filter((i) => i.consulta !== null)
      .map((i) => [String(i.nro), i.nombre, formatoPesos.format(i.consulta as number)]),
  columnas: {
    0: { cellWidth: 16, halign: "right" },
    2: { cellWidth: 32, halign: "right" },
  },
});

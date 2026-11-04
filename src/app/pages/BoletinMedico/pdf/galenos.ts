import { agruparPorCodigo, etiquetaGaleno } from "@/app/features/nomenclador/galenos";
import { formatoPesos } from "@/app/shared/lib/formatos";
import { GRIS, seccionTabla } from "./base";

/** Una fila por galeno, con la obra social repetida: en papel se lee de corrido y se busca por nombre de galeno. */
export const galenos = seccionTabla({
  archivo: "galenos",
  titulo: "Valores de galeno",
  cabecera: ["N°", "Obra social", "Galeno", "Valor", "Niveles"],
  filas: (items) =>
    items.flatMap((i) =>
      agruparPorCodigo(i.galenos).map((g) => [
        String(i.nro),
        i.nombre,
        g.nombre,
        g.minimo === g.maximo
          ? formatoPesos.format(g.minimo)
          : `${formatoPesos.format(g.minimo)} – ${formatoPesos.format(g.maximo)}`,
        g.niveles.length > 1 ? g.niveles.map(etiquetaGaleno).join(", ") : "",
      ])
    ),
  columnas: {
    0: { cellWidth: 12, halign: "right" },
    1: { cellWidth: 42 },
    3: { cellWidth: 34, halign: "right" },
    4: { cellWidth: 44, textColor: GRIS, fontSize: 7.5 },
  },
});

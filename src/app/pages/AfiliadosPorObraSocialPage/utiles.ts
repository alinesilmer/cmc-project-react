// Lo que comparten las pantallas de esta carpeta: una sola copia de cada cosa.
import type { ExportRow } from "@/app/pages/AfiliadosPorObraSocialPage/types";
import type { ExportField } from "@/app/pages/AfiliadosPorObraSocialPage/types";
import { safeStr } from "@/app/pages/AfiliadosPorObraSocialPage/helpers";

export function pickCellValue(row: ExportRow, campo: ExportField): string {
  return safeStr(campo.get(row)).trim() || "—";
}

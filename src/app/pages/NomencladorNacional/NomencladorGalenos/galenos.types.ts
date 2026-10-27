// ─── Types ────────────────────────────────────────────────────────────────────

export type ModalKind = "create" | "edit" | "import" | "historial" | null;

export type EditForm = {
  observacion: string;
  vigencia_unidades: string;
  hon: string;
  ayu: string;
  gas: string;
  valor: string;
  vigencia_precio: string;
};

export type ImportForm = {
  osOrigen: number | "";
  vigencia_desde: string;
  alcance: "todos" | "nivelados" | "sin_nivel";
  convertir: boolean;
  // "valor_y_unidades" copia todo; "solo_valor" mantiene las unidades del destino.
  actualizar: "valor_y_unidades" | "solo_valor";
};

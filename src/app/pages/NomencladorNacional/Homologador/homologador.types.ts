export interface HomologadorOut {
  id: number;
  obra_social_nro: number;
  codigo_origen: string;
  nomenclador_id: number;
  descripcion_origen: string | null;
  observacion: string | null;
  activo: boolean;
  created_at: string;
}

export interface HomologadorCreatePayload {
  obra_social_nro: number;
  codigo_origen: string;
  nomenclador_id: number;
  descripcion_origen?: string | null;
  observacion?: string | null;
}

export interface HomologadorUpdatePayload {
  nomenclador_id?: number;
  descripcion_origen?: string | null;
  observacion?: string | null;
  activo?: boolean;
}

export type MediaType = "image" | "video";

export interface MedicoPromo {
  id: string;
  nombre: string;
  especialidad: string;
  bio?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  orden: number;
  activo: boolean;
  createdAt: string;
}

export type MedicoPromoCreate = Omit<MedicoPromo, "id" | "createdAt">;

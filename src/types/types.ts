export type ApplicationStatus = "nueva" | "pendiente" | "aprobada" | "rechazada"

export interface Application {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: ApplicationStatus; // "nueva" | "pendiente" | "aprobada" | "rechazada"
  submittedDate: string;     // YYYY-MM-DD
  memberType?: string;
  joinDate?: string;
  observations?: string;
}

export interface User {
  id: string
  name: string
  email: string
  phone: string
  memberType: string
  joinDate: string
  status: "activo" | "inactivo"
}


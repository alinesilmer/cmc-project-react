// src/app/auth/api.ts
import { http, httpBare } from "../lib/http";
import { setAccessToken } from "../auth/token";

export type User = {
  id: number;
  nro_socio?: number | null;
  nombre: string;
  scopes: string[];
  role?: string | null; // ⬅️ NUEVO
};

function normalizeUser(raw: any): User {
  return {
    id: raw?.id,
    nro_socio: raw?.nro_socio ?? null,
    nombre: raw?.nombre ?? "",
    scopes: Array.isArray(raw?.scopes)
      ? raw.scopes
      : raw?.scopes
      ? [raw.scopes]
      : [],
    role: raw?.role ?? null, // ⬅️ AQUÍ entra el role del backend
  };
}

// export async function login(nro_socio: number, password: string) {
//   const { data } = await http.post("/auth/login", { nro_socio, password });
//   setAccessToken(data.access_token);
//   // 🔧 asegura que TODAS las próximas requests lleven el token
//   http.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
//   return data.user as User;
// }

// export async function logout(): Promise<void> {
//   await http.post("/auth/logout");
//   setAccessToken(null);
//   delete http.defaults.headers.common["Authorization"];
// }

export async function login(
  nro_socio: number,
  password: string
): Promise<User> {
  const { data } = await httpBare.post("/auth/login", { nro_socio, password });
  setAccessToken(data.access_token);
  http.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
  return normalizeUser(data.user); // ⬅️ ACÁ va tu "const me = { ... }"
}

export async function me(): Promise<User> {
  const { data } = await http.get("/auth/me");
  return normalizeUser(data.user);
}

export async function logout(): Promise<void> {
  await http.post("/auth/logout");
  setAccessToken(null);
  delete http.defaults.headers.common["Authorization"];
}

// src/app/auth/api.ts
import { http } from "../lib/http";
import { setAccessToken } from "../auth/token";

export type User = { nro_socio: number; nombre: string; scopes: string[] };

export async function login(nro_socio: number, password: string) {
  const { data } = await http.post("/auth/login", { nro_socio, password });
  setAccessToken(data.access_token);
  // 🔧 asegura que TODAS las próximas requests lleven el token
  http.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
  return data.user as User;
}


export async function logout(): Promise<void> {
  await http.post("/auth/logout");
  setAccessToken(null);
  delete http.defaults.headers.common["Authorization"];
}

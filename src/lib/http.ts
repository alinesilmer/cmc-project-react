import axios from "axios";
import { getAccessToken, setAccessToken, getCookie } from "../auth/token";
import { API_URL } from "../config/env";

// Instancia base
export const http = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  withCredentials: true,  // 👈 necesario para enviar cookies
});

export const httpBare = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
});

const isFormDataLike = (d: any) => {
  if (!d) return false;
  // detecta instancias nativas y objetos con append()
  return (typeof FormData !== "undefined" && d instanceof FormData)
      || (typeof d.append === "function" && Object.prototype.toString.call(d) === "[object FormData]");
};

http.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  config.headers["Accept"] = "application/json";

  const body = config.data as any;
  const isFD = isFormDataLike(body);

  // ❗ NO pongas application/json si es FormData
  if (!isFD && !config.headers["Content-Type"] && config.method && config.method !== "get") {
    config.headers["Content-Type"] = "application/json";
  }

  const token = getAccessToken();
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// Response: si 401 → intentar refresh y reintentar
let refreshing = false;
let queue: Array<() => void> = [];

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};

    // ⛔ nada de refrescar si:
    if (
      error.response?.status !== 401 ||
      original.__retried ||
      original.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    if (refreshing) {
      await new Promise<void>((ok) => queue.push(ok));
      original.headers = original.headers || {};
      const t = getAccessToken();
      if (t) original.headers["Authorization"] = `Bearer ${t}`;
      original.__retried = true;
      return http.request(original);
    }

    refreshing = true;
    try {
      const csrf = getCookie("csrf_token"); // en local funciona (same-site)
      const { data } = await httpBare.post("/auth/refresh", null, {
        headers: csrf ? { "X-CSRF-Token": csrf } : {},
      });
      setAccessToken(data.access_token);
      http.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
      queue.forEach((ok) => ok()); queue = [];

      original.headers = original.headers || {};
      original.headers["Authorization"] = `Bearer ${data.access_token}`;
      original.__retried = true;
      return http.request(original);
    } catch (e) {
      setAccessToken(null);
      delete http.defaults.headers.common["Authorization"];
      queue.forEach((ok) => ok()); queue = [];
      return Promise.reject(e);
    } finally {
      refreshing = false;
    }
  }
);


// Helpers JSON
export const getJSON = async <T>(url: string, params?: Record<string, any>) => {
  const { data } = await http.get(url, { params });
  return data as T;
};
export const postJSON = async <T>(url: string, body?: any) => {
  const { data } = await http.post(url, body ?? {});
  return data as T;
};

// 👇 helper para multipart
export const postForm = async <T = unknown>(url: string, form: FormData): Promise<T> => {
  const { data } = await http.post(url, form); // sin headers
  return data as T;
};


export const putJSON = async <T = unknown>(url: string, body?: any): Promise<T> => {
  const { data } = await http.put(url, body ?? {});
  return data as T;
};
export const delJSON = async <T = unknown>(url: string): Promise<T> => {
  const { data } = await http.delete(url);
  return data as T;
};

import axios from "axios";
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { getAccessToken } from "../auth/token";
import { API_URL } from "../config/env";
import { refreshSession, forceLogout } from "../auth/session";

type RetriableConfig = InternalAxiosRequestConfig & {
  __retried?: boolean;
  __token?: string | null;
};

// Instancia base
export const http = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  withCredentials: true, // 👈 necesario para enviar cookies
});

export const httpBare = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
});

const isFormDataLike = (d: any) => {
  if (!d) return false;
  // detecta instancias nativas y objetos con append()
  return (
    (typeof FormData !== "undefined" && d instanceof FormData) ||
    (typeof d.append === "function" &&
      Object.prototype.toString.call(d) === "[object FormData]")
  );
};

http.interceptors.request.use((config: RetriableConfig) => {
  config.headers = config.headers ?? ({} as any);
  config.headers["Accept"] = "application/json";

  const body = config.data as any;
  const isFD = isFormDataLike(body);

  // ❗ NO pongas application/json si es FormData
  if (
    !isFD &&
    !config.headers["Content-Type"] &&
    config.method &&
    config.method !== "get"
  ) {
    config.headers["Content-Type"] = "application/json";
  }

  const token = getAccessToken();
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  // Recordamos con qué token salió esta request: si al recibir un 401
  // el token vigente ya cambió, significa que otra request en vuelo ya
  // refrescó — reintentamos directo en vez de disparar un segundo refresh.
  config.__token = token;

  const method = (config.method ?? "").toUpperCase();
  if (import.meta.env.DEV) {
    console.log(`%cRequest a: ${config.url}`, "color: #22c55e; font-weight: bold;", {
      method,
      params: config.params,
      data: config.data,
    });
  }

  return config;
});

// Response: si 401 → refrescar (serializado en session.ts) y reintentar
http.interceptors.response.use(
  (res) => {
    if (import.meta.env.DEV) {
      const method = (res.config.method ?? "").toUpperCase();
      const url = res.config.url ?? "";
      console.log(`%c[API] ${method} ${url}`, "color: #06b6d4; font-weight: bold;", res.data);
    }
    return res;
  },
  async (error) => {
    const original = (error.config || {}) as RetriableConfig;

    // ⛔ nada de refrescar si:
    if (
      error.response?.status !== 401 ||
      original.__retried ||
      original.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    original.__retried = true;

    // Otra request ya renovó el token mientras esta viajaba: no hace falta
    // un segundo refresh, alcanza con reintentar con el token vigente.
    const currentToken = getAccessToken();
    if (currentToken && currentToken !== original.__token) {
      original.headers = original.headers || {};
      original.headers["Authorization"] = `Bearer ${currentToken}`;
      return http.request(original);
    }

    try {
      const newToken = await refreshSession();
      http.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      original.headers = original.headers || {};
      original.headers["Authorization"] = `Bearer ${newToken}`;
      return http.request(original);
    } catch (e) {
      forceLogout("sesion_expirada");
      return Promise.reject(e);
    }
  }
);

// Helpers JSON
export const getJSON = async <T>(url: string, params?: Record<string, any>) => {
  const { data } = await http.get(url, { params });
  return data as T;
};

export async function getJSONLong<T>(
  url: string,
  timeoutMs = 180_000, // 3 minutos por defecto
  config?: AxiosRequestConfig
): Promise<T> {
  const r = await http.get<T>(url, { timeout: timeoutMs, ...config });
  return r.data;
}

// `config` sirve sobre todo para subir el `timeout` de una llamada puntual.
// El default de 15 s alcanza para la API sola, pero se queda corto cuando el
// backend a su vez tiene que esperar a un tercero (ver TIMEOUT_OS_EN_LINEA en
// pages/Validaciones/validaciones.api.ts).
export const postJSON = async <T>(
  url: string,
  body?: any,
  config?: AxiosRequestConfig
) => {
  const { data } = await http.post(url, body ?? {}, config);
  return data as T;
};

// 👇 helper para multipart
export const postForm = async <T = unknown>(
  url: string,
  form: FormData,
  config?: AxiosRequestConfig
): Promise<T> => {
  const { data } = await http.post(url, form, config); // sin headers
  return data as T;
};

export const putJSON = async <T = unknown>(
  url: string,
  body?: any
): Promise<T> => {
  const { data } = await http.put(url, body ?? {});
  return data as T;
};

export const patchJSON = async <T = unknown>(
  url: string,
  body?: any
): Promise<T> => {
  const { data } = await http.patch(url, body ?? {});
  return data as T;
};

export const delJSON = async <T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  const { data } = await http.delete(url, config);
  return data as T;
};

export const delJSONBody = async <T = unknown>(url: string, body?: any): Promise<T> => {
  const { data } = await http.delete(url, { data: body ?? {} });
  return data as T;
};

export const getJSONWithHeaders = async <T>(
  url: string,
  params?: Record<string, any>
): Promise<{ data: T; totalCount: number | undefined }> => {
  const res = await http.get<T>(url, { params });
  const raw = Number(res.headers["x-total-count"] ?? NaN);
  return { data: res.data, totalCount: Number.isNaN(raw) ? undefined : raw };
};

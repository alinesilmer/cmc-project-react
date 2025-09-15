import axios from "axios";
import { API_URL } from "../config/env";


// Instancia base
export const http = axios.create({
  baseURL: API_URL || "/api", // en dev podés usar proxy de Vite y dejar "/api"
  timeout: 15000,
});

// Headers básicos
http.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  config.headers["Accept"] = "application/json";
  if (!config.headers["Content-Type"] && config.method && config.method !== "get") {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

// Helpers “JSON-first”
export const getJSON = async <T = unknown>(url: string, params?: Record<string, any>): Promise<T> => {
  const { data } = await http.get(url, { params });
  return data as T;
};

export const postJSON = async <T = unknown>(url: string, body?: any): Promise<T> => {
  const { data } = await http.post(url, body ?? {});
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

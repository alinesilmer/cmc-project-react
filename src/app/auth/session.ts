// src/app/auth/session.ts
// Único lugar que refresca el access token y que cierra sesión a la fuerza.
// Serializa el refresh entre requests concurrentes de la misma pestaña
// (single-flight) y entre pestañas (lock en localStorage + BroadcastChannel),
// porque un /auth/refresh duplicado con el mismo token es leído por el
// servidor como reuso y cierra todas las sesiones del socio (§7.4).
import { http, httpBare } from "../lib/http";
import { getCookie, setAccessToken } from "./token";

export type LogoutMotivo = "token_revocado" | "password_changed" | "sesion_expirada";

const LOCK_KEY = "auth:refresh_lock";
const LOCK_TTL_MS = 10_000;
const LOCK_WAIT_MS = 10_000;
const CHANNEL_NAME = "cmc-auth";
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

type ChannelMsg =
  | { type: "refreshed"; token: string }
  | { type: "refresh_failed" }
  | { type: "logout"; motivo: LogoutMotivo };

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

function postMessage(msg: ChannelMsg) {
  if (channel) {
    channel.postMessage(msg);
    return;
  }
  // Fallback sin BroadcastChannel: notificar por localStorage y borrar
  // enseguida. No dejamos el token persistido, sólo disparamos el evento
  // "storage" en las otras pestañas.
  const key = "auth:broadcast_fallback";
  localStorage.setItem(key, JSON.stringify({ ...msg, ts: Date.now() }));
  localStorage.removeItem(key);
}

function tryAcquireLock(): boolean {
  const raw = localStorage.getItem(LOCK_KEY);
  if (raw) {
    try {
      const lock = JSON.parse(raw) as { id: string; ts: number };
      if (Date.now() - lock.ts < LOCK_TTL_MS && lock.id !== TAB_ID) {
        return false;
      }
    } catch {
      // lock corrupto, lo pisamos
    }
  }
  localStorage.setItem(LOCK_KEY, JSON.stringify({ id: TAB_ID, ts: Date.now() }));
  return true;
}

function releaseLock() {
  const raw = localStorage.getItem(LOCK_KEY);
  if (!raw) return;
  try {
    const lock = JSON.parse(raw) as { id: string; ts: number };
    if (lock.id === TAB_ID) localStorage.removeItem(LOCK_KEY);
  } catch {
    localStorage.removeItem(LOCK_KEY);
  }
}

function waitForOtherTab(): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("refresh_wait_timeout"));
    }, LOCK_WAIT_MS);

    const onChannelMsg = (ev: MessageEvent<ChannelMsg>) => {
      if (settled) return;
      if (ev.data?.type === "refreshed") {
        settled = true;
        cleanup();
        resolve(ev.data.token);
      } else if (ev.data?.type === "refresh_failed" || ev.data?.type === "logout") {
        settled = true;
        cleanup();
        reject(new Error("refresh_failed_other_tab"));
      }
    };

    const onStorage = (ev: StorageEvent) => {
      if (settled || ev.key !== "auth:broadcast_fallback" || !ev.newValue) return;
      try {
        const msg = JSON.parse(ev.newValue) as ChannelMsg;
        if (msg.type === "refreshed") {
          settled = true;
          cleanup();
          resolve(msg.token);
        } else if (msg.type === "refresh_failed" || msg.type === "logout") {
          settled = true;
          cleanup();
          reject(new Error("refresh_failed_other_tab"));
        }
      } catch {
        // ignorar mensajes mal formados
      }
    };

    function cleanup() {
      clearTimeout(timer);
      channel?.removeEventListener("message", onChannelMsg);
      window.removeEventListener("storage", onStorage);
    }

    channel?.addEventListener("message", onChannelMsg);
    window.addEventListener("storage", onStorage);
  });
}

async function doRefresh(): Promise<string> {
  const csrf = getCookie("csrf_token");
  const { data } = await httpBare.post("/auth/refresh", null, {
    headers: csrf ? { "X-CSRF-Token": csrf } : {},
  });
  setAccessToken(data.access_token);
  return data.access_token as string;
}

let inFlight: Promise<string> | null = null;

export function refreshSession(): Promise<string> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    if (!tryAcquireLock()) {
      try {
        return await waitForOtherTab();
      } catch {
        // la otra pestaña no contestó a tiempo o falló: probamos nosotros
        if (!tryAcquireLock()) throw new Error("refresh_lock_unavailable");
      }
    }

    try {
      const token = await doRefresh();
      postMessage({ type: "refreshed", token });
      return token;
    } catch (err) {
      postMessage({ type: "refresh_failed" });
      throw err;
    } finally {
      releaseLock();
    }
  })();

  return inFlight.finally(() => {
    inFlight = null;
  });
}

export function forceLogout(motivo: LogoutMotivo) {
  setAccessToken(null);
  sessionStorage.removeItem("me");
  delete http.defaults.headers.common["Authorization"];
  postMessage({ type: "logout", motivo });
  window.dispatchEvent(new CustomEvent<LogoutMotivo>("auth:logout", { detail: motivo }));
}

export function listenRemoteLogout(cb: (motivo: LogoutMotivo) => void): () => void {
  const onChannelMsg = (ev: MessageEvent<ChannelMsg>) => {
    if (ev.data?.type === "logout") cb(ev.data.motivo);
  };
  const onStorage = (ev: StorageEvent) => {
    if (ev.key !== "auth:broadcast_fallback" || !ev.newValue) return;
    try {
      const msg = JSON.parse(ev.newValue) as ChannelMsg;
      if (msg.type === "logout") cb(msg.motivo);
    } catch {
      // ignorar
    }
  };
  channel?.addEventListener("message", onChannelMsg);
  window.addEventListener("storage", onStorage);
  return () => {
    channel?.removeEventListener("message", onChannelMsg);
    window.removeEventListener("storage", onStorage);
  };
}

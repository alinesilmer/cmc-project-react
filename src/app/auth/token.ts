// El access token vive SOLO en memoria. En `sessionStorage` lo leería cualquier XSS;
// en una variable del módulo no hay nada que robar de un volcado del storage.
// Al recargar la página se pierde a propósito: `AuthProvider` pide uno nuevo con
// la cookie httpOnly de refresh (`refreshSession`) antes de marcar la sesión lista.
let accessToken: string | null = null;

// Versiones anteriores lo guardaban acá: se borra para no dejar un token vivo
// en el navegador de quien actualiza.
try {
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("access_token");
} catch {
  // storage bloqueado (modo privado, políticas): no hay nada que limpiar.
}

export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;

export const getCookie = (name: string) => {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
};

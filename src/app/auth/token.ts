let accessToken: string | null =
  (typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem("access_token")) ||
  null;

export const setAccessToken = (t: string | null) => {
  accessToken = t;
  if (typeof sessionStorage !== "undefined") {
    if (t) sessionStorage.setItem("access_token", t);
    else sessionStorage.removeItem("access_token");
  }
};
export const getAccessToken = () => accessToken;

export const getCookie = (name: string) => {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
};

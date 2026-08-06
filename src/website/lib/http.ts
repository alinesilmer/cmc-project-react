// Re-export the shared HTTP client from the app layer.
// This keeps src/website imports self-contained while still sharing the
// singleton axios instance and auth interceptors defined in src/app.
export { http, httpBare, getJSON } from "../../app/lib/http";

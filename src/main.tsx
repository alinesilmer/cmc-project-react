import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./app/styles/globals.scss";

import RootRoutes from "./routes";
import ChunkErrorBoundary, { CHUNK_RELOAD_FLAG } from "./app/ChunkErrorBoundary";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./app/auth/AuthProvider";

// Solo en desarrollo: el paquete es devDependency y no entra al bundle de producción.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : null;

// Un 4xx no cambia por repetirlo (sin permiso, no existe, dato inválido): el error se muestra enseguida.
function reintentarLectura(fallos: number, err: unknown): boolean {
  const status = (err as { response?: { status?: number } } | null)?.response?.status;
  if (status !== undefined && status >= 400 && status < 500) return false;
  return fallos < 2;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: reintentarLectura } },
});

// Vite dispara este evento cuando un <link rel="modulepreload"> falla — mismo escenario de chunk viejo borrado por un deploy que cubre ChunkErrorBoundary.
window.addEventListener("vite:preloadError", () => {
  if (sessionStorage.getItem(CHUNK_RELOAD_FLAG) === "1") return;
  sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChunkErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {/* El tema de MUI va sólo en el panel: ver app/TemaPanel.tsx. */}
          <AuthProvider>
            <RootRoutes />
          </AuthProvider>
          {ReactQueryDevtools && (
            <Suspense fallback={null}>
              <ReactQueryDevtools initialIsOpen={false} />
            </Suspense>
          )}
        </QueryClientProvider>
      </BrowserRouter>
    </ChunkErrorBoundary>
  </StrictMode>
);

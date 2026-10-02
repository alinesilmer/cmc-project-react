import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./app/styles/globals.scss";
import "./app/styles/rsuite-toaster-overrides.css";

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

const queryClient = new QueryClient();

// Vite dispara este evento cuando un <link rel="modulepreload"> falla — mismo
// escenario de chunk viejo borrado por un deploy que cubre ChunkErrorBoundary, pero
// esta vía no siempre pasa por un throw que un Error Boundary llegue a capturar.
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

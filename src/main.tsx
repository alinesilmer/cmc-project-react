import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./app/styles/globals.scss";
import "./app/styles/rsuite-toaster-overrides.css";

import RootRoutes from "./routes";
import ChunkErrorBoundary, { CHUNK_RELOAD_FLAG } from "./app/ChunkErrorBoundary";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { AuthProvider } from "./app/auth/AuthProvider";

const queryClient = new QueryClient();

const muiTheme = createTheme({
  typography: { fontFamily: '"Inter", sans-serif' },
});

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
          <ThemeProvider theme={muiTheme}>
            <AuthProvider>
              <RootRoutes />
            </AuthProvider>
          </ThemeProvider>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </BrowserRouter>
    </ChunkErrorBoundary>
  </StrictMode>
);

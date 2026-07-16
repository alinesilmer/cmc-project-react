import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./app/styles/globals.scss";
import "./app/styles/rsuite-toaster-overrides.css";

import RootRoutes from "./routes";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { AuthProvider } from "./app/auth/AuthProvider";

const queryClient = new QueryClient();

const muiTheme = createTheme({
  typography: { fontFamily: '"Inter", sans-serif' },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
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
  </StrictMode>
);

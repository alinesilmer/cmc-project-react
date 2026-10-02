import { Outlet } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const tema = createTheme({
  typography: { fontFamily: '"Inter", sans-serif' },
});

/**
 * El tema de MUI, sólo para las rutas del panel. Antes envolvía toda la app
 * desde `main.tsx`, así que el sitio público —que no usa MUI— descargaba MUI
 * y Emotion (~100 KB) en el bundle de entrada.
 */
export default function TemaPanel() {
  return (
    <ThemeProvider theme={tema}>
      <Outlet />
    </ThemeProvider>
  );
}

import { useLayoutEffect, useMemo } from "react";
import { Outlet } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import Avisos from "@/app/components/layout/Avisos/Avisos";
import { TEMA_OSCURO_DISPONIBLE, useTema } from "@/app/hooks/tema";
import "@/app/styles/tema.scss";

/** El tema de MUI, sólo para las rutas del panel. */
export default function TemaPanel() {
  const elegido = useTema();
  const oscuro = TEMA_OSCURO_DISPONIBLE && elegido === "oscuro";

  useLayoutEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.panel = "";
    if (oscuro) raiz.dataset.tema = "oscuro";
    else delete raiz.dataset.tema;
    // El tema oscuro que rsuite ya trae para sus modales.
    raiz.classList.toggle("rs-theme-dark", oscuro);
    return () => {
      delete raiz.dataset.panel;
      delete raiz.dataset.tema;
      raiz.classList.remove("rs-theme-dark");
    };
  }, [oscuro]);

  const tema = useMemo(
    () =>
      createTheme({
        // La misma variable que usan las hojas (ver `styles/tema.scss`).
        typography: { fontFamily: 'var(--fuente-texto, "Inter", sans-serif)' },
        // En `rem`, como las hojas: así los espacios de MUI siguen la escala del panel (ver `styles/tema.scss`).
        spacing: (factor: number) => `${factor * 0.5}rem`,
        palette: oscuro
          ? // Los mismos fondos que genera el plugin para la página y las tarjetas.
            { mode: "dark", background: { default: "#1f2630", paper: "#222934" } }
          : { mode: "light" },
      }),
    [oscuro],
  );

  return (
    <ThemeProvider theme={tema}>
      <Outlet />
      <Avisos />
    </ThemeProvider>
  );
}

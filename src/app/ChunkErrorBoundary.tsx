import { Component, type ReactNode } from "react";

// Cada deploy reemplaza `assets/*-<hash>.js` por nombres nuevos y borra los viejos
// (ver .github/workflows/main.yml: `rm -rf /srv/web/* && tar -xzf ...`). Una pestaña
// que quedó abierta desde antes del deploy todavía referencia un chunk viejo: al
// navegar a una sección lazy que esa sesión no cargó todavía, el `import()` pide un
// archivo que ya no existe, el servidor cae al index.html de fallback de la SPA
// (devuelve HTML donde se esperaba un módulo JS) y React queda con la
// reconciliación a medio hacer → pantalla en blanco. Recargar una vez trae el
// index.html vigente, con los nombres de chunk actuales, y se resuelve solo — es
// lo mismo que hacer F5 a mano.
export const CHUNK_RELOAD_FLAG = "cmc-chunk-reload";

const isChunkLoadError = (error: unknown): boolean => {
  const msg = error instanceof Error ? error.message : String(error);
  return /fetch dynamically imported module|failed to load module script|error loading dynamically imported module|importing a module script failed/i.test(
    msg,
  );
};

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  recovering: boolean;
}

class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, recovering: false };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    const yaIntentado = sessionStorage.getItem(CHUNK_RELOAD_FLAG) === "1";
    if (isChunkLoadError(error) && !yaIntentado) {
      sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
      this.setState({ recovering: true });
      window.location.reload();
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    // Ya se disparó el reload (arriba) — no hay nada útil que mostrar en el
    // instante entre el catch y que el navegador navegue de vuelta.
    if (this.state.recovering) {
      return (
        <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
          Actualizando…
        </div>
      );
    }

    // Error genuino (no de chunk), o de chunk pero ya se había intentado recargar
    // antes en esta sesión y volvió a pasar: no seguimos recargando en loop.
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
        <p>Ocurrió un problema al cargar la aplicación.</p>
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
            window.location.reload();
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }
}

export default ChunkErrorBoundary;

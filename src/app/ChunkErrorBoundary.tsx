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

// El otro motivo de pantalla en blanco: algo externo a React (el traductor del
// navegador, una extensión de antivirus, etc.) reescribió el DOM por debajo. Cuando
// React va a insertar o sacar un nodo, el hermano de referencia que tenía guardado
// ya no es hijo del contenedor y el commit revienta. La app no puede seguir
// renderizando sobre un árbol corrupto, pero recargar la deja sana.
// La raíz de esto se ataca en index.html (lang="es" + notranslate); esto es la red
// de contención para el resto de los casos.
const isDomCorruptionError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const esNotFound = error.name === "NotFoundError";
  return esNotFound && /insertBefore|removeChild|appendChild/i.test(error.message);
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
    // El flag vive en sessionStorage: si el reload no alcanzó y vuelve a romperse,
    // se muestra la pantalla de "Reintentar" en vez de recargar en loop infinito.
    const yaIntentado = sessionStorage.getItem(CHUNK_RELOAD_FLAG) === "1";
    const recuperable = isChunkLoadError(error) || isDomCorruptionError(error);
    if (recuperable && !yaIntentado) {
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

    // Error que no sabemos recuperar, o uno que sí pero ya se recargó una vez en
    // esta sesión y volvió a pasar: no seguimos recargando en loop.
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

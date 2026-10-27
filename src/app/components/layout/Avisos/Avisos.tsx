import { useEffect, useSyncExternalStore } from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import { keyframes } from "@emotion/react";

import { leerAvisos, quitarAviso, suscribirAvisos, type Aviso } from "@/app/hooks/avisos";

const entrar = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

function AvisoItem({ aviso }: { aviso: Aviso }) {
  useEffect(() => {
    const t = window.setTimeout(() => quitarAviso(aviso.id), aviso.duracion);
    return () => window.clearTimeout(t);
  }, [aviso.id, aviso.duracion]);

  return (
    <Alert
      severity={aviso.severidad}
      variant="filled"
      onClose={() => quitarAviso(aviso.id)}
      sx={{
        width: "100%",
        fontSize: 13,
        borderRadius: "6px",
        pointerEvents: "auto",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.18)",
        animation: `${entrar} 160ms ease-out`,
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    >
      {aviso.cuerpo ? (
        <>
          <AlertTitle sx={{ fontSize: 13, fontWeight: 700, mb: 0.25 }}>{aviso.titulo}</AlertTitle>
          {aviso.cuerpo}
        </>
      ) : (
        aviso.titulo
      )}
    </Alert>
  );
}

/** Dibuja la cola de avisos abajo a la derecha. */
export default function Avisos() {
  const avisos = useSyncExternalStore(suscribirAvisos, leerAvisos);
  if (avisos.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        // Por encima de los modales (MUI 1300).
        zIndex: 1400,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "min(420px, calc(100vw - 32px))",
        pointerEvents: "none",
      }}
    >
      {avisos.map((a) => (
        <AvisoItem key={a.id} aviso={a} />
      ))}
    </div>
  );
}

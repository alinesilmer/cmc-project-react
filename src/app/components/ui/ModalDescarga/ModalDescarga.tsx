import { useSyncExternalStore } from "react";

import ModalEspera, { type FaseEspera } from "@/app/components/ui/ModalEspera/ModalEspera";
import { cerrarDescarga, leerDescarga, suscribirDescarga } from "@/app/hooks/descargas";

const TEXTOS = {
  generando: { fase: "corriendo", titulo: "Generando tu archivo", detalle: "No toques nada hasta que termine." },
  listo: { fase: "listo", titulo: "Archivo listo", detalle: "Ya podés usarlo." },
  error: { fase: "error", titulo: "No se pudo generar", detalle: "Probá de nuevo." },
} as const satisfies Record<string, { fase: FaseEspera; titulo: string; detalle: string }>;

/** El modal de espera de las descargas: va montado una sola vez. */
export default function ModalDescarga() {
  const fase = useSyncExternalStore(suscribirDescarga, leerDescarga);
  if (fase === "libre") return null;
  return <ModalEspera {...TEXTOS[fase]} onCerrar={cerrarDescarga} />;
}

import { useSyncExternalStore } from "react";

import ModalEspera from "@/app/components/ui/ModalEspera/ModalEspera";
import { cerrarProceso, leerProceso, suscribirProceso } from "@/app/hooks/proceso";

/** El modal de espera de las acciones lentas (`conProceso`): va montado una sola vez. */
export default function ModalProceso() {
  const { fase, titulo, detalle } = useSyncExternalStore(suscribirProceso, leerProceso);
  if (fase === "libre") return null;
  return <ModalEspera fase={fase === "listo" || fase === "error" ? fase : "corriendo"} titulo={titulo} detalle={detalle} onCerrar={cerrarProceso} />;
}

import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import ConfirmModal from "@/app/components/ui/ConfirmModal/ConfirmModal";

type Texto = { titulo: string; mensaje: string; confirmar?: string };
type Pedido = Texto & { alConfirmar: () => void };

/** Confirmar una acción con el modal del sistema, en lugar del `confirm()` del navegador. Dibujar `modal` una vez en el componente. */
export function useConfirmacion(): { pedir: (texto: Texto, alConfirmar: () => void) => void; modal: ReactNode } {
  const [abierto, setAbierto] = useState(false);
  // Se conserva al cerrar: el modal se desvanece con su texto puesto.
  const [pedido, setPedido] = useState<Pedido | null>(null);

  const pedir = useCallback((texto: Texto, alConfirmar: () => void) => {
    setPedido({ ...texto, alConfirmar });
    setAbierto(true);
  }, []);

  const confirmar = () => {
    setAbierto(false);
    pedido?.alConfirmar();
  };

  // En un portal: dentro de una tarjeta con `transform`, un modal `position: fixed` quedaría mal ubicado.
  const modal = createPortal(
    <ConfirmModal
      isOpen={abierto}
      title={pedido?.titulo ?? ""}
      message={pedido?.mensaje ?? ""}
      confirmLabel={pedido?.confirmar ?? "Eliminar"}
      onConfirm={confirmar}
      onCancel={() => setAbierto(false)}
    />,
    document.body,
  );

  return { pedir, modal };
}

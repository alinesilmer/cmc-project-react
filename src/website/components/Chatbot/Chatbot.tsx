import { createPortal } from "react-dom";
import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { EVENTO_ABRIR_CHATBOT } from "./abrirChatbot";
import BotonChat from "./BotonChat";

// La ventana trae el motor de respuestas y todos los intents.
const cargarVentana = () => import("./VentanaChat");
const VentanaChat = lazy(cargarVentana);

const RUTAS_OCULTO = ["/403", "/panel"];

// Dónde se ofrece el botón flotante.
const RUTAS_CON_BOTON = ["/contacto", "/preguntas-frecuentes"];
const DIALOG_ID = "cmc-chat-dialog";

export default function Chatbot() {
  const { pathname } = useLocation();
  const oculto = RUTAS_OCULTO.some((p) => pathname.startsWith(p));
  const mostrarBoton = RUTAS_CON_BOTON.some((p) => pathname.startsWith(p));

  const [abierto, setAbierto] = useState(false);
  // Si ya se abrió alguna vez.
  const [cargado, setCargado] = useState(false);

  const abrir = useCallback(() => {
    setCargado(true);
    setAbierto(true);
  }, []);
  const cerrar = useCallback(() => setAbierto(false), []);

  useEffect(() => {
    window.addEventListener(EVENTO_ABRIR_CHATBOT, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_CHATBOT, abrir);
  }, [abrir]);

  if (oculto) return null;

  return (
    <>
      {mostrarBoton &&
        !abierto &&
        createPortal(
          <BotonChat
            idDialogo={DIALOG_ID}
            onAbrir={abrir}
            // Con el mouse encima o el foco puesto ya se sabe que lo van a abrir.
            onPrecargar={() => void cargarVentana()}
          />,
          document.body
        )}

      {cargado && (
        <Suspense fallback={null}>
          <VentanaChat id={DIALOG_ID} abierto={abierto} onCerrar={cerrar} />
        </Suspense>
      )}
    </>
  );
}

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import { Heart, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";
import { avisoPendiente, cerrarAviso, llevaAviso } from "./reglasAviso";
import styles from "./AvisoIngreso.module.scss";

const RUTA_INICIO = "/panel/dashboard";

/**
 * Mensaje de buen trato, al ingresar y en cada visita a Inicio. Habla del
 * respeto como regla de todos, sin señalar a quien lo lee: tiene que
 * entenderse sin sonar a reto. Sólo se cierra con la «X»: ni Escape ni un
 * clic afuera, para que no se descarte sin leerlo.
 */
export default function AvisoIngreso() {
  const { user } = useAuth();
  const location = useLocation();
  // Cada navegación trae una `key` nueva: guardar la de la visita en la que se
  // cerró hace que el aviso vuelva al entrar otra vez a Inicio, incluso con un
  // clic en «Inicio» estando ya ahí.
  const [visitaCerrada, setVisitaCerrada] = useState<string | null>(null);

  const enInicio = location.pathname.replace(/\/+$/, "") === RUTA_INICIO;
  const porVisita = llevaAviso(user) && enInicio && visitaCerrada !== location.key;

  if (!porVisita && !avisoPendiente(user)) return null;

  const cerrar = () => {
    cerrarAviso();
    setVisitaCerrada(location.key);
  };

  return (
    <Dialog
      open
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      aria-labelledby="aviso-ingreso-titulo"
      aria-describedby="aviso-ingreso-texto"
      slotProps={{ paper: { className: styles.aviso } }}
    >
      <button type="button" className={styles.cerrar} onClick={cerrar} aria-label="Cerrar el mensaje">
        <X aria-hidden="true" />
      </button>

      <div className={styles.cabecera} aria-hidden="true">
        <span className={styles.corazon}>
          <Heart />
        </span>
      </div>

      <div className={styles.cuerpo}>
        <h2 id="aviso-ingreso-titulo" className={styles.titulo}>
          El buen trato <em>nos cuida a todos</em>
        </h2>
        <p id="aviso-ingreso-texto" className={styles.texto}>
          En el Colegio, el respeto es la base de cada atención.
        </p>
        <p className={styles.texto}>
          Quienes atienden cada consulta trabajan con dedicación. Un trato amable es la mejor forma de
          reconocerlo.
        </p>
        <p className={styles.gracias}>¡Gracias!</p>
      </div>
    </Dialog>
  );
}

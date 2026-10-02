import { useState } from "react";
import Alerta from "../../../components/UI/Alerta/Alerta";
import FormNuevoAviso from "./FormNuevoAviso";
import TarjetaAviso from "./TarjetaAviso";
import { useAvisosAdmin } from "./useAvisosAdmin";
import styles from "./MedicosPromo.module.scss";

/** La solapa «Publicidad de doctores»: alta de avisos y el listado editable. */
export default function AdminMedicosPromo() {
  const { avisos, cargando, crear, actualizar, borrar } = useAvisosAdmin();
  // Un `alert()` bloquea la pestaña y no deja copiar el texto: los errores van
  // en la pantalla, donde pasó la cosa.
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <div className={styles.wrap}>
      {aviso && <Alerta onCerrar={() => setAviso(null)}>{aviso}</Alerta>}

      <FormNuevoAviso
        onCrear={async (medicoId, activo, imagen) => {
          await crear(medicoId, activo, imagen);
          setAviso(null);
        }}
        onError={setAviso}
      />

      <section className={styles.listSection}>
        <h2>Publicidades</h2>
        {cargando ? (
          <p>Cargando…</p>
        ) : avisos.length === 0 ? (
          <p>No hay publicidades.</p>
        ) : (
          <div className={styles.cards}>
            {avisos.map((a) => (
              <TarjetaAviso key={a.id} aviso={a} onActualizar={actualizar} onBorrar={borrar} onError={setAviso} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

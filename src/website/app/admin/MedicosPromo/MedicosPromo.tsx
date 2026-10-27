import { Megaphone } from "lucide-react";

import FormNuevoAviso from "./FormNuevoAviso";
import TarjetaAviso from "./TarjetaAviso";
import { useAvisosAdmin } from "./useAvisosAdmin";
import s from "./MedicosPromo.module.scss";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Paso from "@/app/components/ui/Paso/Paso";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import { useNotify } from "@/app/hooks/useNotify";

/** La solapa «Publicidad de doctores»: alta de avisos y el listado editable. */
export default function AdminMedicosPromo() {
  const { avisos, cargando, crear, actualizar, borrar } = useAvisosAdmin();
  const notify = useNotify();
  // Un `alert()` bloquea la pestaña: los errores salen como aviso del panel.
  const avisar = (mensaje: string | null) => {
    if (mensaje) notify.error(mensaje);
  };

  return (
    <>
      <FormNuevoAviso onCrear={crear} onError={avisar} />

      <Paso icono={Megaphone} titulo="Publicidades">
        {cargando ? (
          <p className={c.ayuda}>
            <Cargando size={14} /> Cargando…
          </p>
        ) : avisos.length === 0 ? (
          <p className={c.ayuda}>No hay publicidades.</p>
        ) : (
          <div className={s.tarjetas}>
            {avisos.map((a) => (
              <TarjetaAviso key={a.id} aviso={a} onActualizar={actualizar} onBorrar={borrar} onError={avisar} />
            ))}
          </div>
        )}
      </Paso>
    </>
  );
}

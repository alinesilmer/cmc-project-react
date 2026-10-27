import { useMemo } from "react";

import { useAuth } from "@/app/auth/useAuth";
import { usePermisos } from "@/app/auth/usePermisos";
import { vistasVisibles, type Vista } from "./vistasInicio";
import TareasDelDia from "./components/TareasDelDia";
import VistaRapida from "./components/VistaRapida";
import s from "./Dashboard.module.scss";

function saludoDeLaHora(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Buen día";
  if (hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

type Props = {
  saludo: string;
  fecha: string;
  vistas: Vista[];
  claveTareas: string;
};

/** El Inicio ya resuelto: franja azul con el saludo, a la izquierda el cuaderno de tareas y a la derecha el panel con los listados. */
function InicioPersonal({ saludo, fecha, vistas, claveTareas }: Props) {
  return (
    <div className={s.pagina}>
      <header className={s.hero}>
        <p className={s.fecha}>{fecha}</p>
        <h1 className={s.saludo}>{saludo}</h1>
      </header>

      <div className={`${s.cuerpo} ${vistas.length === 0 ? s.cuerpoSolo : ""}`}>
        <div className={s.principal}>
          <TareasDelDia claveUsuario={claveTareas} />
        </div>

        {vistas.length > 0 && (
          <aside className={s.lateral}>
            <VistaRapida vistas={vistas} />
          </aside>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { scopes, can } = usePermisos();

  const nombre = user?.nombre?.trim() ?? "";

  const vistas = useMemo(
    () => vistasVisibles(can),
    // `can` se recrea en cada render; lo que cambia de verdad son los scopes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scopes],
  );

  return (
    <InicioPersonal
      saludo={`${saludoDeLaHora()}${nombre ? `, ${nombre}` : ""}`}
      fecha={new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
      vistas={vistas}
      claveTareas={String(user?.id ?? "anonimo")}
    />
  );
}

import type React from "react";

import { useAuth } from "../../auth/AuthProvider";
import DoctorProfilePage from "../DoctorProfilePage/DoctorProfilePage";

/**
 * "Mi perfil" del socio: el mismo legajo que ve el personal del Colegio, pero
 * fijado al médico logueado y en modo lectura. Se resuelve por `user.id` en vez
 * de por parámetro de URL para que nadie pueda mirar el legajo de otro cambiando
 * el path.
 */
const MiPerfil: React.FC = () => {
  const { user, ready } = useAuth();

  if (!ready) return null;
  if (!user?.id) {
    return (
      <div style={{ padding: 24 }}>
        No pudimos identificar tu legajo. Volvé a iniciar sesión.
      </div>
    );
  }

  return <DoctorProfilePage medicoId={user.id} readOnly />;
};

export default MiPerfil;

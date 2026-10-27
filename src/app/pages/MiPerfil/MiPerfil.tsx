import { UserRound } from "lucide-react";
import type React from "react";

import { useAuth } from "../../auth/useAuth";
import DoctorProfilePage from "../DoctorProfilePage/DoctorProfilePage";
import Franja from "@/app/components/layout/Franja/Franja";

/** "Mi perfil" del socio: el mismo legajo que ve el personal del Colegio, pero fijado al médico logueado y en modo lectura. */
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

  return (
    <>
      <Franja suelta titulo="Mi perfil" icono={UserRound} />
      <DoctorProfilePage medicoId={user.id} readOnly />
    </>
  );
};

export default MiPerfil;

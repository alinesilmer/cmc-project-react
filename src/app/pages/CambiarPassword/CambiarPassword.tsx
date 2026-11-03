import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, LockKeyhole, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import PantallaAcceso, { type Destacado } from "@/app/features/acceso/components/PantallaAcceso/PantallaAcceso";
import CampoAcceso from "@/app/features/acceso/components/CampoAcceso/CampoAcceso";
import RequisitosPassword from "./RequisitosPassword";
import { requisitosPassword } from "./reglasPassword";
import { changePassword } from "../../auth/api";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import styles from "./CambiarPassword.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

const DESTACADOS: Destacado[] = [
  { icono: ShieldCheck, texto: "Sólo vos la conocés" },
  { icono: UserCheck, texto: "Cerramos las otras sesiones" },
  { icono: Sparkles, texto: "Un paso y listo" },
];

/** Cambio de contraseña obligatorio: la cuenta todavía tiene la contraseña del alta o la provisoria de "Renovar contraseña" (ver RequireAuth). */
export default function CambiarPassword() {
  const navigate = useNavigate();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const listo = Boolean(actual) && requisitosPassword({ actual, nueva, repetir }).every((r) => r.ok);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!listo) {
      setError("Revisá los requisitos de la contraseña nueva.");
      return;
    }

    setGuardando(true);
    try {
      const res = await changePassword(actual, nueva);
      // Con relogin:true changePassword() ya dispara forceLogout, que manda al login con el aviso.
      if (!res?.relogin) navigate("/panel/login", { replace: true });
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo cambiar la contraseña. Verificá la contraseña actual."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <PantallaAcceso
      lema={
        <>
          Una clave <em>sólo tuya.</em>
        </>
      }
      destacados={DESTACADOS}
    >
      <span className={styles.icono} aria-hidden="true">
        <KeyRound />
      </span>
      <h1 className={styles.titulo}>Creá tu contraseña</h1>
      <p className={styles.bajada}>
        Todavía tenés una contraseña provisoria. Elegí una nueva para seguir.
      </p>

      <form className={styles.form} onSubmit={guardar} noValidate>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <CampoAcceso
          id="pass-actual"
          etiqueta="Contraseña actual"
          icono={<LockKeyhole />}
          secreto
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          autoComplete="current-password"
          placeholder="La que usaste para entrar"
        />
        <CampoAcceso
          id="pass-nueva"
          etiqueta="Contraseña nueva"
          icono={<KeyRound />}
          secreto
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          autoComplete="new-password"
          placeholder="Elegí una nueva"
        />
        <CampoAcceso
          id="pass-repetir"
          etiqueta="Repetí la contraseña nueva"
          icono={<KeyRound />}
          secreto
          value={repetir}
          onChange={(e) => setRepetir(e.target.value)}
          autoComplete="new-password"
          placeholder="Otra vez, para confirmar"
        />

        <RequisitosPassword actual={actual} nueva={nueva} repetir={repetir} />

        <BotonPlano type="submit" className={styles.guardar} disabled={guardando} aria-busy={guardando}>
          {guardando ? "Guardando…" : "Guardar contraseña"}
        </BotonPlano>
      </form>
    </PantallaAcceso>
  );
}

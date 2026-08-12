import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/atoms/Card/Card";
import Button from "../../components/atoms/Button/Button";
import Input from "../../components/atoms/Input/Input";
import { changePassword } from "../../auth/api";
import styles from "./CambiarPassword.module.scss";

export default function CambiarPassword() {
  const navigate = useNavigate();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!actual || !nueva || !repetir) {
      setError("Completá todos los campos.");
      return;
    }
    if (nueva.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (nueva !== repetir) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (nueva === actual) {
      setError("La nueva contraseña debe ser distinta de la actual.");
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(actual, nueva);
      // Con relogin:true el backend cierra todas las sesiones; changePassword()
      // ya dispara forceLogout, que manda al login con el mensaje. Si por algún
      // motivo no viniera relogin, igual sacamos al usuario de acá.
      if (!res?.relogin) {
        navigate("/panel/login", { replace: true });
      }
    } catch (err: any) {
      const apiMsg =
        err?.response?.data?.detail ??
        err?.response?.data?.message ??
        "No se pudo cambiar la contraseña. Verificá la contraseña actual.";
      setError(String(apiMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <h1 className={styles.heading}>Cambio de contraseña obligatorio</h1>
        <p className={styles.subtitle}>
          Tu cuenta todavía tiene la contraseña provisoria que te dieron al
          darte de alta. Antes de continuar, elegí una contraseña nueva que
          solo vos conozcas.
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && (
            <div className={styles.errorBox} role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          <div>
            <label className={styles.label} htmlFor="actual">
              Contraseña actual
            </label>
            <Input
              type="password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className={styles.label} htmlFor="nueva">
              Contraseña nueva
            </label>
            <Input
              type="password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className={styles.label} htmlFor="repetir">
              Repetir contraseña nueva
            </label>
            <Input
              type="password"
              value={repetir}
              onChange={(e) => setRepetir(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className={styles.actions}>
            <Button submit variant="primary" fullWidth disabled={loading}>
              {loading ? "Guardando…" : "Cambiar contraseña"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

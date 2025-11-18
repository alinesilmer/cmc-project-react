import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Login.module.scss";
import Button from "../../components/atoms/Button/Button";
import { useAuth } from "../../auth/AuthProvider";
import { isWebEditor } from "../../auth/roles";
import { http } from "../../lib/http";

function Login() {
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  // const hasLegacyAccess = (scopes?: string[]) =>
  //   !!scopes?.some((s) =>
  //     [
  //       "legacy:access",
  //       "legacy:facturador",
  //       "facturador",
  //       "facturas:ver",
  //     ].includes(s)
  //   );

  // const isDoctor = (scopes?: string[]) =>
  //   !!scopes?.some(
  //     (s) =>
  //       typeof s === "string" &&
  //       /^(medicos?|legacy:(doctor|medico))(:|$)/i.test(s.trim())
  //   );

  const ETICA_PDF = "https://colegiomedicocorrientes.com/CMC092025.pdf";

  const goMember = () => {
    setIsMember(true);
    setError("");
  };

  const goRegister = () => {
    setIsMember(false);
    navigate("/panel/register");
  };

  const goObrasSociales = () => {
    navigate("/panel/obras-sociales");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const fd = new FormData(e.currentTarget);
    const u = String(fd.get("username") || "").trim();
    const p = String(fd.get("password") || "").trim();

    const nro = Number(u);
    if (!nro || Number.isNaN(nro) || !p) {
      setError("Ingresá Nro. de socio y matrícula provincial.");
      return;
    }

    setLoading(true);
    try {
      const me = await login(nro, p);
      console.log(me);

      if (isWebEditor(me.scopes)) {
        navigate("/admin/dashboard-web", { replace: true });
        return;
      }

      if (me.role == "medico") {
        const next = `/menu.php?nro_socio1=${encodeURIComponent(
          Number(me.nro_socio)
        )}`;
        const { data } = await http.get("/auth/legacy/sso-link", {
          params: { next },
        });
        window.location.href = data.url;
      } else if (me.role != "medico") {
        const { data } = await http.get("/auth/legacy/sso-link", {
          params: { next: "/principal.php" },
        });
        window.location.href = data.url;
      }
    } catch (err: any) {
      const apiMsg =
        err?.response?.data?.detail ??
        err?.response?.data?.message ??
        "Credenciales inválidas o servicio no disponible.";
      setError(String(apiMsg));
    } finally {
      setLoading(false);
    }
  };

  const goBackToStart = () => {
    setIsMember(null);
    setError("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.btnBack}>
        <Link to="/" className={styles.linkBackToLanding}>
                Volver a la página
              </Link>
              </div>
      <section className={styles.card}>
        {isMember && (
          <button
            type="button"
            onClick={goBackToStart}
            className={styles.backLink}
            aria-label="Volver"
            title="Volver"
          >
            ←
          </button>
        )}

        <div className={styles.content}>
          <div className={styles.headerRow}>
            <div className={styles.title}>
              <h1 className={styles.heading}>
                {isMember ? "¡Bienvenido!" : "Inicio de Sesión"}
              </h1>
              <p className={styles.subtitle}>
                {isMember
                  ? "Ingresá con tu usuario y contraseña"
                  : "¿Cómo desea ingresar?"}
              </p>
            </div>
          </div>

          <div className={styles.fork}>
            {!isMember && (
              <>
                <Button
                  className={styles.cta}
                  variant="primary"
                  size="md"
                  onClick={goMember}
                >
                  Soy socio
                </Button>
                <Button variant="secondary" size="md" onClick={goRegister}>
                  Quiero ser socio
                </Button>
                <Button variant="third" size="md" onClick={goObrasSociales}>
                  Asociarme como Obra Social
                </Button>
              </>
            )}

            {isMember && (
              <form
                className={styles.loginForm}
                onSubmit={handleSubmit}
                noValidate
              >
                {error && (
                  <div
                    className={styles.errorBox}
                    role="alert"
                    aria-live="assertive"
                  >
                    {error}
                  </div>
                )}

                <label className={styles.label} htmlFor="user">
                  Nro socio
                </label>
                <input
                  id="user"
                  name="username"
                  type="text"
                  className={`${styles.input} ${error ? styles.isInvalid : ""}`}
                  placeholder="Nro socio"
                  autoComplete="username"
                  required
                  onInput={() => setError("")}
                  inputMode="numeric"
                />

                <label className={styles.label} htmlFor="pass">
                  Matrícula
                </label>
                <input
                  id="pass"
                  name="password"
                  type="password"
                  className={`${styles.input} ${error ? styles.isInvalid : ""}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  onInput={() => setError("")}
                />

                <div className={styles.formActions}>
                  <Button
                    submit
                    variant="primary"
                    size="md"
                    className={styles.cta}
                    disabled={loading}
                    aria-busy={loading}
                  >
                    {loading ? "Ingresando..." : "Ingresar"}
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className={styles.divider} aria-hidden />
          <div className={styles.bottomLinks}>
            {!isMember && (
              <Link to="/panel/info" className={styles.linkMuted}>
                Requisitos para Registrarse
              </Link>
            )}
          </div>
        </div>
        <aside className={styles.media} aria-hidden>
          <h3 className={styles.ethicsTitle}>
            <a
              href={ETICA_PDF}
              download="Valores_Eticos_Minimos.pdf"
              target="__blank"
            >
              Ver Valores Éticos Mínimos
            </a>
          </h3>
        </aside>
      </section>
    </div>
  );
}

export default Login;

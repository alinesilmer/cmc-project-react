import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import styles from "./Login.module.scss";
import Button from "../../components/atoms/Button/Button";
import Modal from "../../components/atoms/Modal/Modal";
import { useAuth } from "../../auth/AuthProvider";
import { isWebEditor } from "../../auth/roles";
import { hasScope } from "../../auth/scopes";
import { http } from "../../lib/http";
import pdf from "../../assets/CMC_08_2026.pdf";
import { mensajeDeError } from "../../lib/httpErrors";
import type { LogoutMotivo } from "../../auth/session";
import Header from "../../../website/components/UI/Header/Header";

const LOGOUT_MESSAGES: Record<LogoutMotivo, string> = {
  token_revocado: "Tu sesión se cerró, ingresá de nuevo.",
  sesion_expirada: "Tu sesión se cerró, ingresá de nuevo.",
  password_changed: "Contraseña actualizada, ingresá de nuevo.",
};

function Login() {
  const location = useLocation();
  const motivo = (location.state as { motivo?: LogoutMotivo } | null)?.motivo;

  const [isMember, setIsMember] = useState<boolean | null>(motivo ? true : null);
  const [error, setError] = useState<string>("");
  const [notice, setNotice] = useState<string>(motivo ? LOGOUT_MESSAGES[motivo] : "");
  const [loading, setLoading] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
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

  const goMember = () => {
    setIsMember(true);
    setError("");
  };

  const goRegister = () => {
    setIsMember(false);
    navigate("/panel/register");
  };

  const goObrasSociales = () => {
    navigate("/panel/register-os");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setNotice("");

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

      if (me.must_change_password) {
        navigate("/panel/cambiar-password", { replace: true });
        return;
      }

      if (isWebEditor(me)) {
        navigate("/admin/dashboard-web", { replace: true });
        return;
      }

      // TEMPORAL — prueba controlada del panel nuevo con médicos
      // seleccionados. Quien tenga panel:ingresar se queda acá en vez de ir
      // al legacy; el resto sigue el flujo de siempre. Borrar junto con
      // Scope.PANEL_INGRESAR (backend) cuando cierre la prueba.
      if (hasScope(me.scopes, "panel:ingresar")) {
        navigate("/panel/dashboard", { replace: true });
        return;
      }

      if (me.role == "medico") {
        const menuPage = me.es_organizacion === 1 ? "menu_clinica.php" : "menu.php";
        const next = `/${menuPage}?nro_socio1=${encodeURIComponent(
          Number(me.nro_socio),
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
      setError(mensajeDeError(err, "Credenciales inválidas o servicio no disponible."));
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
      <Header />

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
                  ? "Ingresá con tu número de socio y matrícula."
                  : "¡Haz click en el botón de abajo!"}
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
                  Iniciar Sesión
                </Button>
                <Button
                  className={styles.cta}
                  variant="third"
                  size="md"
                  onClick={() => setIsPdfOpen(true)}
                >
                  Ver Valores Éticos Mínimos
                </Button>
                {/* <Button variant="secondary" size="md" onClick={goRegister}>
                  Quiero ser socio
                </Button> */}
                {/* <Button variant="third" size="md" onClick={goObrasSociales}>
                  Asociarme como Obra Social
                </Button> */}
              </>
            )}

            {isMember && (
              <form
                className={styles.loginForm}
                onSubmit={handleSubmit}
                noValidate
              >
                {notice && !error && (
                  <div
                    className={styles.errorBox}
                    role="status"
                    aria-live="polite"
                  >
                    {notice}
                  </div>
                )}

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
        <aside className={styles.media} aria-hidden></aside>
      </section>
      <Modal
        isOpen={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        title="Valores Éticos Mínimos"
        size="large"
      >
        <div className={styles.pdfModal}>
          <iframe
            src={pdf}
            title="Valores Éticos Mínimos"
            className={styles.pdfFrame}
          />
          <a href={pdf} download className={styles.pdfDownload}>
            <Download size={16} />
            Descargar PDF
          </a>
        </div>
      </Modal>
    </div>
  );
}

export default Login;

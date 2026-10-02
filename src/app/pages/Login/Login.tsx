import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, CircleUserRound, FileText, IdCard, LockKeyhole, ShieldCheck, Wallet } from "lucide-react";
import PantallaAcceso, { type Destacado } from "@/app/features/acceso/components/PantallaAcceso/PantallaAcceso";
import CampoAcceso from "@/app/features/acceso/components/CampoAcceso/CampoAcceso";
import AyudaPassword from "./AyudaPassword";
import ModalValoresEticos from "./ModalValoresEticos";
import { useAuth } from "../../auth/AuthProvider";
import { destinoDe, irADestino } from "../../auth/destino";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import { saludoSegunHora } from "@/app/shared/lib/fechas";
import type { LogoutMotivo } from "../../auth/session";
import Header from "@/website/components/UI/Header/Header";
import styles from "./Login.module.scss";

const MENSAJES_SALIDA: Record<LogoutMotivo, string> = {
  token_revocado: "Tu sesión se cerró, ingresá de nuevo.",
  sesion_expirada: "Tu sesión se cerró, ingresá de nuevo.",
  password_changed: "Contraseña actualizada, ingresá de nuevo.",
};

const DESTACADOS: Destacado[] = [
  { icono: ShieldCheck, texto: "Validá afiliados" },
  { icono: Wallet, texto: "Mirá tus cobros" },
  { icono: BadgeCheck, texto: "Tu credencial digital" },
];

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const motivo = (location.state as { motivo?: LogoutMotivo } | null)?.motivo;

  // Se calcula una vez al montar: no hace falta que cambie con la pantalla abierta.
  const [saludo] = useState(saludoSegunHora);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState(motivo ? MENSAJES_SALIDA[motivo] : "");
  const [cargando, setCargando] = useState(false);
  const [ayudaAbierta, setAyudaAbierta] = useState(false);
  const [pdfAbierto, setPdfAbierto] = useState(false);

  const ingresar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setAviso("");

    const datos = new FormData(e.currentTarget);
    const nro = Number(String(datos.get("username") ?? "").trim());
    const password = String(datos.get("password") ?? "").trim();
    if (!nro || !password) {
      setError("Completá tu número de socio y tu contraseña.");
      return;
    }

    setCargando(true);
    try {
      const usuario = await login(nro, password);
      await irADestino(destinoDe(usuario), navigate);
    } catch (err) {
      setError(mensajeDeError(err, "El número de socio o la contraseña no coinciden."));
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <Header />
      <PantallaAcceso
        lema={
          <>
            Tu Colegio, <em>a un clic.</em>
          </>
        }
        destacados={DESTACADOS}
      >
        <h1 className={styles.titulo}>{saludo}</h1>
        <p className={styles.bajada}>Ingresá con tu número de socio.</p>

        <form className={styles.form} onSubmit={ingresar} noValidate>
          {aviso && !error && (
            <p className={`${styles.mensaje} ${styles.mensajeInfo}`} role="status">
              {aviso}
            </p>
          )}
          {error && (
            <p className={`${styles.mensaje} ${styles.mensajeError}`} role="alert">
              {error}
            </p>
          )}

          <CampoAcceso
            id="login-socio"
            name="username"
            etiqueta="Número de socio"
            icono={<IdCard />}
            placeholder="Ej: 1234"
            inputMode="numeric"
            autoComplete="username"
            invalido={Boolean(error)}
            onInput={() => setError("")}
            required
          />

          <CampoAcceso
            id="login-password"
            name="password"
            etiqueta="Contraseña"
            icono={<LockKeyhole />}
            secreto
            placeholder="Tu contraseña"
            autoComplete="current-password"
            invalido={Boolean(error)}
            onInput={() => setError("")}
            required
          />

          <button
            type="button"
            className={styles.olvide}
            onClick={() => setAyudaAbierta((v) => !v)}
            aria-expanded={ayudaAbierta}
            aria-controls="ayuda-password"
          >
            ¿Olvidaste tu contraseña?
          </button>
          <AyudaPassword abierta={ayudaAbierta} />

          <button type="submit" className={styles.ingresar} disabled={cargando} aria-busy={cargando}>
            {cargando ? "Ingresando…" : "Ingresar"}
            {!cargando && <ArrowRight aria-hidden="true" />}
          </button>
        </form>

        <div className={styles.separador}>
          <span>o también</span>
        </div>

        <div className={styles.secundarias}>
          <button type="button" className={styles.secundaria} onClick={() => setPdfAbierto(true)}>
            <FileText aria-hidden="true" />
            Valores éticos mínimos
          </button>
          <Link to="/socios" className={styles.secundaria}>
            <CircleUserRound aria-hidden="true" />
            Quiero ser socio
          </Link>
        </div>
      </PantallaAcceso>

      <ModalValoresEticos abierto={pdfAbierto} onCerrar={() => setPdfAbierto(false)} />
    </>
  );
}

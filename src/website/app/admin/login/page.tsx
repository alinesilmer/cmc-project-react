import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMail, FiLock } from "react-icons/fi";
import Button from "../../../components/UI/Button/Button";
import { api } from "../../../lib/api";
import styles from "./login.module.scss";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.login(email, password);

      if (response.token) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("usuario", JSON.stringify(response.user));
        navigate("/admin/dashboard");
      } else {
        setError(response.mensaje || "Error al iniciar sesión");
      }
    } catch {
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <motion.div
        className={styles.loginCard}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Iniciar Sesión</h1>
        <p className={styles.subtitle}>Panel de Administración</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <FiMail className={styles.icon} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <FiLock className={styles.icon} />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <Button type="submit" variant="primary" size="medium" fullWidth disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>

          <div className={styles.testCredentials}>
            <p><strong>Credenciales de prueba:</strong></p>
            <p>Email: admin@colegiomedico.com</p>
            <p>Contraseña: admin123</p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

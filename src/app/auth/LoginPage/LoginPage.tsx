"use client";

import type React from "react";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";

import Button from "../../../components/atoms/Button/Button";
import Input from "../../../components/atoms/Input/Input";
import Card from "../../../components/atoms/Card/Card";
import styles from "./LoginPage.module.scss";
import { useNavigate } from "react-router-dom";


export default function LoginPage() {
  const [nroSocio, setNroSocio] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login } = useAuth();
  const nav = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    console.log(errorMsg)
    const nro = Number(nroSocio.trim());
    if (!nro || Number.isNaN(nro) || !password.trim()) {
      setErrorMsg("Ingresá Nro. de socio y matrícula provincial.");
      return;
    }

    setIsLoading(true);
    try {
      await login(nro, password); // 👉 llama a /auth/login (el back setea cookies y devuelve access)
      nav("/dashboard", { replace: true });
    } catch (err) {
      // Podés inspeccionar err.response?.data si querés mensajes del backend
      setErrorMsg("Credenciales inválidas o servicio no disponible.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className={styles.loginPage}>
      <div className={styles.background}>
        <div className={styles.gradientOrb1}></div>
        <div className={styles.gradientOrb2}></div>
        <div className={styles.gradientOrb3}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={styles.loginContainer}
      >
        <Card className={styles.loginCard}>
          <div className={styles.logoContainer}>
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20de%20pantalla%202025-08-27%20213736-19MtVGs9R7PVKaN3PTA1TyGpis6tYG.png"
              alt="CMC Logo"
              className={styles.logo}
            />
          </div>

          <div className={styles.header}>
            <h1 className={styles.title}>Colegio Médico de Corrientes</h1>
            <p className={styles.subtitle}>
              Portal interno para profesionales. Accedé a tu tablero y gestioná
              tu información rápidamente.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <Input
                type="text"
                placeholder="Nro. de socio"
                value={nroSocio}
                onChange={(e) => setNroSocio(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.passwordContainer}>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            {/* <button type="submit" style={{ display: "none" }} id="nativeSubmit">
              nativo
            </button> */}
            <Button
              submit
              type="submit"
              size="lg"
              className={styles.loginButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                >
                  <LogIn size={20} />
                </motion.div>
              ) : (
                <>
                  <LogIn size={20} />
                  Ingresar
                </>
              )}
            </Button>
          </form>

          <div className={styles.footer}>
            <p>© 2025 CMC. Todos los derechos reservados.</p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

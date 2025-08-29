"use client";

import type React from "react";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn } from "lucide-react";
import Button from "../../../components/atoms/Button/Button";
import Input from "../../../components/atoms/Input/Input";
import Card from "../../../components/atoms/Card/Card";
import styles from "./LoginPage.module.scss";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      // Hardcoded validation - any username/password works for now
      if (username.trim() && password.trim()) {
        onLogin();
      } else {
        alert("Por favor ingrese usuario y contraseña");
      }
      setIsLoading(false);
    }, 1000);
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
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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

            <Button
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

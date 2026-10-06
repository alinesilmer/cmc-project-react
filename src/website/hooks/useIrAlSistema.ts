import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";
import { destinoDe, irADestino } from "@/app/auth/destino";

/**
 * «Entrar al sistema» desde el sitio público: al login si no hay sesión, y si
 * la hay, a donde le corresponde a ese usuario (panel o legacy, con la misma
 * regla que el login).
 */
export function useIrAlSistema() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const ir = useCallback(() => {
    if (!user) {
      navigate("/panel/login");
      return;
    }
    irADestino(destinoDe(user), navigate);
  }, [user, navigate]);

  return { ir };
}

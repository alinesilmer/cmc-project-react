import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";
import { destinoDe, irADestino } from "@/app/auth/destino";

/**
 * «Entrar al sistema» desde el sitio público: al login si no hay sesión, y si
 * la hay, a donde le corresponde a ese usuario (panel o legacy, con la misma
 * regla que el login). Si el enlace al legacy no se puede pedir, al login.
 */
export function useIrAlSistema() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [yendo, setYendo] = useState(false);

  const ir = useCallback(async () => {
    if (!user) {
      navigate("/panel/login");
      return;
    }
    setYendo(true);
    try {
      await irADestino(destinoDe(user), navigate);
    } catch {
      navigate("/panel/login");
    } finally {
      setYendo(false);
    }
  }, [user, navigate]);

  return { ir, yendo };
}

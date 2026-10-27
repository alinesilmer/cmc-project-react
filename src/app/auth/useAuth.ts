import { createContext, useContext } from "react";
import type { User } from "./api";

export type AuthCtx = {
  user: User | null;
  login: (nroSocio: number, password: string) => Promise<User>;
  logout: () => Promise<void>;
  ready: boolean;
};

export const Ctx = createContext<AuthCtx | undefined>(undefined);
export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};

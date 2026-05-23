"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export type Role = "superadmin" | "admin" | "supervisor" | "viewer";

export interface AuthUser {
  _id: Id<"users">;
  name: string;
  email: string;
  username: string;
  role: Role;
  supervisorId?: Id<"supervisors">;
  isActive: boolean;
  mustChangePassword: boolean;
}

interface AuthCtx {
  token: string | null;
  user: AuthUser | null | undefined; // undefined = loading
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
const TOKEN_KEY = "pe_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY));
    setReady(true);
  }, []);

  const loginMutation = useMutation(api.auth.login);
  const logoutMutation = useMutation(api.auth.logout);

  // me query (skip حتى يجهز التوكن)
  const me = useQuery(api.auth.me, token ? { token } : "skip");
  const user = token ? (me as AuthUser | null | undefined) : null;
  const loading = !ready || (!!token && me === undefined);

  async function login(username: string, password: string) {
    const res = await loginMutation({ username, password });
    if (res.ok) {
      localStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      return { ok: true };
    }
    return { ok: false, error: res.error };
  }

  async function logout() {
    if (token) await logoutMutation({ token }).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }

  return <Ctx.Provider value={{ token, user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

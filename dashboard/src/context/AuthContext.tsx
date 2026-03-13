import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AuthState {
  token: string | null;
  user: { email: string; role: string } | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const token = localStorage.getItem("hd_token");
    if (token) {
      const payload = parseJwt(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        return { token, user: { email: payload.email, role: payload.role } };
      }
      localStorage.removeItem("hd_token");
    }
    return { token: null, user: null };
  });

  useEffect(() => {
    if (auth.token) {
      const payload = parseJwt(auth.token);
      if (payload && payload.exp * 1000 < Date.now()) {
        setAuth({ token: null, user: null });
        localStorage.removeItem("hd_token");
      }
    }
  }, [auth.token]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Login failed");
    }
    const { access_token } = await res.json();
    const payload = parseJwt(access_token);
    localStorage.setItem("hd_token", access_token);
    setAuth({ token: access_token, user: { email: payload.email, role: payload.role } });
  };

  const logout = () => {
    localStorage.removeItem("hd_token");
    setAuth({ token: null, user: null });
  };

  const apiFetch = (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    if (auth.token) {
      headers.set("Authorization", `Bearer ${auth.token}`);
    }
    return fetch(url, { ...options, headers }).then((res) => {
      if (res.status === 401) {
        logout();
      }
      return res;
    });
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

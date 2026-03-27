import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "./msalConfig";

export type AppRole = "admin" | "user";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userName: string | null;
  userEmail: string | null;
  role: AppRole;
  login: () => void;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [role, setRole] = useState<AppRole>("user");
  const [isLoading, setIsLoading] = useState(true);

  const account = accounts[0] || null;

  useEffect(() => {
    // Once MSAL initializes, stop loading
    setIsLoading(false);
  }, [instance]);

  useEffect(() => {
    if (isAuthenticated && account) {
      // Fetch role from backend API
      fetchUserRole();
    }
  }, [isAuthenticated, account]);

  async function fetchUserRole() {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/users/me/role`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRole(data.role || "user");
      }
    } catch {
      // Default to user role if backend unavailable
      setRole("user");
    }
  }

  async function getAccessToken(): Promise<string | null> {
    if (!account) return null;
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      });
      return response.accessToken;
    } catch {
      // If silent fails, try popup
      try {
        const response = await instance.acquireTokenPopup(loginRequest);
        return response.accessToken;
      } catch {
        return null;
      }
    }
  }

  const login = () => {
    instance.loginRedirect(loginRequest);
  };

  const logout = () => {
    instance.logoutRedirect();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userName: account?.name || null,
        userEmail: account?.username || null,
        role,
        login,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

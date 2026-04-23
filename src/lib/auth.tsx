import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "./msalConfig";
import { isDemoMode } from "./demoMode";

export type AppRole = "admin" | "user";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userName: string | null;
  userEmail: string | null;
  role: AppRole;
  isDemoMode: boolean;
  login: () => void;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function isInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (isDemoMode) {
    return <DemoAuthProvider>{children}</DemoAuthProvider>;
  }
  return <RealAuthProvider>{children}</RealAuthProvider>;
}

function DemoAuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: true,
        isLoading: false,
        userName: "Demo Admin",
        userEmail: "demo@example.com",
        role: "admin",
        isDemoMode: true,
        login: () => {},
        logout: () => {},
        getAccessToken: async () => null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function RealAuthProvider({ children }: { children: ReactNode }) {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [role, setRole] = useState<AppRole>("user");
  const [isLoading, setIsLoading] = useState(true);

  const account = accounts[0] || null;

  useEffect(() => {
    setIsLoading(false);
  }, [instance]);

  useEffect(() => {
    if (isAuthenticated && account) {
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
      setRole("user");
    }
  }

  async function getAccessToken(): Promise<string | null> {
    if (!account) return null;
    try {
      const response = await instance.acquireTokenSilent({ ...loginRequest, account });
      return response.accessToken;
    } catch {
      try {
        const response = await instance.acquireTokenPopup(loginRequest);
        return response.accessToken;
      } catch {
        return null;
      }
    }
  }

  const login = () => {
    // Inside an iframe (e.g., Lovable preview), redirect login fails.
    // Fall back to popup.
    if (isInIframe()) {
      instance.loginPopup(loginRequest).catch(() => {});
    } else {
      instance.loginRedirect(loginRequest);
    }
  };

  const logout = () => {
    if (isInIframe()) {
      instance.logoutPopup().catch(() => {});
    } else {
      instance.logoutRedirect();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userName: account?.name || null,
        userEmail: account?.username || null,
        role,
        isDemoMode: false,
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

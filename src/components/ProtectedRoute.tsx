import { ReactNode } from "react";
import { useAuth, AppRole } from "@/lib/auth";
import AppLayout from "./AppLayout";
import { Button } from "./ui/button";
import { ShieldAlert, LogIn } from "lucide-react";

interface Props {
  children: ReactNode;
  requiredRole?: AppRole;
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { isAuthenticated, isLoading, role, login } = useAuth();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-sm space-y-6 pt-20 text-center">
          <LogIn className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Sign In Required</h1>
          <p className="text-sm text-muted-foreground">
            Please sign in with your Microsoft account to continue.
          </p>
          <Button onClick={login} className="w-full">
            Sign in with Microsoft
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (requiredRole === "admin" && role !== "admin") {
    return (
      <AppLayout>
        <div className="mx-auto max-w-sm space-y-4 pt-20 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            You need admin privileges to access this page.
          </p>
        </div>
      </AppLayout>
    );
  }

  return <>{children}</>;
}

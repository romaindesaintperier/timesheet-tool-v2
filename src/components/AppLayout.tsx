import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Clock, LayoutDashboard, Settings, FileText, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "./ui/button";

const NAV_ITEMS = [
  { to: "/", label: "Timesheet", icon: Clock, role: null },
  { to: "/admin", label: "Admin", icon: Settings, role: "admin" as const },
  { to: "/reports", label: "Reports", icon: FileText, role: "admin" as const },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const auth = (() => {
    try {
      return useAuth();
    } catch {
      return null;
    }
  })();

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.role || (auth && auth.role === item.role)
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-6 w-6 text-primary-foreground" />
            <span className="text-lg font-semibold tracking-tight text-primary-foreground">
              Capstone Timesheet
            </span>
            {auth?.isDemoMode && (
              <span className="rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary-foreground">
                Demo Mode — sample data
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <nav className="flex items-center gap-1">
              {visibleNav.map(({ to, label, icon: Icon }) => {
                const active = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-sidebar-accent text-primary-foreground"
                        : "text-primary-foreground/70 hover:bg-sidebar-accent/50 hover:text-primary-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
            {auth?.isAuthenticated && (
              <div className="ml-3 flex items-center gap-2 border-l border-primary-foreground/20 pl-3">
                <span className="text-xs text-primary-foreground/70">{auth.userName || auth.userEmail}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={auth.logout}
                  className="h-7 gap-1 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-sidebar-accent/50"
                >
                  <LogOut className="h-3 w-3" /> Sign out
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}

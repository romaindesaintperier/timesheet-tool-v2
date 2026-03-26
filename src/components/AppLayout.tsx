import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Clock, LayoutDashboard, Settings, FileText } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Timesheet", icon: Clock },
  { to: "/admin", label: "Admin", icon: Settings },
  { to: "/reports", label: "Reports", icon: FileText },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-6 w-6 text-primary-foreground" />
            <span className="text-lg font-semibold tracking-tight text-primary-foreground">
              Capstone Timesheet
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
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
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}

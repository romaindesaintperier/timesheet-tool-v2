import { useState, useEffect, useMemo, useCallback } from "react";
import { Employee, WeeklySubmission, rowTotal } from "@/lib/types";
import { fetchEmployees, fetchSubmissions } from "@/lib/api";
import { Search, User, Loader2, Star, History, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  getFavoriteEmployeeIds,
  toggleFavoriteEmployee,
  formatWorkweekLabel,
} from "@/lib/store";
import { cn } from "@/lib/utils";

interface Props {
  onSelect: (employee: Employee, submission?: WeeklySubmission) => void;
  selected?: Employee | null;
  /** Bumping this value forces a fresh employee fetch + state reset. */
  refreshKey?: number;
}

export default function EmployeeSelect({ onSelect, selected, refreshKey = 0 }: Props) {
  const auth = (() => {
    try {
      return useAuth();
    } catch {
      return null;
    }
  })();
  const userKey = auth?.userEmail || auth?.userName || "anon";

  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>(() => getFavoriteEmployeeIds(userKey));

  // Per-employee history loaded after picking an employee
  const [historyEmpId, setHistoryEmpId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<WeeklySubmission[]>([]);

  useEffect(() => {
    setLoading(true);
    fetchEmployees()
      // Inactive employees disappear completely
      .then((data) => setEmployees(data.filter((e) => e.active)))
      .catch(() => toast.error("Failed to load employees"))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  useEffect(() => {
    setFavorites(getFavoriteEmployeeIds(userKey));
  }, [userKey, refreshKey]);

  const handleToggleFavorite = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const next = toggleFavoriteEmployee(id, userKey);
      setFavorites(next);
    },
    [userKey]
  );

  const filtered = useMemo(
    () =>
      query.trim()
        ? employees.filter((e) =>
            e.name.toLowerCase().includes(query.toLowerCase())
          )
        : employees,
    [query, employees]
  );

  const favEmployees = useMemo(
    () =>
      filtered
        .filter((e) => favorites.includes(e.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [filtered, favorites]
  );

  const otherEmployees = useMemo(
    () =>
      filtered
        .filter((e) => !favorites.includes(e.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [filtered, favorites]
  );

  // Load history when an employee is picked from the list (before final selection)
  const openHistoryFor = useCallback((emp: Employee) => {
    setHistoryEmpId(emp.id);
    setHistoryLoading(true);
    fetchSubmissions()
      .then((all) => {
        const mine = all
          .filter((s) => s.employeeId === emp.id)
          .sort((a, b) => (a.weekEnding < b.weekEnding ? 1 : -1));
        setHistory(mine);
      })
      .catch(() => {
        setHistory([]);
        toast.error("Failed to load submission history");
      })
      .finally(() => setHistoryLoading(false));
  }, []);

  const historyEmployee = useMemo(
    () => employees.find((e) => e.id === historyEmpId) || null,
    [employees, historyEmpId]
  );

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
          <User className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{selected.name}</p>
          <p className="text-xs text-muted-foreground">Home: {selected.homeState}</p>
        </div>
        <button
          onClick={() => onSelect(null as any)}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Change
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Step 2: history picker after employee chosen
  if (historyEmployee) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
            <User className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{historyEmployee.name}</p>
            <p className="text-xs text-muted-foreground">Home: {historyEmployee.homeState}</p>
          </div>
          <button
            onClick={() => {
              setHistoryEmpId(null);
              setHistory([]);
            }}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Back
          </button>
        </div>

        <button
          onClick={() => onSelect(historyEmployee)}
          className="flex w-full items-center justify-between rounded-lg border border-primary bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">Start current week</p>
            <p className="text-xs text-muted-foreground">
              Begin a new submission for the current workweek
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            Past submissions
          </div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              No past submissions yet.
            </p>
          ) : (
            <div className="grid gap-2">
              {history.map((sub) => {
                const totalHours = sub.rows.reduce((sum, r) => sum + rowTotal(r), 0);
                return (
                  <button
                    key={sub.id}
                    onClick={() => onSelect(historyEmployee, sub)}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {formatWorkweekLabel(sub.weekEnding)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sub.rows.length} {sub.rows.length === 1 ? "entry" : "entries"} · {totalHours} hours
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderEmpRow = (emp: Employee) => {
    const isFav = favorites.includes(emp.id);
    return (
      <div
        key={emp.id}
        role="button"
        tabIndex={0}
        onClick={() => openHistoryFor(emp)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openHistoryFor(emp);
          }
        }}
        className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <User className="h-4 w-4 text-secondary-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{emp.name}</p>
          <p className="text-xs text-muted-foreground">{emp.homeState}</p>
        </div>
        <button
          type="button"
          onClick={(e) => handleToggleFavorite(emp.id, e)}
          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            isFav
              ? "text-warning hover:bg-warning/10"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Star className={cn("h-4 w-4", isFav && "fill-current")} />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search employee name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
          autoFocus
        />
      </div>

      {favEmployees.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-current text-warning" />
            Favorites
          </div>
          <div className="grid gap-2">{favEmployees.map(renderEmpRow)}</div>
        </div>
      )}

      <div className="space-y-2">
        {favEmployees.length > 0 && (
          <div className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            All employees
          </div>
        )}
        <div className="grid gap-2">
          {otherEmployees.map(renderEmpRow)}
          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No employees match "{query}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

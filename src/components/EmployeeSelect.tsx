import { useState, useMemo } from "react";
import { Employee } from "@/lib/types";
import { getEmployees } from "@/lib/store";
import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  onSelect: (employee: Employee) => void;
  selected?: Employee | null;
}

export default function EmployeeSelect({ onSelect, selected }: Props) {
  const [query, setQuery] = useState("");
  const employees = useMemo(() => getEmployees().filter((e) => e.active), []);

  const filtered = useMemo(
    () =>
      query.trim()
        ? employees.filter((e) =>
            e.name.toLowerCase().includes(query.toLowerCase())
          )
        : employees,
    [query, employees]
  );

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
          <User className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{selected.name}</p>
          <p className="text-xs text-muted-foreground">
            Rate: ${selected.rate}/hr · Home: {selected.homeState}
          </p>
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

  return (
    <div className="space-y-3">
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
      <div className="grid gap-2">
        {filtered.map((emp) => (
          <button
            key={emp.id}
            onClick={() => onSelect(emp)}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
              <User className="h-4 w-4 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{emp.name}</p>
              <p className="text-xs text-muted-foreground">${emp.rate}/hr · {emp.homeState}</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No employees match "{query}"
          </p>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo } from "react";
import { Employee, Category, SubmissionRow, CATEGORY_LABELS, CodeEntry, WeeklySubmission } from "@/lib/types";
import {
  getCurrentWeekEnding,
  getPreviousWeekEnding,
  getWeekEndingForDate,
  getMondayOfWeek,
  getFridayOfWeek,
  formatWorkweekLabel,
} from "@/lib/store";
import { fetchCodes, fetchLocations, fetchSubmissions, upsertSubmission } from "@/lib/api";
import { Plus, Trash2, CheckCircle, Search, Check, ChevronsUpDown, Loader2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  employee: Employee;
  /** Optional pre-loaded submission to edit. */
  existingSubmission?: WeeklySubmission;
  /** Called after a successful NEW submission, ~1.5s delay. */
  onNewSubmissionComplete?: () => void;
}

const CATEGORIES: Category[] = [
  "due_diligence",
  "portfolio_engagements",
  "functional_coes",
  "other",
];

function makeRow(category: Category, defaultLocation: string = ""): SubmissionRow {
  return {
    id: crypto.randomUUID(),
    category,
    codeId: "",
    hours: 0,
    location: defaultLocation,
  };
}

function CodeSearchSelect({
  codes,
  value,
  onChange,
}: {
  codes: CodeEntry[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      search.trim()
        ? codes.filter(
            (c) =>
              c.label.toLowerCase().includes(search.toLowerCase()) ||
              c.code.toLowerCase().includes(search.toLowerCase())
          )
        : codes,
    [search, codes]
  );

  const selected = codes.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selected ? `${selected.label} (${selected.code})` : "Select code..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <div className="flex items-center border-b border-border px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            placeholder="Search codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No codes found.
            </p>
          )}
          {filtered.map((code) => (
            <button
              key={code.id}
              onClick={() => {
                onChange(code.id);
                setOpen(false);
                setSearch("");
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                value === code.id && "bg-accent"
              )}
            >
              <Check
                className={cn(
                  "h-4 w-4 shrink-0",
                  value === code.id ? "opacity-100" : "opacity-0"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{code.label}</p>
                <p className="text-xs text-muted-foreground">{code.code}</p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function TimesheetForm({ employee, existingSubmission, onNewSubmissionComplete }: Props) {
  // Active week — defaults to existing submission's week or current week
  const [weekEnding, setWeekEnding] = useState<string>(
    existingSubmission?.weekEnding || getCurrentWeekEnding()
  );
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);

  const [locations, setLocations] = useState<string[]>([]);
  const [allCodes, setAllCodes] = useState<CodeEntry[]>([]);
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [submitted, setSubmitted] = useState(false);
  /** True when the active submitted result was a brand-new (not edited) one. */
  const [wasNewSubmission, setWasNewSubmission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /** Tracks whether the currently loaded week already has an existing submission. */
  const [editingExisting, setEditingExisting] = useState<boolean>(!!existingSubmission);

  useEffect(() => {
    Promise.all([
      fetchCodes().then((codes) => setAllCodes(codes.filter((c) => c.active))),
      fetchLocations().then(setLocations),
    ])
      .catch(() => toast.error("Failed to load form data"))
      .finally(() => setLoading(false));
  }, []);

  // Reset week + edit-state whenever a new employee is selected
  useEffect(() => {
    setWeekEnding(existingSubmission?.weekEnding || getCurrentWeekEnding());
    setEditingExisting(!!existingSubmission);
    setSubmitted(false);
    setWasNewSubmission(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  // Load rows for the active week: existing submission → prefill from prev → blank
  useEffect(() => {
    if (loading) return;

    // If parent passed an existing submission AND we're still on its week, use it directly.
    if (existingSubmission && existingSubmission.weekEnding === weekEnding && existingSubmission.employeeId === employee.id) {
      setRows(existingSubmission.rows.map((r) => ({ ...r, id: crypto.randomUUID() })));
      setEditingExisting(true);
      setSubmitted(false);
      return;
    }

    setLoadingWeek(true);
    const prevWeek = getPreviousWeekEnding(weekEnding);
    // Fetch a window covering both the active week and the prior week
    fetchSubmissions({ dateFrom: prevWeek, dateTo: weekEnding })
      .then((subs) => {
        const current = subs.find(
          (s) => s.employeeId === employee.id && s.weekEnding === weekEnding
        );
        if (current) {
          setRows(current.rows.map((r) => ({ ...r, id: crypto.randomUUID() })));
          setEditingExisting(true);
          return;
        }
        const prev = subs.find(
          (s) => s.employeeId === employee.id && s.weekEnding === prevWeek
        );
        if (prev) {
          setRows(prev.rows.map((r) => ({ ...r, id: crypto.randomUUID() })));
        } else {
          setRows(CATEGORIES.map((cat) => makeRow(cat, employee.homeState)));
        }
        setEditingExisting(false);
      })
      .catch(() => {
        setRows(CATEGORIES.map((cat) => makeRow(cat, employee.homeState)));
        setEditingExisting(false);
      })
      .finally(() => {
        setLoadingWeek(false);
        setSubmitted(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, weekEnding, loading]);

  const updateRow = useCallback(
    (id: string, field: keyof SubmissionRow, value: string | number) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
    },
    []
  );

  const addRow = (category: Category) => {
    setRows((prev) => [...prev, makeRow(category, employee.homeState)]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const totalHours = rows.reduce((sum, r) => sum + (r.hours || 0), 0);

  const monday = useMemo(() => getMondayOfWeek(weekEnding), [weekEnding]);
  const friday = useMemo(() => getFridayOfWeek(weekEnding), [weekEnding]);
  const weekLabel = useMemo(() => formatWorkweekLabel(weekEnding), [weekEnding]);

  const handleSubmit = async () => {
    const incomplete = rows.filter(
      (r) => r.hours > 0 && (!r.codeId || !r.location)
    );
    if (incomplete.length > 0) {
      toast.error("Please fill in code and location for all rows with hours.");
      return;
    }
    const filledRows = rows.filter((r) => r.hours > 0);
    if (filledRows.length === 0) {
      toast.error("Please enter at least one row with hours.");
      return;
    }
    setSubmitting(true);
    const isNew = !editingExisting;
    try {
      await upsertSubmission({
        id: crypto.randomUUID(),
        employeeId: employee.id,
        weekEnding,
        rows: filledRows,
        submittedAt: new Date().toISOString(),
        status: "submitted",
      });
      setWasNewSubmission(isNew);
      setSubmitted(true);
      setEditingExisting(true); // future saves on this week are edits
      toast.success(isNew ? "Timesheet submitted successfully!" : "Timesheet updated.");

      // For NEW submissions only: auto-return to employee selection after ~1.5s
      if (isNew && onNewSubmissionComplete) {
        setTimeout(() => {
          onNewSubmissionComplete();
        }, 1500);
      }
    } catch {
      toast.error("Failed to submit timesheet. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <CheckCircle className="h-16 w-16 text-success" />
        <h2 className="text-xl font-semibold text-foreground">
          {wasNewSubmission ? "Timesheet Submitted" : "Timesheet Updated"}
        </h2>
        <p className="text-muted-foreground">
          {weekLabel} · {totalHours} hours total
        </p>
        {wasNewSubmission ? (
          <p className="text-xs text-muted-foreground">Returning to employee list…</p>
        ) : (
          <Button variant="outline" onClick={() => setSubmitted(false)}>
            Continue editing
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Popover open={weekPickerOpen} onOpenChange={setWeekPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="font-medium">{weekLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={monday}
                  onSelect={(date) => {
                    if (!date) return;
                    setWeekEnding(getWeekEndingForDate(date));
                    setWeekPickerOpen(false);
                  }}
                  // Disallow future weeks (only current + past are selectable)
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {editingExisting && (
              <span className="rounded-full border border-border bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Editing
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Workweek Mon {monday.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –
            {" "}Fri {friday.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            {" · "}
            {rows.filter((r) => r.hours > 0).length} entries · {totalHours} hours
            {totalHours !== 50 && (
              <span className="ml-2 text-warning">(target: 50h)</span>
            )}
          </p>
        </div>
        <Button onClick={handleSubmit} className="gap-2" disabled={submitting || loadingWeek}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          {editingExisting ? "Update" : "Submit"}
        </Button>
      </div>

      {loadingWeek ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        CATEGORIES.map((cat) => {
          const catRows = rows.filter((r) => r.category === cat);
          return (
            <div key={cat} className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {CATEGORY_LABELS[cat]}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => addRow(cat)} className="gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Add Row
                </Button>
              </div>
              <div className="divide-y divide-border">
                {catRows.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No entries.{" "}
                    <button onClick={() => addRow(cat)} className="text-primary underline">
                      Add one
                    </button>
                  </p>
                )}
                {catRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr_100px_140px_40px] items-center gap-3 px-4 py-3">
                    <CodeSearchSelect
                      codes={allCodes}
                      value={row.codeId}
                      onChange={(v) => updateRow(row.id, "codeId", v)}
                    />
                    <Input
                      type="number"
                      min={0}
                      max={80}
                      placeholder="Hours"
                      value={row.hours || ""}
                      onChange={(e) => updateRow(row.id, "hours", parseFloat(e.target.value) || 0)}
                    />
                    <Select value={row.location} onValueChange={(v) => updateRow(row.id, "location", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => removeRow(row.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

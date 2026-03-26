import { useState, useEffect, useCallback } from "react";
import { Employee, Category, SubmissionRow, CATEGORY_LABELS } from "@/lib/types";
import {
  getCurrentWeekEnding,
  getLastSubmission,
  getCodesForCategory,
  getLocations,
  addSubmission,
} from "@/lib/store";
import { Plus, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  employee: Employee;
}

const CATEGORIES: Category[] = [
  "due_diligence",
  "portfolio_engagements",
  "functional_coes",
  "other",
];

function makeRow(category: Category): SubmissionRow {
  return {
    id: crypto.randomUUID(),
    category,
    codeId: "",
    hours: 0,
    location: "",
  };
}

export default function TimesheetForm({ employee }: Props) {
  const weekEnding = getCurrentWeekEnding();
  const locations = getLocations();
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const prev = getLastSubmission(employee.id, weekEnding);
    if (prev) {
      // Prefill from last week, reset IDs
      setRows(
        prev.rows.map((r) => ({ ...r, id: crypto.randomUUID() }))
      );
    } else {
      // Start with one empty row per category
      setRows(CATEGORIES.map((cat) => makeRow(cat)));
    }
    setSubmitted(false);
  }, [employee.id, weekEnding]);

  const updateRow = useCallback(
    (id: string, field: keyof SubmissionRow, value: string | number) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
    },
    []
  );

  const addRow = (category: Category) => {
    setRows((prev) => [...prev, makeRow(category)]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const totalHours = rows.reduce((sum, r) => sum + (r.hours || 0), 0);

  const handleSubmit = () => {
    // Validate: every row with hours must have code and location
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

    addSubmission({
      id: crypto.randomUUID(),
      employeeId: employee.id,
      weekEnding,
      rows: filledRows,
      submittedAt: new Date().toISOString(),
      status: "submitted",
    });
    setSubmitted(true);
    toast.success("Timesheet submitted successfully!");
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <CheckCircle className="h-16 w-16 text-success" />
        <h2 className="text-xl font-semibold text-foreground">
          Timesheet Submitted
        </h2>
        <p className="text-muted-foreground">
          Week ending {weekEnding} · {totalHours} hours total
        </p>
        <Button variant="outline" onClick={() => setSubmitted(false)}>
          Edit Submission
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Week Ending {weekEnding}
          </h2>
          <p className="text-sm text-muted-foreground">
            {rows.filter((r) => r.hours > 0).length} entries · {totalHours} hours total
            {totalHours !== 50 && (
              <span className="ml-2 text-warning">(target: 50h)</span>
            )}
          </p>
        </div>
        <Button onClick={handleSubmit} className="gap-2">
          <CheckCircle className="h-4 w-4" />
          Submit
        </Button>
      </div>

      {CATEGORIES.map((cat) => {
        const catRows = rows.filter((r) => r.category === cat);
        const codes = getCodesForCategory(cat);

        return (
          <div key={cat} className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">
                {CATEGORY_LABELS[cat]}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addRow(cat)}
                className="gap-1 text-xs"
              >
                <Plus className="h-3 w-3" /> Add Row
              </Button>
            </div>
            <div className="divide-y divide-border">
              {catRows.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No entries.{" "}
                  <button
                    onClick={() => addRow(cat)}
                    className="text-primary underline"
                  >
                    Add one
                  </button>
                </p>
              )}
              {catRows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[1fr_100px_140px_40px] items-center gap-3 px-4 py-3"
                >
                  <Select
                    value={row.codeId}
                    onValueChange={(v) => updateRow(row.id, "codeId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select code..." />
                    </SelectTrigger>
                    <SelectContent>
                      {codes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    min={0}
                    max={80}
                    placeholder="Hours"
                    value={row.hours || ""}
                    onChange={(e) =>
                      updateRow(row.id, "hours", parseFloat(e.target.value) || 0)
                    }
                  />

                  <Select
                    value={row.location}
                    onValueChange={(v) => updateRow(row.id, "location", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
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
      })}
    </div>
  );
}

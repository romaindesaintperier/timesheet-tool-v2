import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import EmployeeSelect from "@/components/EmployeeSelect";
import TimesheetForm from "@/components/TimesheetForm";
import { Employee, WeeklySubmission } from "@/lib/types";
import { fetchEmployees, fetchSubmissions } from "@/lib/api";
import { toast } from "sonner";

export default function Index() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<WeeklySubmission | undefined>(undefined);
  // Bumping this resets EmployeeSelect state (refetch list, clear local UI state)
  const [refreshKey, setRefreshKey] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  // When Admin → Submissions sends us here with ?edit=<id>, preload that
  // submission into the existing TimesheetForm. No new editor is created;
  // we just hand the existing form its `existingSubmission` prop.
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    Promise.all([fetchSubmissions(), fetchEmployees()])
      .then(([subs, emps]) => {
        if (cancelled) return;
        const sub = subs.find((s) => s.id === editId);
        if (!sub) {
          toast.error("Submission not found.");
          // Strip the query param so we don't keep re-trying.
          setSearchParams({}, { replace: true });
          return;
        }
        const emp = emps.find((e) => e.id === sub.employeeId);
        if (!emp) {
          toast.error("Employee for this submission not found.");
          setSearchParams({}, { replace: true });
          return;
        }
        setEmployee(emp);
        setExistingSubmission(sub);
        // Clear param so a manual "Change" reset doesn't immediately reload it.
        setSearchParams({}, { replace: true });
      })
      .catch(() => toast.error("Failed to load submission for editing."));
    return () => {
      cancelled = true;
    };
  }, [editId, setSearchParams]);

  const handleSelect = useCallback((emp: Employee | null, sub?: WeeklySubmission) => {
    setEmployee(emp);
    setExistingSubmission(sub);
  }, []);

  const handleNewSubmissionComplete = useCallback(() => {
    setEmployee(null);
    setExistingSubmission(undefined);
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Weekly Timesheet
          </h1>
          <p className="text-sm text-muted-foreground">
            Select an employee to start a new week or edit a past submission.
          </p>
        </div>

        <EmployeeSelect
          selected={employee}
          onSelect={handleSelect}
          refreshKey={refreshKey}
        />

        {employee && (
          <TimesheetForm
            // Force a fresh form mount when switching between current/past week selections
            key={`${employee.id}:${existingSubmission?.id ?? "new"}`}
            employee={employee}
            existingSubmission={existingSubmission}
            onNewSubmissionComplete={handleNewSubmissionComplete}
          />
        )}
      </div>
    </AppLayout>
  );
}

import { useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import EmployeeSelect from "@/components/EmployeeSelect";
import TimesheetForm from "@/components/TimesheetForm";
import { Employee, WeeklySubmission } from "@/lib/types";

export default function Index() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<WeeklySubmission | undefined>(undefined);
  // Bumping this resets EmployeeSelect state (refetch list, clear local UI state)
  const [refreshKey, setRefreshKey] = useState(0);

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

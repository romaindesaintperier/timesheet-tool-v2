import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import EmployeeSelect from "@/components/EmployeeSelect";
import TimesheetForm from "@/components/TimesheetForm";
import { Employee } from "@/lib/types";

export default function Index() {
  const [employee, setEmployee] = useState<Employee | null>(null);

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Weekly Timesheet
          </h1>
          <p className="text-sm text-muted-foreground">
            Select an employee to start or continue a weekly submission.
          </p>
        </div>

        <EmployeeSelect
          selected={employee}
          onSelect={(emp) => setEmployee(emp)}
        />

        {employee && <TimesheetForm employee={employee} />}
      </div>
    </AppLayout>
  );
}

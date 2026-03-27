import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSubmissions, getEmployees, getCodes } from "@/lib/store";
import { CATEGORY_LABELS } from "@/lib/types";
import { Download } from "lucide-react";

function exportCSV(headers: string[], rows: string[][], filename: string) {
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const submissions = useMemo(() => {
    const all = getSubmissions();
    return all.filter((s) => {
      if (dateFrom && s.weekEnding < dateFrom) return false;
      if (dateTo && s.weekEnding > dateTo) return false;
      return true;
    });
  }, [dateFrom, dateTo]);

  const employees = getEmployees();
  const codes = getCodes();

  // Project hours report
  const projectHoursData = useMemo(() => {
    const map = new Map<string, { code: string; label: string; category: string; totalHours: number; entries: { employee: string; hours: number; location: string }[] }>();
    for (const sub of submissions) {
      const emp = employees.find((e) => e.id === sub.employeeId);
      for (const row of sub.rows) {
        const code = codes.find((c) => c.id === row.codeId);
        const key = row.codeId;
        if (!map.has(key)) {
          map.set(key, {
            code: code?.code || "?",
            label: code?.label || "Unknown",
            category: code ? CATEGORY_LABELS[code.category] : "?",
            totalHours: 0,
            entries: [],
          });
        }
        const entry = map.get(key)!;
        entry.totalHours += row.hours;
        entry.entries.push({
          employee: emp?.name || "Unknown",
          hours: row.hours,
          location: row.location,
        });
      }
    }
    return Array.from(map.values());
  }, [submissions, employees, codes]);

  // Payroll state report
  const payrollData = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const sub of submissions) {
      const emp = employees.find((e) => e.id === sub.employeeId);
      const empName = emp?.name || "Unknown";
      if (!map.has(empName)) map.set(empName, new Map());
      const stateMap = map.get(empName)!;
      const totalHours = sub.rows.reduce((s, r) => s + r.hours, 0);
      for (const row of sub.rows) {
        const loc = row.location || emp?.homeState || "?";
        stateMap.set(loc, (stateMap.get(loc) || 0) + row.hours);
      }
    }
    const result: { employee: string; state: string; hours: number; pct: string }[] = [];
    for (const [employee, stateMap] of map) {
      const total = Array.from(stateMap.values()).reduce((a, b) => a + b, 0);
      for (const [state, hours] of stateMap) {
        result.push({
          employee,
          state,
          hours,
          pct: total > 0 ? ((hours / total) * 100).toFixed(1) + "%" : "0%",
        });
      }
    }
    return result;
  }, [submissions, employees]);

  // Total cost report
  const costData = useMemo(() => {
    const map = new Map<string, { code: string; label: string; employees: Map<string, { name: string; hours: number; rate: number }> }>();
    for (const sub of submissions) {
      const emp = employees.find((e) => e.id === sub.employeeId);
      for (const row of sub.rows) {
        const code = codes.find((c) => c.id === row.codeId);
        const key = row.codeId;
        if (!map.has(key)) {
          map.set(key, { code: code?.code || "?", label: code?.label || "Unknown", employees: new Map() });
        }
        const entry = map.get(key)!;
        const empKey = sub.employeeId;
        if (!entry.employees.has(empKey)) {
          entry.employees.set(empKey, { name: emp?.name || "Unknown", hours: 0, rate: emp?.rate || 0 });
        }
        entry.employees.get(empKey)!.hours += row.hours;
      }
    }
    return Array.from(map.values()).map((item) => {
      const empRows = Array.from(item.employees.values());
      const totalHours = empRows.reduce((s, e) => s + e.hours, 0);
      const totalCost = empRows.reduce((s, e) => s + e.hours * e.rate, 0);
      return { ...item, empRows, totalHours, totalCost };
    });
  }, [submissions, employees, codes]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Reports
        </h1>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {submissions.length} submission(s)
          </span>
        </div>

        <Tabs defaultValue="project-hours">
          <TabsList>
            <TabsTrigger value="project-hours">Code Reporting</TabsTrigger>
            <TabsTrigger value="payroll-state">State Reporting</TabsTrigger>
            <TabsTrigger value="total-cost">Cost Reporting</TabsTrigger>
          </TabsList>

          <TabsContent value="project-hours" className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  exportCSV(
                    ["Code", "Label", "Category", "Total Hours"],
                    projectHoursData.map((d) => [d.code, d.label, d.category, d.totalHours.toString()]),
                    "project-hours.csv"
                  )
                }
              >
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
            {projectHoursData.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No data for selected range.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Total Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectHoursData.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{d.code}</TableCell>
                      <TableCell className="font-medium">{d.label}</TableCell>
                      <TableCell>{d.category}</TableCell>
                      <TableCell>{d.totalHours}h</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="payroll-state" className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  exportCSV(
                    ["Employee", "State", "Hours", "% of Time"],
                    payrollData.map((d) => [d.employee, d.state, d.hours.toString(), d.pct]),
                    "payroll-state.csv"
                  )
                }
              >
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
            {payrollData.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No data for selected range.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>% of Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollData.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{d.employee}</TableCell>
                      <TableCell>{d.state}</TableCell>
                      <TableCell>{d.hours}h</TableCell>
                      <TableCell>{d.pct}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="total-cost" className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  exportCSV(
                    ["Code", "Label", "Employee", "Hours", "Rate", "Cost"],
                    costData.flatMap((d) =>
                      d.empRows.map((e) => [d.code, d.label, e.name, e.hours.toString(), `$${e.rate}`, `$${e.hours * e.rate}`])
                    ),
                    "total-cost.csv"
                  )
                }
              >
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
            {costData.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No data for selected range.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costData.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{d.code}</TableCell>
                      <TableCell className="font-medium">{d.label}</TableCell>
                      <TableCell>{d.totalHours}h</TableCell>
                      <TableCell>${d.totalCost.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

import { useState, useMemo } from "react";
import { format, parse } from "date-fns";

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
import * as XLSX from "xlsx";

function exportExcel(headers: string[], rows: string[][], filename: string) {
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename);
}


export default function Reports() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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

  // Code reporting: build monthly breakdown per code per employee
  const codeReportData = useMemo(() => {
    // Collect all months present
    const monthSet = new Set<string>();
    // Map: codeId -> empId -> month -> hours
    const dataMap = new Map<string, Map<string, Map<string, number>>>();

    for (const sub of submissions) {
      const emp = employees.find((e) => e.id === sub.employeeId);
      const weekDate = new Date(sub.weekEnding + "T00:00:00");
      const monthKey = format(weekDate, "yyyy-MM");

      for (const row of sub.rows) {
        monthSet.add(monthKey);
        if (!dataMap.has(row.codeId)) dataMap.set(row.codeId, new Map());
        const empMap = dataMap.get(row.codeId)!;
        if (!empMap.has(sub.employeeId)) empMap.set(sub.employeeId, new Map());
        const mMap = empMap.get(sub.employeeId)!;
        mMap.set(monthKey, (mMap.get(monthKey) || 0) + row.hours);
      }
    }

    const months = Array.from(monthSet).sort();

    type CodeRow = {
      code: string;
      label: string;
      employee: string;
      rate: number;
      monthlyHours: Record<string, number>;
      totalHours: number;
      totalCost: number;
    };

    const rows: CodeRow[] = [];

    for (const [codeId, empMap] of dataMap) {
      const code = codes.find((c) => c.id === codeId);
      for (const [empId, mMap] of empMap) {
        const emp = employees.find((e) => e.id === empId);
        const monthlyHours: Record<string, number> = {};
        let totalHours = 0;
        for (const m of months) {
          const h = mMap.get(m) || 0;
          monthlyHours[m] = h;
          totalHours += h;
        }
        const rate = emp?.rate || 0;
        rows.push({
          code: code?.code || "?",
          label: code?.label || "Unknown",
          employee: emp?.name || "Unknown",
          rate,
          monthlyHours,
          totalHours,
          totalCost: totalHours * rate,
        });
      }
    }

    // Sort by code then employee
    rows.sort((a, b) => a.code.localeCompare(b.code) || a.employee.localeCompare(b.employee));

    return { months, rows };
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
                onClick={() => {
                  const { months, rows } = codeReportData;
                  const headers = ["Code", "Label", "Employee", "Rate"];
                  for (const m of months) {
                    const label = format(parse(m, "yyyy-MM", new Date()), "MMM yyyy");
                    headers.push(`${label} Hours`, `${label} Cost`);
                  }
                  headers.push("Total Hours", "Total Cost");
                  const dataRows = rows.map((r) => {
                    const row = [r.code, r.label, r.employee, `$${r.rate}`];
                    for (const m of months) {
                      const h = r.monthlyHours[m] || 0;
                      row.push(h.toString(), `$${(h * r.rate).toLocaleString()}`);
                    }
                    row.push(r.totalHours.toString(), `$${r.totalCost.toLocaleString()}`);
                    return row;
                  });
                  exportExcel(headers, dataRows, "code-reporting.xlsx");
                }}
              >
                <Download className="h-4 w-4" /> Export Excel
              </Button>
            </div>
            {codeReportData.rows.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No data for selected range.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background">Code</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Rate</TableHead>
                      {codeReportData.months.map((m) => {
                        const label = format(parse(m, "yyyy-MM", new Date()), "MMM yyyy");
                        return [
                          <TableHead key={`${m}-h`} className="text-center">{label} Hrs</TableHead>,
                          <TableHead key={`${m}-c`} className="text-center">{label} Cost</TableHead>,
                        ];
                      })}
                      <TableHead className="text-center font-bold">Total Hours</TableHead>
                      <TableHead className="text-center font-bold">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codeReportData.rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="sticky left-0 bg-background font-mono text-xs">
                          <div>{r.code}</div>
                          <div className="text-muted-foreground text-[10px]">{r.label}</div>
                        </TableCell>
                        <TableCell className="font-medium">{r.employee}</TableCell>
                        <TableCell>${r.rate}</TableCell>
                        {codeReportData.months.map((m) => {
                          const h = r.monthlyHours[m] || 0;
                          return [
                            <TableCell key={`${m}-h`} className="text-center">{h}h</TableCell>,
                            <TableCell key={`${m}-c`} className="text-center">${(h * r.rate).toLocaleString()}</TableCell>,
                          ];
                        })}
                        <TableCell className="text-center font-semibold">{r.totalHours}h</TableCell>
                        <TableCell className="text-center font-semibold">${r.totalCost.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payroll-state" className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  exportExcel(
                    ["Employee", "State", "Hours", "% of Time"],
                    payrollData.map((d) => [d.employee, d.state, d.hours.toString(), d.pct]),
                    "state-reporting.xlsx"
                  )
                }
              >
                <Download className="h-4 w-4" /> Export Excel
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
                  exportExcel(
                    ["Code", "Label", "Employee", "Hours", "Rate", "Cost"],
                    costData.flatMap((d) =>
                      d.empRows.map((e) => [d.code, d.label, e.name, e.hours.toString(), `$${e.rate}`, `$${e.hours * e.rate}`])
                    ),
                    "cost-reporting.xlsx"
                  )
                }
              >
                <Download className="h-4 w-4" /> Export Excel
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

import { useState, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchSubmissions, fetchEmployees, fetchCodes } from "@/lib/api";
import { Employee, CodeEntry, WeeklySubmission, DAYS, DAY_LABELS, DayKey, rowTotal, dayTotal, byId } from "@/lib/types";
import { Download, Loader2, History } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

/** Round a number to 2 decimals to avoid 8.249999 noise in displayed/exported totals. */
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Format a fraction as a 1-decimal percent string (e.g. "37.5%"). Safe when total is 0. */
const pct = (part: number, total: number) =>
  total > 0 ? ((part / total) * 100).toFixed(1) + "%" : "0%";

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
  const [submissions, setSubmissions] = useState<WeeklySubmission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [codes, setCodes] = useState<CodeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  /** Currently selected code for the Code Detail report. */
  const [selectedCodeId, setSelectedCodeId] = useState<string>("");

  const clearDateFilters = () => {
    setDateFrom("");
    setDateTo("");
  };
  const isFullHistory = !dateFrom && !dateTo;

  // Load employees and codes once
  useEffect(() => {
    Promise.all([
      fetchEmployees().then(setEmployees),
      fetchCodes().then(setCodes),
    ]).catch(() => toast.error("Failed to load report data"));
  }, []);

  // Load submissions when date filters change
  useEffect(() => {
    setLoading(true);
    const params: { dateFrom?: string; dateTo?: string } = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    fetchSubmissions(params)
      .then(setSubmissions)
      .catch(() => toast.error("Failed to load submissions"))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  // Code reporting
  const codeReportData = useMemo(() => {
    const monthSet = new Set<string>();
    const dataMap = new Map<string, Map<string, Map<string, number>>>();

    for (const sub of submissions) {
      const weekDate = new Date(sub.weekEnding + "T00:00:00");
      const monthKey = format(weekDate, "yyyy-MM");

      for (const row of sub.rows) {
        monthSet.add(monthKey);
        if (!dataMap.has(row.codeId)) dataMap.set(row.codeId, new Map());
        const empMap = dataMap.get(row.codeId)!;
        if (!empMap.has(sub.employeeId)) empMap.set(sub.employeeId, new Map());
        const mMap = empMap.get(sub.employeeId)!;
        mMap.set(monthKey, (mMap.get(monthKey) || 0) + rowTotal(row));
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

    const empById = byId(employees);
    const codeById = byId(codes);

    for (const [codeId, empMap] of dataMap) {
      const code = codeById.get(codeId);
      for (const [empId, mMap] of empMap) {
        const emp = empById.get(empId);
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

    rows.sort((a, b) => a.code.localeCompare(b.code) || a.employee.localeCompare(b.employee));
    return { months, rows };
  }, [submissions, employees, codes]);

  // Payroll state report — attribution per day uses dailyLocations[day]
  const payrollData = useMemo(() => {
    const empById = byId(employees);
    const map = new Map<string, Map<string, number>>();
    for (const sub of submissions) {
      const emp = empById.get(sub.employeeId);
      const empName = emp?.name || "Unknown";
      if (!map.has(empName)) map.set(empName, new Map());
      const stateMap = map.get(empName)!;
      for (const day of DAYS) {
        const dayHours = dayTotal(sub.rows, day);
        if (dayHours <= 0) continue;
        const loc = (sub.dailyLocations?.[day] || emp?.homeState || "?").toString();
        stateMap.set(loc, (stateMap.get(loc) || 0) + dayHours);
      }
    }
    const result: { employee: string; state: string; hours: number; pct: string }[] = [];
    for (const [employee, stateMap] of map) {
      const total = Array.from(stateMap.values()).reduce((a, b) => a + b, 0);
      for (const [state, hours] of stateMap) {
        result.push({ employee, state, hours, pct: pct(hours, total) });
      }
    }
    return result;
  }, [submissions, employees]);

  // Total cost report
  const costData = useMemo(() => {
    const empById = byId(employees);
    const codeById = byId(codes);
    const map = new Map<string, { code: string; label: string; employees: Map<string, { name: string; hours: number; rate: number }> }>();
    for (const sub of submissions) {
      const emp = empById.get(sub.employeeId);
      for (const row of sub.rows) {
        const code = codeById.get(row.codeId);
        const key = row.codeId;
        if (!map.has(key)) {
          map.set(key, { code: code?.code || "?", label: code?.label || "Unknown", employees: new Map() });
        }
        const entry = map.get(key)!;
        const empKey = sub.employeeId;
        if (!entry.employees.has(empKey)) {
          entry.employees.set(empKey, { name: emp?.name || "Unknown", hours: 0, rate: emp?.rate || 0 });
        }
        entry.employees.get(empKey)!.hours += rowTotal(row);
      }
    }
    return Array.from(map.values()).map((item) => {
      const empRows = Array.from(item.employees.values());
      const totalHours = empRows.reduce((s, e) => s + e.hours, 0);
      const totalCost = empRows.reduce((s, e) => s + e.hours * e.rate, 0);
      return { ...item, empRows, totalHours, totalCost };
    });
  }, [submissions, employees, codes]);

  // ── Code Detail Report (single code, daily-aware) ──
  // For the selected code: total hours, hours by employee, hours by week,
  // hours by location (per-day attribution), and total cost.
  const codeDetail = useMemo(() => {
    if (!selectedCodeId) return null;
    const codeById = byId(codes);
    const empById = byId(employees);
    const code = codeById.get(selectedCodeId);
    if (!code) return null;

    const byEmployee = new Map<string, { name: string; rate: number; hours: number }>();
    const byWeek = new Map<string, number>();
    const byLocation = new Map<string, number>();
    let totalHours = 0;
    let totalCost = 0;

    for (const sub of submissions) {
      const emp = empById.get(sub.employeeId);
      const empName = emp?.name || "Unknown";
      const rate = emp?.rate || 0;

      // Pre-filter rows for the selected code once per submission, then attribute
      // each day's hours to that day's location.
      const codeRows = sub.rows.filter((r) => r.codeId === selectedCodeId);
      if (codeRows.length === 0) continue;

      let subTotalForCode = 0;
      for (const day of DAYS as DayKey[]) {
        const dayHrs = dayTotal(codeRows, day);
        if (dayHrs <= 0) continue;
        subTotalForCode += dayHrs;
        const loc = (sub.dailyLocations?.[day] || emp?.homeState || "?").toString();
        byLocation.set(loc, (byLocation.get(loc) || 0) + dayHrs);
      }
      if (subTotalForCode <= 0) continue;

      totalHours += subTotalForCode;
      totalCost += subTotalForCode * rate;

      const e = byEmployee.get(sub.employeeId);
      if (e) e.hours += subTotalForCode;
      else byEmployee.set(sub.employeeId, { name: empName, rate, hours: subTotalForCode });

      byWeek.set(sub.weekEnding, (byWeek.get(sub.weekEnding) || 0) + subTotalForCode);
    }

    return {
      code,
      totalHours: r2(totalHours),
      totalCost: r2(totalCost),
      byEmployee: Array.from(byEmployee.values())
        .map((e) => ({ ...e, hours: r2(e.hours), cost: r2(e.hours * e.rate) }))
        .sort((a, b) => b.hours - a.hours),
      byWeek: Array.from(byWeek.entries())
        .map(([weekEnding, hours]) => ({ weekEnding, hours: r2(hours) }))
        .sort((a, b) => a.weekEnding.localeCompare(b.weekEnding)),
      byLocation: Array.from(byLocation.entries())
        .map(([location, hours]) => ({ location, hours: r2(hours) }))
        .sort((a, b) => b.hours - a.hours),
    };
  }, [selectedCodeId, submissions, employees, codes]);

  /** Multi-sheet Excel export of the code detail report. */
  const exportCodeDetail = () => {
    if (!codeDetail) return;
    const wb = XLSX.utils.book_new();

    const summary = [
      ["Code", codeDetail.code.code],
      ["Label", codeDetail.code.label],
      ["Date Range", isFullHistory ? "Full History" : `${dateFrom || "…"} → ${dateTo || "…"}`],
      ["Total Hours", codeDetail.totalHours],
      ["Total Cost", codeDetail.totalCost],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Employee", "Rate", "Hours", "Cost"],
        ...codeDetail.byEmployee.map((e) => [e.name, e.rate, e.hours, e.cost]),
      ]),
      "By Employee"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Week Ending", "Hours"],
        ...codeDetail.byWeek.map((w) => [w.weekEnding, w.hours]),
      ]),
      "By Week"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Location", "Hours"],
        ...codeDetail.byLocation.map((l) => [l.location, l.hours]),
      ]),
      "By Location"
    );

    XLSX.writeFile(wb, `code-detail-${codeDetail.code.code}.xlsx`);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Reports
        </h1>

        <div className="flex flex-wrap items-center gap-4">
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
          <Button
            variant={isFullHistory ? "secondary" : "outline"}
            size="sm"
            onClick={clearDateFilters}
            className="gap-1"
            disabled={isFullHistory}
            title="Clear date filters and include every submission"
          >
            <History className="h-4 w-4" /> Full History
          </Button>
          <span className="text-sm text-muted-foreground">
            {loading ? (
              <Loader2 className="inline h-4 w-4 animate-spin" />
            ) : (
              <>
                {submissions.length} submission(s){isFullHistory ? " · all time" : ""}
              </>
            )}
          </span>
        </div>

        <Tabs defaultValue="project-hours">
          <TabsList>
            <TabsTrigger value="project-hours">Code Reporting</TabsTrigger>
            <TabsTrigger value="payroll-state">State Reporting</TabsTrigger>
            <TabsTrigger value="total-cost">Cost Reporting</TabsTrigger>
            <TabsTrigger value="code-detail">Code Detail</TabsTrigger>
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

          <TabsContent value="code-detail" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Code</label>
                <Select value={selectedCodeId} onValueChange={setSelectedCodeId}>
                  <SelectTrigger className="w-[320px]">
                    <SelectValue placeholder="Select a code…" />
                  </SelectTrigger>
                  <SelectContent>
                    {codes
                      .slice()
                      .sort((a, b) => a.code.localeCompare(b.code))
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="font-mono text-xs mr-2">{c.code}</span>
                          {c.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={exportCodeDetail}
                disabled={!codeDetail || codeDetail.totalHours === 0}
              >
                <Download className="h-4 w-4" /> Export Excel
              </Button>
            </div>

            {!codeDetail ? (
              <p className="py-8 text-center text-muted-foreground">
                Select a code to view its detailed breakdown.
              </p>
            ) : codeDetail.totalHours === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No hours recorded for <span className="font-mono">{codeDetail.code.code}</span> in
                {" "}{isFullHistory ? "any submission" : "the selected range"}.
              </p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Code</p>
                    <p className="mt-1 font-mono text-sm">{codeDetail.code.code}</p>
                    <p className="text-xs text-muted-foreground">{codeDetail.code.label}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Hours</p>
                    <p className="mt-1 text-2xl font-semibold">{codeDetail.totalHours}h</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Cost</p>
                    <p className="mt-1 text-2xl font-semibold">${codeDetail.totalCost.toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Hours by Employee</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {codeDetail.byEmployee.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{e.name}</TableCell>
                          <TableCell className="text-right">${e.rate}</TableCell>
                          <TableCell className="text-right">{e.hours}h</TableCell>
                          <TableCell className="text-right">${e.cost.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Hours by Week</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Week Ending</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {codeDetail.byWeek.map((w, i) => (
                        <TableRow key={i}>
                          <TableCell>{w.weekEnding}</TableCell>
                          <TableCell className="text-right">{w.hours}h</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Hours by Location</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {codeDetail.byLocation.map((l, i) => (
                        <TableRow key={i}>
                          <TableCell>{l.location}</TableCell>
                          <TableCell className="text-right">{l.hours}h</TableCell>
                          <TableCell className="text-right">
                            {pct(l.hours, codeDetail.totalHours)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

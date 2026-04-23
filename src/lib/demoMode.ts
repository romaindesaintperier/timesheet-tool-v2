/**
 * Demo Mode — activates when Azure AD env vars are not configured.
 * Lets users explore the app with seeded in-memory data.
 */

import type { Employee, CodeEntry, WeeklySubmission } from "./types";
import { getCurrentWeekEnding, getPreviousWeekEnding } from "./store";

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || "";
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || "";

export const isDemoMode = !clientId || !tenantId;

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// ── Seed data ──
const seedEmployees: Employee[] = [
  { id: "emp_1", name: "Alex Morgan", rate: 145, homeState: "NY", active: true },
  { id: "emp_2", name: "Priya Patel", rate: 160, homeState: "CA", active: true },
  { id: "emp_3", name: "Jordan Lee", rate: 130, homeState: "TX", active: true },
  { id: "emp_4", name: "Sam Rivera", rate: 175, homeState: "IL", active: true },
  { id: "emp_5", name: "Taylor Brooks", rate: 120, homeState: "MA", active: true },
  { id: "emp_6", name: "Casey Kim", rate: 155, homeState: "WA", active: true },
  { id: "emp_7", name: "Drew Anderson", rate: 140, homeState: "FL", active: true },
  { id: "emp_8", name: "Jamie Chen", rate: 165, homeState: "NY", active: true },
  { id: "emp_9", name: "Morgan Davis", rate: 135, homeState: "CO", active: true },
  { id: "emp_10", name: "Riley Thompson", rate: 150, homeState: "GA", active: false },
];

const seedCodes: CodeEntry[] = [
  { id: "code_1", label: "Project Apollo", code: "DD-1001", category: "due_diligence", active: true },
  { id: "code_2", label: "Project Helios", code: "DD-1002", category: "due_diligence", active: true },
  { id: "code_3", label: "Project Orion", code: "DD-1003", category: "due_diligence", active: true },
  { id: "code_4", label: "Acme Manufacturing", code: "PE-2001", category: "portfolio_engagements", active: true },
  { id: "code_5", label: "Northwind Logistics", code: "PE-2002", category: "portfolio_engagements", active: true },
  { id: "code_6", label: "Globex Health", code: "PE-2003", category: "portfolio_engagements", active: true },
  { id: "code_7", label: "Operations CoE", code: "COE-3001", category: "functional_coes", active: true },
  { id: "code_8", label: "Digital CoE", code: "COE-3002", category: "functional_coes", active: true },
  { id: "code_9", label: "PTO / Vacation", code: "OTH-9001", category: "other", active: true },
  { id: "code_10", label: "Sick Leave", code: "OTH-9002", category: "other", active: true },
  { id: "code_11", label: "Training", code: "OTH-9003", category: "other", active: true },
];

const seedLocations: string[] = ["NY", "CA", "TX", "IL", "MA", "WA", "FL", "CO", "GA", "Remote"];

const thisWeek = getCurrentWeekEnding();
const lastWeek = getPreviousWeekEnding(thisWeek);
const twoWeeksAgo = getPreviousWeekEnding(lastWeek);

const seedSubmissions: WeeklySubmission[] = [
  {
    id: "sub_1",
    employeeId: "emp_1",
    weekEnding: lastWeek,
    submittedAt: new Date().toISOString(),
    status: "submitted",
    dailyLocations: { monday: "NY", tuesday: "NY", wednesday: "NY", thursday: "Remote", friday: "Remote" },
    rows: [
      { id: uid("row"), category: "due_diligence", codeId: "code_1", monday: 4, tuesday: 4, wednesday: 4, thursday: 4, friday: 4 },
      { id: uid("row"), category: "portfolio_engagements", codeId: "code_4", monday: 3, tuesday: 3, wednesday: 3, thursday: 3, friday: 3 },
      { id: uid("row"), category: "functional_coes", codeId: "code_7", monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1 },
    ],
  },
  {
    id: "sub_2",
    employeeId: "emp_2",
    weekEnding: lastWeek,
    submittedAt: new Date().toISOString(),
    status: "submitted",
    dailyLocations: { monday: "CA", tuesday: "CA", wednesday: "CA", thursday: "CA", friday: "CA" },
    rows: [
      { id: uid("row"), category: "due_diligence", codeId: "code_2", monday: 5, tuesday: 5, wednesday: 5, thursday: 5, friday: 5 },
      { id: uid("row"), category: "portfolio_engagements", codeId: "code_5", monday: 2, tuesday: 2, wednesday: 2, thursday: 2, friday: 2 },
      { id: uid("row"), category: "other", codeId: "code_9", monday: 1.5, tuesday: 1.5, wednesday: 1.5, thursday: 1.5, friday: 2 },
    ],
  },
  {
    id: "sub_3",
    employeeId: "emp_3",
    weekEnding: twoWeeksAgo,
    submittedAt: new Date().toISOString(),
    status: "submitted",
    dailyLocations: { monday: "TX", tuesday: "TX", wednesday: "Remote", thursday: "TX", friday: "TX" },
    rows: [
      { id: uid("row"), category: "due_diligence", codeId: "code_3", monday: 6, tuesday: 6, wednesday: 6, thursday: 6, friday: 6 },
      { id: uid("row"), category: "functional_coes", codeId: "code_8", monday: 2, tuesday: 2, wednesday: 2, thursday: 2, friday: 2 },
    ],
  },
];

// ── In-memory store ──
const store = {
  employees: [...seedEmployees],
  codes: [...seedCodes],
  locations: [...seedLocations],
  submissions: [...seedSubmissions],
};

// ── API surface ──
export const demoApi = {
  // Employees
  fetchEmployees: async (): Promise<Employee[]> => [...store.employees],
  createEmployee: async (emp: Omit<Employee, "id">): Promise<Employee> => {
    const created = { ...emp, id: uid("emp") };
    store.employees.push(created);
    return created;
  },
  updateEmployee: async (id: string, emp: Partial<Employee>): Promise<Employee> => {
    const idx = store.employees.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error("Employee not found");
    store.employees[idx] = { ...store.employees[idx], ...emp };
    return store.employees[idx];
  },

  // Codes
  fetchCodes: async (): Promise<CodeEntry[]> => [...store.codes],
  createCode: async (code: Omit<CodeEntry, "id">): Promise<CodeEntry> => {
    const created = { ...code, id: uid("code") };
    store.codes.push(created);
    return created;
  },
  updateCode: async (id: string, code: Partial<CodeEntry>): Promise<CodeEntry> => {
    const idx = store.codes.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Code not found");
    store.codes[idx] = { ...store.codes[idx], ...code };
    return store.codes[idx];
  },

  // Locations
  fetchLocations: async (): Promise<string[]> => [...store.locations],
  createLocation: async (location: string): Promise<void> => {
    if (!store.locations.includes(location)) store.locations.push(location);
  },
  deleteLocation: async (loc: string): Promise<void> => {
    store.locations = store.locations.filter((l) => l !== loc);
  },

  // Submissions
  fetchSubmissions: async (params?: { dateFrom?: string; dateTo?: string }): Promise<WeeklySubmission[]> => {
    let result = [...store.submissions];
    if (params?.dateFrom) result = result.filter((s) => s.weekEnding >= params.dateFrom!);
    if (params?.dateTo) result = result.filter((s) => s.weekEnding <= params.dateTo!);
    return result;
  },
  upsertSubmission: async (submission: WeeklySubmission): Promise<WeeklySubmission> => {
    const existing = store.submissions.findIndex(
      (s) => s.employeeId === submission.employeeId && s.weekEnding === submission.weekEnding
    );
    const withId = { ...submission, id: submission.id || uid("sub") };
    if (existing >= 0) {
      store.submissions[existing] = withId;
    } else {
      store.submissions.push(withId);
    }
    return withId;
  },

  fetchUserRole: async (): Promise<{ role: "admin" | "user" }> => ({ role: "admin" }),
};

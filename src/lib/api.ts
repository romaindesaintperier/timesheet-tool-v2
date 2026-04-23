/**
 * API service layer — all calls go through here.
 * In demo mode (no Azure env vars), routes to in-memory demo data instead.
 */

import type { Employee, CodeEntry, WeeklySubmission } from "./types";
import { isDemoMode, demoApi } from "./demoMode";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

let tokenProvider: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>) {
  tokenProvider = fn;
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tokenProvider) {
    const token = await tokenProvider();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// ── Employees ──
export const fetchEmployees = () =>
  isDemoMode ? demoApi.fetchEmployees() : request<Employee[]>("/api/employees");
export const createEmployee = (emp: Omit<Employee, "id">) =>
  isDemoMode
    ? demoApi.createEmployee(emp)
    : request<Employee>("/api/employees", { method: "POST", body: JSON.stringify(emp) });
export const updateEmployee = (id: string, emp: Partial<Employee>) =>
  isDemoMode
    ? demoApi.updateEmployee(id, emp)
    : request<Employee>(`/api/employees/${id}`, { method: "PUT", body: JSON.stringify(emp) });

// ── Codes ──
export const fetchCodes = () =>
  isDemoMode ? demoApi.fetchCodes() : request<CodeEntry[]>("/api/codes");
export const createCode = (code: Omit<CodeEntry, "id">) =>
  isDemoMode
    ? demoApi.createCode(code)
    : request<CodeEntry>("/api/codes", { method: "POST", body: JSON.stringify(code) });
export const updateCode = (id: string, code: Partial<CodeEntry>) =>
  isDemoMode
    ? demoApi.updateCode(id, code)
    : request<CodeEntry>(`/api/codes/${id}`, { method: "PUT", body: JSON.stringify(code) });

// ── Locations ──
export const fetchLocations = () =>
  isDemoMode ? demoApi.fetchLocations() : request<string[]>("/api/locations");
export const createLocation = (location: string) =>
  isDemoMode
    ? demoApi.createLocation(location)
    : request<void>("/api/locations", { method: "POST", body: JSON.stringify({ location }) });
export const deleteLocation = (loc: string) =>
  isDemoMode
    ? demoApi.deleteLocation(loc)
    : request<void>(`/api/locations/${encodeURIComponent(loc)}`, { method: "DELETE" });

// ── Submissions ──
export const fetchSubmissions = (params?: { dateFrom?: string; dateTo?: string }) => {
  if (isDemoMode) return demoApi.fetchSubmissions(params);
  const query = new URLSearchParams();
  if (params?.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params?.dateTo) query.set("dateTo", params.dateTo);
  const qs = query.toString();
  return request<WeeklySubmission[]>(`/api/submissions${qs ? `?${qs}` : ""}`);
};
export const upsertSubmission = (submission: WeeklySubmission) =>
  isDemoMode
    ? demoApi.upsertSubmission(submission)
    : request<WeeklySubmission>("/api/submissions", { method: "POST", body: JSON.stringify(submission) });

// ── User role ──
export const fetchUserRole = () =>
  isDemoMode
    ? demoApi.fetchUserRole()
    : request<{ role: "admin" | "user" }>("/api/users/me/role");

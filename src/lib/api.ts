/**
 * API service layer — all calls go through here.
 * 
 * Your backend should implement these REST endpoints:
 * 
 * GET    /api/employees          → Employee[]
 * POST   /api/employees          → Employee (create)
 * PUT    /api/employees/:id      → Employee (update)
 * 
 * GET    /api/codes              → CodeEntry[]
 * POST   /api/codes              → CodeEntry (create)
 * PUT    /api/codes/:id          → CodeEntry (update)
 * 
 * GET    /api/locations          → string[]
 * POST   /api/locations          → { location: string }
 * DELETE /api/locations/:loc     → void
 * 
 * GET    /api/submissions        → WeeklySubmission[]
 * POST   /api/submissions        → WeeklySubmission (upsert by employee+week)
 * 
 * GET    /api/users/me/role      → { role: "admin" | "user" }
 * 
 * All endpoints expect Authorization: Bearer <token> header.
 * Set VITE_API_BASE_URL env var to your backend origin (e.g. https://api.company.com).
 */

import type { Employee, CodeEntry, WeeklySubmission } from "./types";

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
export const fetchEmployees = () => request<Employee[]>("/api/employees");
export const createEmployee = (emp: Omit<Employee, "id">) =>
  request<Employee>("/api/employees", { method: "POST", body: JSON.stringify(emp) });
export const updateEmployee = (id: string, emp: Partial<Employee>) =>
  request<Employee>(`/api/employees/${id}`, { method: "PUT", body: JSON.stringify(emp) });

// ── Codes ──
export const fetchCodes = () => request<CodeEntry[]>("/api/codes");
export const createCode = (code: Omit<CodeEntry, "id">) =>
  request<CodeEntry>("/api/codes", { method: "POST", body: JSON.stringify(code) });
export const updateCode = (id: string, code: Partial<CodeEntry>) =>
  request<CodeEntry>(`/api/codes/${id}`, { method: "PUT", body: JSON.stringify(code) });

// ── Locations ──
export const fetchLocations = () => request<string[]>("/api/locations");
export const createLocation = (location: string) =>
  request<void>("/api/locations", { method: "POST", body: JSON.stringify({ location }) });
export const deleteLocation = (loc: string) =>
  request<void>(`/api/locations/${encodeURIComponent(loc)}`, { method: "DELETE" });

// ── Submissions ──
export const fetchSubmissions = (params?: { dateFrom?: string; dateTo?: string }) => {
  const query = new URLSearchParams();
  if (params?.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params?.dateTo) query.set("dateTo", params.dateTo);
  const qs = query.toString();
  return request<WeeklySubmission[]>(`/api/submissions${qs ? `?${qs}` : ""}`);
};
export const upsertSubmission = (submission: WeeklySubmission) =>
  request<WeeklySubmission>("/api/submissions", { method: "POST", body: JSON.stringify(submission) });

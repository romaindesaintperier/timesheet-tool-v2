import { Employee, CodeEntry, WeeklySubmission, Category } from "./types";

const STORAGE_KEYS = {
  employees: "capstone_employees",
  codes: "capstone_codes",
  locations: "capstone_locations",
  submissions: "capstone_submissions",
};

// Seed data from reference database
const DEFAULT_EMPLOYEES: Employee[] = [
  { id: "1", name: "Romain", rate: 100, homeState: "NY", active: true },
  { id: "2", name: "Katy", rate: 200, homeState: "TX", active: true },
  { id: "3", name: "Chapel", rate: 300, homeState: "CA", active: true },
];

const DEFAULT_LOCATIONS = ["NY", "TX", "CA"];

const DEFAULT_CODES: CodeEntry[] = [
  { id: "c1", label: "Project Alpha – Due Diligence", code: "1234", category: "due_diligence", active: true },
  { id: "c2", label: "Project Beta – Portfolio", code: "9876", category: "portfolio_engagements", active: true },
  { id: "c3", label: "Project Gamma – CoE Procurement", code: "3849", category: "functional_coes", active: true },
  { id: "c4", label: "PTO", code: "PTO", category: "other", active: true },
  { id: "c5", label: "Sick Time", code: "SICK", category: "other", active: true },
  { id: "c6", label: "Admin", code: "ADMIN", category: "other", active: true },
  { id: "c7", label: "Training", code: "TRAIN", category: "other", active: true },
];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Employees
export function getEmployees(): Employee[] {
  return load(STORAGE_KEYS.employees, DEFAULT_EMPLOYEES);
}
export function saveEmployees(employees: Employee[]) {
  save(STORAGE_KEYS.employees, employees);
}

// Locations
export function getLocations(): string[] {
  return load(STORAGE_KEYS.locations, DEFAULT_LOCATIONS);
}
export function saveLocations(locations: string[]) {
  save(STORAGE_KEYS.locations, locations);
}

// Codes
export function getCodes(): CodeEntry[] {
  return load(STORAGE_KEYS.codes, DEFAULT_CODES);
}
export function saveCodes(codes: CodeEntry[]) {
  save(STORAGE_KEYS.codes, codes);
}

// Submissions
export function getSubmissions(): WeeklySubmission[] {
  return load(STORAGE_KEYS.submissions, []);
}
export function saveSubmissions(submissions: WeeklySubmission[]) {
  save(STORAGE_KEYS.submissions, submissions);
}

export function addSubmission(submission: WeeklySubmission) {
  const subs = getSubmissions();
  // Replace existing submission for same employee + week
  const idx = subs.findIndex(
    (s) => s.employeeId === submission.employeeId && s.weekEnding === submission.weekEnding
  );
  if (idx >= 0) subs[idx] = submission;
  else subs.push(submission);
  saveSubmissions(subs);
}

// Week helpers
export function getCurrentWeekEnding(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = 7 - day; // days until next Sunday
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + (day === 0 ? 0 : diff));
  return sunday.toISOString().split("T")[0];
}

export function getPreviousWeekEnding(weekEnding: string): string {
  const d = new Date(weekEnding);
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

export function getLastSubmission(employeeId: string, weekEnding: string): WeeklySubmission | undefined {
  const prevWeek = getPreviousWeekEnding(weekEnding);
  return getSubmissions().find(
    (s) => s.employeeId === employeeId && s.weekEnding === prevWeek
  );
}

export function getCodesForCategory(category: Category): CodeEntry[] {
  return getCodes().filter((c) => c.category === category && c.active);
}

import { Employee, CodeEntry, WeeklySubmission, Category } from "./types";

const STORAGE_KEYS = {
  employees: "capstone_employees",
  codes: "capstone_codes",
  locations: "capstone_locations",
  submissions: "capstone_submissions",
};

// Seed data from reference database
const DEFAULT_EMPLOYEES: Employee[] = [
  { id: "1", name: "Nicholas Zeitlin", rate: 11.3, homeState: "NY", active: true },
  { id: "2", name: "Anne Arlinghaus", rate: 11.3, homeState: "NY", active: true },
  { id: "3", name: "Jyo Sinha", rate: 11.3, homeState: "NY", active: true },
  { id: "4", name: "Patricia Ludwig", rate: 11.3, homeState: "NY", active: true },
  { id: "5", name: "Karen Hollinger", rate: 11.3, homeState: "NY", active: true },
  { id: "6", name: "Javier Justiniano", rate: 10.2, homeState: "NY", active: true },
  { id: "7", name: "Ana Bakhshyan", rate: 10.2, homeState: "NY", active: true },
  { id: "8", name: "Sam Jones", rate: 10.2, homeState: "NY", active: true },
  { id: "9", name: "Graham Thomas", rate: 10.2, homeState: "NY", active: true },
  { id: "10", name: "Amar Ghai", rate: 10.2, homeState: "NY", active: true },
  { id: "11", name: "Paul Dhaliwal", rate: 10.2, homeState: "NY", active: true },
  { id: "12", name: "Maria Ramberger", rate: 10.2, homeState: "NY", active: true },
  { id: "13", name: "Nnamdi Maduagwu", rate: 10.2, homeState: "NY", active: true },
  { id: "14", name: "Claudia Benshimol", rate: 10.2, homeState: "NY", active: true },
  { id: "15", name: "Rafael Rivera", rate: 10.2, homeState: "NY", active: true },
  { id: "16", name: "Tyler Yoon", rate: 10.2, homeState: "CA", active: true },
  { id: "17", name: "Vivek Menon", rate: 10.2, homeState: "CA", active: true },
  { id: "18", name: "Sharon Zicherman", rate: 10.2, homeState: "CA", active: true },
  { id: "19", name: "Katy Yu", rate: 9, homeState: "CA", active: true },
  { id: "20", name: "Joy Lim", rate: 9, homeState: "CA", active: true },
  { id: "21", name: "Romain De Saint Perier", rate: 9, homeState: "CA", active: true },
  { id: "22", name: "Thomas Chen", rate: 9, homeState: "CA", active: true },
  { id: "23", name: "Judy Kim", rate: 9, homeState: "CA", active: true },
  { id: "24", name: "Colin Johnson", rate: 9, homeState: "CA", active: true },
  { id: "25", name: "Jay Shah", rate: 9, homeState: "CA", active: true },
  { id: "26", name: "Andrew Hennion", rate: 9, homeState: "CA", active: true },
  { id: "27", name: "Andrew Lindquist", rate: 9, homeState: "CA", active: true },
  { id: "28", name: "Alex Harada", rate: 9, homeState: "CA", active: true },
  { id: "29", name: "Ajaykumar Kutty", rate: 9, homeState: "CA", active: true },
  { id: "30", name: "Petie Burgdoerfer", rate: 9, homeState: "CA", active: true },
  { id: "31", name: "Ari Frankel", rate: 9, homeState: "CA", active: true },
  { id: "32", name: "Rana Ipeker", rate: 9, homeState: "CA", active: true },
  { id: "33", name: "Nicole Miles", rate: 9, homeState: "CA", active: true },
  { id: "34", name: "Daye Kim", rate: 9, homeState: "CA", active: true },
  { id: "35", name: "Pablo Illuzzi", rate: 9, homeState: "CA", active: true },
  { id: "36", name: "Rebecca Gould", rate: 9, homeState: "CA", active: true },
  { id: "37", name: "Andrew Abrams", rate: 9, homeState: "CA", active: true },
  { id: "38", name: "Lizzy Sura", rate: 6.6, homeState: "CA", active: true },
  { id: "39", name: "Bernhard Gapp", rate: 6.6, homeState: "CA", active: true },
  { id: "40", name: "Abigail Rhodes", rate: 6.6, homeState: "CA", active: true },
  { id: "41", name: "Aislin Roth", rate: 6.6, homeState: "CA", active: true },
  { id: "42", name: "Ryleigh Navert", rate: 6.6, homeState: "CA", active: true },
  { id: "43", name: "Eric Tay", rate: 6.6, homeState: "CA", active: true },
  { id: "44", name: "Henry Bristol", rate: 6.6, homeState: "CA", active: true },
  { id: "45", name: "Christopher Currey", rate: 6.6, homeState: "CA", active: true },
  { id: "46", name: "Clemens Hoffmann", rate: 6.6, homeState: "CA", active: true },
  { id: "47", name: "Victoria Yuan", rate: 6.6, homeState: "CA", active: true },
  { id: "48", name: "Chapel Puckett", rate: 6.6, homeState: "CA", active: true },
  { id: "49", name: "Ike Njoroge", rate: 6.6, homeState: "CA", active: true },
  { id: "50", name: "Julian Ashworth", rate: 6.6, homeState: "CA", active: true },
  { id: "51", name: "Liam Walsh", rate: 6.6, homeState: "CA", active: true },
  { id: "52", name: "Valeria Zuniga Morales", rate: 6.6, homeState: "CA", active: true },
  { id: "53", name: "Will Roth", rate: 6.6, homeState: "CA", active: true },
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

export function getAllActiveCodes(): CodeEntry[] {
  return getCodes().filter((c) => c.active);
}

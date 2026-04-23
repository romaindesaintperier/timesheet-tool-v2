export interface Employee {
  id: string;
  name: string;
  rate: number;
  homeState: string;
  active: boolean;
}

export type Category = "due_diligence" | "portfolio_engagements" | "functional_coes" | "other";

export const CATEGORY_LABELS: Record<Category, string> = {
  due_diligence: "Due Diligences",
  portfolio_engagements: "Portfolio Engagements",
  functional_coes: "Centers of Excellence",
  other: "Other (e.g., PTO, sick leave, training)",
};

export interface CodeEntry {
  id: string;
  label: string;
  code: string;
  category: Category;
  active: boolean;
}

export type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
export const DAYS: DayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
export const DAY_LABELS: Record<DayKey, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
};

export interface SubmissionRow {
  id: string;
  category: Category;
  codeId: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
}

/** One shared row across ALL code rows; one location per workday. */
export interface DailyLocations {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
}

export interface WeeklySubmission {
  id: string;
  employeeId: string;
  weekEnding: string; // ISO date string for the Sunday
  rows: SubmissionRow[];
  dailyLocations: DailyLocations;
  submittedAt: string;
  status: "submitted" | "draft";
}

/** Helper: sum the five day fields of a row. */
export function rowTotal(r: SubmissionRow): number {
  return (r.monday || 0) + (r.tuesday || 0) + (r.wednesday || 0) + (r.thursday || 0) + (r.friday || 0);
}

/** Helper: empty daily locations object. */
export function emptyDailyLocations(defaultLoc = ""): DailyLocations {
  return {
    monday: defaultLoc,
    tuesday: defaultLoc,
    wednesday: defaultLoc,
    thursday: defaultLoc,
    friday: defaultLoc,
  };
}

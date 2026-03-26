export interface Employee {
  id: string;
  name: string;
  rate: number;
  homeState: string;
  active: boolean;
}

export type Category = "due_diligence" | "portfolio_engagements" | "functional_coes" | "other";

export const CATEGORY_LABELS: Record<Category, string> = {
  due_diligence: "Due Diligence",
  portfolio_engagements: "Portfolio Engagements",
  functional_coes: "Functional CoEs",
  other: "Other",
};

export interface CodeEntry {
  id: string;
  label: string;
  code: string;
  category: Category;
  active: boolean;
}

export interface SubmissionRow {
  id: string;
  category: Category;
  codeId: string;
  hours: number;
  location: string;
}

export interface WeeklySubmission {
  id: string;
  employeeId: string;
  weekEnding: string; // ISO date string for the Sunday
  rows: SubmissionRow[];
  submittedAt: string;
  status: "submitted" | "draft";
}



# Migrate to Daily Hours Model — Clean Cut

## New Data Model (single source of truth)

### TypeScript (`src/lib/types.ts`)
```ts
export type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
export const DAYS: DayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

export interface SubmissionRow {
  id: string;
  category: Category;
  codeId: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  // total computed in UI: mon+tue+wed+thu+fri
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
  weekEnding: string; // ISO Sunday date (unchanged key)
  rows: SubmissionRow[];
  dailyLocations: DailyLocations;
  submittedAt: string;
  status: "submitted" | "draft";
}
```

### Backend (`backend/app/models.py`)
- `submission_rows` table: replace `hours: Float` and `location: String` with `monday/tuesday/wednesday/thursday/friday: Float NOT NULL DEFAULT 0`. Drop the `location` column from rows.
- `weekly_submissions` table: add 5 columns `loc_monday`, `loc_tuesday`, `loc_wednesday`, `loc_thursday`, `loc_friday: String NULLABLE`.
- New Alembic migration: drop old columns + add new columns. **No data migration** (per requirements: ignore old data).

### API (`backend/app/schemas.py` + `routes/submissions.py`)
- `SubmissionRowSchema`: `{ id, category, codeId, monday, tuesday, wednesday, thursday, friday }`.
- `SubmissionCreate`/`SubmissionOut` add `dailyLocations: { monday, tuesday, wednesday, thursday, friday }`.
- Upsert logic: persist 5 daily hour fields per row + 5 daily location fields per submission. Validation: if `dayHoursSum > 0` for any row on day X, then `dailyLocations[X]` must be non-empty (returns 422).

### Frontend behavior

**Loading**:
- For active week: load existing submission. Rows already have daily hours + dailyLocations.
- If none, prefill from previous week (rows with daily hours + dailyLocations).
- If neither, blank rows + empty dailyLocations.

**Editing**:
- Each row: code dropdown + 5 day inputs + computed total column (read-only).
- One "Daily Locations" row at the bottom: 5 location selects, one per day.
- Validation on submit: for each day where any row has hours > 0, that day's location is required.

**Reports compatibility**:
- Weekly rollup: per row, `weekTotal = mon+tue+wed+thu+fri`. Same totals as before.
- Daily breakdown: `row[day]` accessible directly.
- State/Cost reports use day-level location: total hours per day × `dailyLocations[day]` for state attribution. Cost = `weekTotal × rate`.

## Implementation Order (clean cut, no mixed structures)

1. **Backend models** + Alembic migration that drops old columns + adds new (single revision).
2. **Backend schemas + routes** updated to new shape.
3. **Frontend types** updated.
4. **Frontend `demoMode.ts`** rewritten to seed + serve new shape.
5. **`TimesheetForm`** rewritten for daily UI.
6. **`Reports.tsx`** updated to compute totals from daily fields.
7. **`Admin.tsx` Submissions tab** updated to show new totals.
8. **`EmployeeSelect`** history list updated (totals from daily fields).

## Files Modified
- `src/lib/types.ts`
- `src/lib/demoMode.ts`
- `src/components/TimesheetForm.tsx`
- `src/components/EmployeeSelect.tsx` (history total only)
- `src/pages/Admin.tsx` (submissions tab total only)
- `src/pages/Reports.tsx`
- `backend/app/models.py`
- `backend/app/schemas.py`
- `backend/app/routes/submissions.py`
- `backend/alembic/versions/<new>_daily_hours.py` (new)
- `backend/seed.py` (no data shape change needed — seeds reference only)

## Constraints respected
- Auth, routes, Admin/Reports tabs, employee/code/location flows: all preserved.
- Single, consistent shape end-to-end. No `hours`/`location` fields remain anywhere.
- No old-data migration (historical rows simply drop their old hours/location columns).


// Pure date helper utilities — no localStorage of business data, no seed data.
// Canonical week key remains "weekEnding" (Sunday ISO date) to preserve the
// existing data model and submission payload structure. UI displays Mon–Fri.

export function getCurrentWeekEnding(): string {
  return getWeekEndingForDate(new Date());
}

/** Returns the Sunday (week ending) for any given date, as ISO yyyy-mm-dd. */
export function getWeekEndingForDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export function getPreviousWeekEnding(weekEnding: string): string {
  const d = new Date(weekEnding);
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

/** Monday of the workweek that ends on the given Sunday weekEnding. */
export function getMondayOfWeek(weekEnding: string): Date {
  const sunday = new Date(weekEnding);
  const monday = new Date(sunday);
  monday.setDate(sunday.getDate() - 6);
  return monday;
}

/** Friday of the workweek that ends on the given Sunday weekEnding. */
export function getFridayOfWeek(weekEnding: string): Date {
  const sunday = new Date(weekEnding);
  const friday = new Date(sunday);
  friday.setDate(sunday.getDate() - 2);
  return friday;
}

/** Human label like "Mon Apr 14 – Fri Apr 18, 2025". */
export function formatWorkweekLabel(weekEnding: string): string {
  const mon = getMondayOfWeek(weekEnding);
  const fri = getFridayOfWeek(weekEnding);
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString(undefined, opts);
  const sameYear = mon.getFullYear() === fri.getFullYear();
  return `${fmt(mon, { weekday: "short", month: "short", day: "numeric" })} – ${fmt(
    fri,
    { weekday: "short", month: "short", day: "numeric", year: sameYear ? "numeric" : undefined }
  )}${sameYear ? "" : `, ${fri.getFullYear()}`}`;
}

// ── Favorites (per-browser, per-user when userKey provided) ──
const FAV_KEY_PREFIX = "capstone.favorites";

function favKey(userKey?: string | null) {
  return userKey ? `${FAV_KEY_PREFIX}.${userKey}` : FAV_KEY_PREFIX;
}

export function getFavoriteEmployeeIds(userKey?: string | null): string[] {
  try {
    const raw = localStorage.getItem(favKey(userKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function setFavoriteEmployeeIds(ids: string[], userKey?: string | null): void {
  try {
    localStorage.setItem(favKey(userKey), JSON.stringify(ids));
  } catch {
    // ignore quota / privacy mode errors
  }
}

export function toggleFavoriteEmployee(id: string, userKey?: string | null): string[] {
  const current = getFavoriteEmployeeIds(userKey);
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  setFavoriteEmployeeIds(next, userKey);
  return next;
}

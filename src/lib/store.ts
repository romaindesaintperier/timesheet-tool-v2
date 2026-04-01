// Pure date helper utilities — no localStorage, no seed data.

export function getCurrentWeekEnding(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + (day === 0 ? 0 : diff));
  return sunday.toISOString().split("T")[0];
}

export function getPreviousWeekEnding(weekEnding: string): string {
  const d = new Date(weekEnding);
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

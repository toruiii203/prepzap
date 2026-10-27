export interface AnalyticsSessionInput { user_id?: unknown; id?: unknown; title?: unknown; created_at?: unknown; duration_minutes?: unknown; duration?: unknown; }
export interface PresentedSession { id: string; title: string; date: Date; minutes: number; }
export function studySummary(rows: readonly AnalyticsSessionInput[], now = new Date(), userId?: string) {
  const sessions: PresentedSession[] = rows.flatMap((row, index) => {
    if (!row || typeof row !== "object" || typeof row.created_at !== "string" || (userId && typeof row.user_id === "string" && row.user_id !== userId)) return [];
    const date = new Date(row.created_at);
    const rawMinutes = row.duration_minutes ?? row.duration;
    const minutes = typeof rawMinutes === "number" ? rawMinutes : typeof rawMinutes === "string" && rawMinutes.trim() ? Number(rawMinutes) : NaN;
    if (!Number.isFinite(date.getTime()) || date > now || !Number.isFinite(minutes) || minutes < 0) return [];
    return [{ id: typeof row.id === "string" || typeof row.id === "number" ? String(row.id) : `session-${index}`, title: typeof row.title === "string" && row.title.trim() ? row.title : "Study session", date, minutes }];
  }).sort((a, b) => b.date.getTime() - a.date.getTime());
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 6) % 7);
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday); date.setDate(date.getDate() + index);
    const end = new Date(date); end.setDate(end.getDate() + 1);
    return { date, minutes: sessions.filter(session => session.date >= date && session.date < end).reduce((sum, session) => sum + session.minutes, 0) };
  });
  return { sessions, week, totalMinutes: sessions.reduce((sum, session) => sum + session.minutes, 0), weeklyMinutes: week.reduce((sum, day) => sum + day.minutes, 0) };
}
export function checklistSummary(raw: string | null) {
  try {
    const value: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(value)) return { total: 0, completed: 0 };
    const tasks = value.filter((item): item is { completed: boolean } => !!item && typeof item === "object" && "completed" in item && typeof item.completed === "boolean");
    return { total: tasks.length, completed: tasks.filter(task => task.completed).length };
  } catch { return { total: 0, completed: 0 }; }
}
export function studyTimeLabel(minutes: number): string {
  if (minutes === 0) return "0 min";
  if (minutes < 1) return "<1 min";
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  return hours ? `${hours}h${rounded % 60 ? ` ${rounded % 60}m` : ""}` : `${rounded} min`;
}

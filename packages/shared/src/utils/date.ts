import { format, parseISO, isValid, startOfDay, endOfDay, subDays } from "date-fns";

export function formatDate(date: Date | string, pattern = "dd MMM yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return isValid(d) ? format(d, pattern) : "—";
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, "dd MMM yyyy, HH:mm");
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function last30Days(): { from: Date; to: Date } {
  const to = endOfDay(new Date());
  const from = startOfDay(subDays(to, 30));
  return { from, to };
}

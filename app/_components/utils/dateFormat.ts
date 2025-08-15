/* ---------- helpers ---------- */
export function formatDate(d?: string | Date) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return String(d);
  }
}
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function isToday(d?: string | Date) {
  if (!d) return false;
  const x = new Date(d);
  if (isNaN(x.getTime())) return false;
  const now = new Date();
  return (
    x.getFullYear() === now.getFullYear() &&
    x.getMonth() === now.getMonth() &&
    x.getDate() === now.getDate()
  );
}

export function formatMonthYear(d?: string | Date) {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x.getTime())) return String(d);
  return `${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
}

// For ranges like Employment/Education
export function formatRange(start?: string | Date, end?: string | Date | null) {
  if (start === null && end === null) return "Unknown";

  const startStr = formatMonthYear(start);
  if (!end) return startStr;

  const endStr = end && !isToday(end) ? formatMonthYear(end) : "Present";
  return `${startStr} – ${endStr}`;
}

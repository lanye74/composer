// -- Constants ----------------------------------------------------------------

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

// -- Public -------------------------------------------------------------------

function relativeTime(timestampMs: number, nowMs: number = Date.now()): string {
  const diff = nowMs - timestampMs;
  if (diff < 0) return "Just now";
  if (diff < MINUTE_MS) return "Just now";
  if (diff < HOUR_MS) {
    const mins = Math.floor(diff / MINUTE_MS);
    return mins === 1 ? "1 min" : `${mins} mins`;
  }
  if (diff < DAY_MS) return "Today";
  if (diff < 2 * DAY_MS) return "Yesterday";
  if (diff < WEEK_MS) {
    const days = Math.floor(diff / DAY_MS);
    return `${days} days`;
  }
  if (diff < MONTH_MS) {
    const weeks = Math.floor(diff / WEEK_MS);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  if (diff < YEAR_MS) {
    const months = Math.floor(diff / MONTH_MS);
    return months === 1 ? "1 month" : `${months} months`;
  }
  const years = Math.floor(diff / YEAR_MS);
  return years === 1 ? "1 year" : `${years} years`;
}

// -- Exports ------------------------------------------------------------------

export { relativeTime };

// All "now"/Date impurity lives here, in plain (non-component) functions —
// React's purity lint rule flags Date.now()/new Date() called directly inside
// a component body, including server components, so callers pass no
// date-shaped arguments and get fully-formed results back instead.

export function windowStart(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

export interface DayBucket {
  key: string; // YYYY-MM-DD
  label: string; // "24 Jul"
}

export function recentDayBuckets(count: number): DayBucket[] {
  const now = Date.now();
  const days: DayBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const day = new Date(now - i * 24 * 60 * 60 * 1000);
    days.push({
      key: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    });
  }
  return days;
}

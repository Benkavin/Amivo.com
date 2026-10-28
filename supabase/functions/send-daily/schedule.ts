// Pure scheduling helpers (no imports) so they're easy to test.

// How long after the chosen time we'll still send, in case a run is delayed.
export const WINDOW_MINUTES = 60;

export type Local = { date: string; minutes: number };

// The person's local date (YYYY-MM-DD) and minutes since midnight in their time zone.
export function localNow(now: Date, timeZone: string): Local {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

// "07:30" or "07:30:00" -> 450
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function isDue(enabled: boolean, time: string, lastSent: string | null, local: Local): boolean {
  if (!enabled || lastSent === local.date) return false;
  const target = toMinutes(time);
  return local.minutes >= target && local.minutes < target + WINDOW_MINUTES;
}

// Same day numbering the app uses, so the notification matches what's on screen.
export function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function pick<T>(list: T[], date: string): T {
  return list[dayNumber(date) % list.length];
}

// A person's categories are saved as "general" or a mix like "stress,gratitude,general".
// The mix takes turns day by day, and each category moves through its own list,
// the same way the app does it. Unknown categories are skipped.
export function pickFromMix(
  messages: Record<string, string[]>,
  category: string,
  date: string,
): { style: string; body: string } {
  const known = category.split(",").map((s) => s.trim()).filter((s) => messages[s]?.length);
  const mix = known.length ? known : ["general"];
  const n = dayNumber(date);
  const style = mix[n % mix.length];
  const list = messages[style];
  return { style, body: list[Math.floor(n / mix.length) % list.length] };
}

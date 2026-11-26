const zone = "Europe/Berlin";

const dateFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: zone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: zone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const berlinDate = (date: Date | string = new Date()) => dateFormat.format(new Date(date));
export const berlinTime = (date: Date | string) => timeFormat.format(new Date(date));

export function addCalendarDays(date: string, days: number) {
  const utc = new Date(date + "T00:00:00Z");
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function berlinInstant(date: string, time: string) {
  const wanted = date + "T" + time;
  const wallClock = Date.parse(wanted + ":00Z");
  // Try both German UTC offsets. Reject skipped and repeated wall-clock times.
  const candidates = [1, 2]
    .map((hours) => new Date(wallClock - hours * 3_600_000))
    .filter((value) => !Number.isNaN(value.getTime()) && berlinDate(value) + "T" + berlinTime(value) === wanted);
  if (candidates.length !== 1) {
    throw new Error("Europe/Berlin · " + wanted + " · DST time is missing or ambiguous.");
  }
  return candidates[0].toISOString();
}

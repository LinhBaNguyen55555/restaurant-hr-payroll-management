import { describe, expect, it } from "vitest";
import { addCalendarDays, berlinDate, berlinInstant, berlinTime } from "../lib/work-time";

describe("Berlin work times", () => {
  it("uses the offset of the working date and preserves the local day at midnight", () => {
    expect(berlinInstant("2026-01-10", "09:00")).toBe("2026-01-10T08:00:00.000Z");
    expect(berlinInstant("2026-07-10", "09:00")).toBe("2026-07-10T07:00:00.000Z");
    const midnight = berlinInstant(addCalendarDays("2026-12-31", 1), "00:00");
    expect(berlinDate(midnight)).toBe("2027-01-01");
    expect(berlinTime(midnight)).toBe("00:00");
  });

  it("rejects a skipped or ambiguous hour on a clock-change date", () => {
    expect(() => berlinInstant("2026-03-29", "02:30")).toThrow(/DST/);
    expect(() => berlinInstant("2026-10-25", "02:30")).toThrow(/DST/);
  });
});

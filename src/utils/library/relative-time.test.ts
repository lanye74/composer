import { describe, expect, it } from "vitest";
import { relativeTime } from "@/utils/library/relative-time";

const NOW = new Date("2026-06-13T12:00:00Z").getTime();
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

describe("relativeTime", () => {
  it("returns 'Just now' for sub-minute deltas", () => {
    expect(relativeTime(NOW - 30 * 1000, NOW)).toBe("Just now");
  });

  it("returns minute counts within the hour", () => {
    expect(relativeTime(NOW - 1 * MINUTE, NOW)).toBe("1 min");
    expect(relativeTime(NOW - 5 * MINUTE, NOW)).toBe("5 mins");
  });

  it("returns 'Today' for less than 24 hours", () => {
    expect(relativeTime(NOW - 3 * HOUR, NOW)).toBe("Today");
  });

  it("returns 'Yesterday' for the second day", () => {
    expect(relativeTime(NOW - 1 * DAY - 1 * HOUR, NOW)).toBe("Yesterday");
  });

  it("returns N days within the week", () => {
    expect(relativeTime(NOW - 3 * DAY, NOW)).toBe("3 days");
    expect(relativeTime(NOW - 6 * DAY, NOW)).toBe("6 days");
  });

  it("returns N weeks within the month", () => {
    expect(relativeTime(NOW - 1 * WEEK, NOW)).toBe("1 week");
    expect(relativeTime(NOW - 3 * WEEK, NOW)).toBe("3 weeks");
  });

  it("returns N months within the year", () => {
    expect(relativeTime(NOW - 1 * MONTH, NOW)).toBe("1 month");
    expect(relativeTime(NOW - 6 * MONTH, NOW)).toBe("6 months");
  });

  it("returns N years past the year boundary", () => {
    expect(relativeTime(NOW - 1 * YEAR, NOW)).toBe("1 year");
    expect(relativeTime(NOW - 2 * YEAR, NOW)).toBe("2 years");
  });

  describe("edge cases", () => {
    it("returns 'Just now' for future timestamps", () => {
      expect(relativeTime(NOW + 5 * MINUTE, NOW)).toBe("Just now");
    });

    it("handles the zero delta", () => {
      expect(relativeTime(NOW, NOW)).toBe("Just now");
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  startOfLocalDay,
  calendarDaysBetween,
  localWeekday,
  startOfLocalWeek,
  isoDateLocal,
} from "@/lib/utils/dates";

// These tests rely on APP_TIMEZONE=Europe/Moscow (UTC+3, no DST) from setup.ts.

describe("dates (Europe/Moscow)", () => {
  it("startOfLocalDay returns the instant of local midnight", () => {
    // 2026-04-18 10:00 UTC = 2026-04-18 13:00 Moscow
    const d = new Date("2026-04-18T10:00:00Z");
    const mid = startOfLocalDay(d);
    // Moscow midnight = 2026-04-18 00:00 Moscow = 2026-04-17 21:00 UTC
    expect(mid.toISOString()).toBe("2026-04-17T21:00:00.000Z");
  });

  it("calendarDaysBetween respects local midnight boundaries", () => {
    // Moscow 23:30 on Apr 18 is still Apr 18 locally;
    // Moscow 00:30 on Apr 19 is Apr 19 locally — diff = 1.
    const a = new Date("2026-04-18T20:30:00Z"); // = Apr 18 23:30 MSK
    const b = new Date("2026-04-18T21:30:00Z"); // = Apr 19 00:30 MSK
    expect(calendarDaysBetween(a, b)).toBe(1);
  });

  it("localWeekday matches DOW in local tz", () => {
    // 2026-04-18 is a Saturday -> 6
    expect(localWeekday(new Date("2026-04-18T12:00:00Z"))).toBe(6);
    // 2026-04-20 is a Monday -> 1
    expect(localWeekday(new Date("2026-04-20T12:00:00Z"))).toBe(1);
  });

  it("startOfLocalWeek snaps to Monday 00:00 local", () => {
    // Sat 2026-04-18 local -> week starts Mon 2026-04-13.
    const ws = startOfLocalWeek(new Date("2026-04-18T12:00:00Z"));
    // Monday 2026-04-13 00:00 MSK = 2026-04-12 21:00 UTC
    expect(ws.toISOString()).toBe("2026-04-12T21:00:00.000Z");
  });

  it("isoDateLocal formats yyyy-MM-dd in local tz", () => {
    expect(isoDateLocal(new Date("2026-04-18T10:00:00Z"))).toBe("2026-04-18");
    // 2026-01-01 22:00 UTC is already 2026-01-02 01:00 MSK.
    expect(isoDateLocal(new Date("2026-01-01T22:00:00Z"))).toBe("2026-01-02");
  });
});

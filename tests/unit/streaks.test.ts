import { describe, it, expect } from "vitest";
import { nextStreakValue } from "@/lib/services/streaks";
import { startOfLocalDay } from "@/lib/utils/dates";

function day(iso: string): Date {
  return startOfLocalDay(new Date(`${iso}T12:00:00Z`));
}

describe("nextStreakValue", () => {
  it("first approval starts streak at 1", () => {
    expect(
      nextStreakValue({ currentStreak: 0, lastStreakDate: null, today: day("2026-04-18") }),
    ).toBe(1);
  });

  it("same local day → no change", () => {
    const today = day("2026-04-18");
    expect(
      nextStreakValue({ currentStreak: 3, lastStreakDate: today, today }),
    ).toBe(3);
  });

  it("next day → increment", () => {
    expect(
      nextStreakValue({
        currentStreak: 2,
        lastStreakDate: day("2026-04-17"),
        today: day("2026-04-18"),
      }),
    ).toBe(3);
  });

  it("gap of 2+ days → reset to 1", () => {
    expect(
      nextStreakValue({
        currentStreak: 5,
        lastStreakDate: day("2026-04-15"),
        today: day("2026-04-18"),
      }),
    ).toBe(1);
  });

  it("backdated (lastStreakDate in the future) still behaves as same-day if diff=0", () => {
    const d = day("2026-04-18");
    expect(
      nextStreakValue({ currentStreak: 7, lastStreakDate: d, today: d }),
    ).toBe(7);
  });
});

import { describe, it, expect } from "vitest";
import { getLevelInfo, getLevelForPoints } from "@/lib/utils/leveling";
import { LEVEL_THRESHOLDS } from "@/config/levels";

describe("leveling", () => {
  it("level 1 at 0 points", () => {
    const info = getLevelInfo(0);
    expect(info.level).toBe(1);
    expect(info.pointsIntoLevel).toBe(0);
    expect(info.progressPercent).toBe(0);
  });

  it("snaps up exactly at threshold", () => {
    expect(getLevelForPoints(100)).toBe(2);
    expect(getLevelForPoints(99)).toBe(1);
    expect(getLevelForPoints(250)).toBe(3);
    expect(getLevelForPoints(249)).toBe(2);
  });

  it("reaches max level", () => {
    const max = LEVEL_THRESHOLDS.length;
    const info = getLevelInfo(LEVEL_THRESHOLDS[max - 1]! + 1000);
    expect(info.level).toBe(max);
    expect(info.pointsForNextLevel).toBeNull();
    expect(info.progressPercent).toBe(100);
  });

  it("interpolates progress in the middle of a level", () => {
    // Level 2 spans [100, 250). 175 is halfway.
    const info = getLevelInfo(175);
    expect(info.level).toBe(2);
    expect(info.pointsIntoLevel).toBe(75);
    expect(info.pointsForNextLevel).toBe(75);
    expect(info.progressPercent).toBe(50);
  });

  it("clamps negative points to 0", () => {
    const info = getLevelInfo(-50);
    expect(info.level).toBe(1);
    expect(info.pointsIntoLevel).toBe(0);
  });

  it("returns progressPercent in [0, 100]", () => {
    for (const p of [0, 50, 100, 500, 999, 4000, 10_000]) {
      const info = getLevelInfo(p);
      expect(info.progressPercent).toBeGreaterThanOrEqual(0);
      expect(info.progressPercent).toBeLessThanOrEqual(100);
    }
  });
});

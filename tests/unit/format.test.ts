import { describe, it, expect } from "vitest";
import {
  pluralizePoints,
  formatPoints,
  formatSignedPoints,
} from "@/lib/utils/format";

describe("pluralizePoints", () => {
  it("uses 'очко' for 1, 21, 101", () => {
    expect(pluralizePoints(1)).toBe("очко");
    expect(pluralizePoints(21)).toBe("очко");
    expect(pluralizePoints(101)).toBe("очко");
  });

  it("uses 'очка' for 2-4, 22-24", () => {
    for (const n of [2, 3, 4, 22, 23, 24, 102, 104]) {
      expect(pluralizePoints(n)).toBe("очка");
    }
  });

  it("uses 'очков' for 0, 5-20, 11-14, 25", () => {
    for (const n of [0, 5, 10, 11, 12, 13, 14, 15, 19, 20, 25, 100, 111, 112]) {
      expect(pluralizePoints(n)).toBe("очков");
    }
  });

  it("ignores sign", () => {
    expect(pluralizePoints(-1)).toBe("очко");
    expect(pluralizePoints(-3)).toBe("очка");
    expect(pluralizePoints(-5)).toBe("очков");
  });
});

describe("formatPoints", () => {
  it("formats with correct noun form", () => {
    expect(formatPoints(1)).toBe("1 очко");
    expect(formatPoints(3)).toBe("3 очка");
    expect(formatPoints(5)).toBe("5 очков");
    expect(formatPoints(0)).toBe("0 очков");
  });
});

describe("formatSignedPoints", () => {
  it("adds a leading + for positives", () => {
    expect(formatSignedPoints(5)).toBe("+5 очков");
    expect(formatSignedPoints(1)).toBe("+1 очко");
  });

  it("keeps the minus for negatives", () => {
    expect(formatSignedPoints(-3)).toBe("-3 очка");
  });

  it("zero without sign", () => {
    expect(formatSignedPoints(0)).toBe("0 очков");
  });
});

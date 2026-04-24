import { describe, it, expect } from "vitest";
import type { TaskDefinition } from "@prisma/client";
import { shouldGenerateOn } from "@/lib/services/tasks";

function make(partial: Partial<TaskDefinition>): TaskDefinition {
  return {
    id: "t1",
    title: "x",
    description: null,
    categoryId: "c1",
    points: 10,
    recurrenceType: "NONE",
    recurrenceDays: null,
    isActive: true,
    createdById: "u1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as TaskDefinition;
}

describe("shouldGenerateOn", () => {
  const now = new Date("2026-04-20T12:00:00Z"); // Monday

  it("NONE never generates", () => {
    expect(shouldGenerateOn(make({ recurrenceType: "NONE" }), now, 1)).toBe(false);
  });

  it("DAILY always generates", () => {
    for (let dow = 0; dow < 7; dow++) {
      expect(shouldGenerateOn(make({ recurrenceType: "DAILY" }), now, dow)).toBe(true);
    }
  });

  it("WEEKLY generates only on Monday", () => {
    expect(shouldGenerateOn(make({ recurrenceType: "WEEKLY" }), now, 1)).toBe(true);
    for (const dow of [0, 2, 3, 4, 5, 6]) {
      expect(shouldGenerateOn(make({ recurrenceType: "WEEKLY" }), now, dow)).toBe(false);
    }
  });

  it("WEEKDAYS matches selected days", () => {
    const def = make({
      recurrenceType: "WEEKDAYS",
      recurrenceDays: JSON.stringify([1, 3, 5]),
    });
    expect(shouldGenerateOn(def, now, 1)).toBe(true);
    expect(shouldGenerateOn(def, now, 3)).toBe(true);
    expect(shouldGenerateOn(def, now, 5)).toBe(true);
    expect(shouldGenerateOn(def, now, 0)).toBe(false);
    expect(shouldGenerateOn(def, now, 2)).toBe(false);
    expect(shouldGenerateOn(def, now, 6)).toBe(false);
  });

  it("WEEKDAYS with null recurrenceDays returns false", () => {
    const def = make({ recurrenceType: "WEEKDAYS", recurrenceDays: null });
    expect(shouldGenerateOn(def, now, 1)).toBe(false);
  });

  it("WEEKDAYS with malformed JSON returns false", () => {
    const def = make({ recurrenceType: "WEEKDAYS", recurrenceDays: "not-json" });
    expect(shouldGenerateOn(def, now, 1)).toBe(false);
  });
});

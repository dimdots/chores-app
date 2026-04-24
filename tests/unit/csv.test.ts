import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/utils/csv";

const BOM = "\uFEFF";

describe("toCsv", () => {
  it("prepends BOM and includes header row", () => {
    const csv = toCsv([{ a: 1, b: 2 }]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv).toContain("a,b");
    expect(csv).toContain("1,2");
  });

  it("escapes quotes, commas, newlines", () => {
    const csv = toCsv([{ a: 'he said "hi, y\'all"', b: "line1\nline2" }]);
    expect(csv).toContain('"he said ""hi, y\'all"""');
    expect(csv).toContain('"line1\nline2"');
  });

  it("renders empty array with just BOM + newline", () => {
    expect(toCsv([])).toBe(`${BOM}\n`);
  });

  it("serializes dates as ISO strings", () => {
    const d = new Date("2025-01-02T03:04:05Z");
    const csv = toCsv([{ when: d }]);
    expect(csv).toContain(d.toISOString());
  });

  it("renders null and undefined as empty", () => {
    const csv = toCsv([{ a: null, b: undefined, c: 0 }]);
    // Header present, second row should be ",,0"
    expect(csv).toContain(",,0");
  });

  it("preserves Cyrillic text as-is after BOM", () => {
    const csv = toCsv([{ name: "Саша", points: 10 }]);
    expect(csv).toContain("Саша");
  });
});

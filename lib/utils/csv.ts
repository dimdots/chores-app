/**
 * Minimal CSV writer with UTF-8 BOM so Excel opens Russian text correctly.
 * Header row is required. Values are stringified and escaped per RFC 4180.
 */
export function toCsv(rows: ReadonlyArray<Record<string, unknown>>): string {
  if (rows.length === 0) return "\uFEFF\n";
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = v instanceof Date ? v.toISOString() : String(v);
    if (s.includes(",") || s.includes("\"") || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines: string[] = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return "\uFEFF" + lines.join("\n") + "\n";
}

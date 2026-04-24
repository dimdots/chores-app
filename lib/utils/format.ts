/**
 * Russian pluralization for "очко / очка / очков".
 * Rules: 1, 21, 31… → "очко"; 2-4, 22-24… → "очка"; 0, 5-20, 25-30… → "очков".
 */
export function pluralizePoints(n: number): string {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return "очков";
  if (mod10 === 1) return "очко";
  if (mod10 >= 2 && mod10 <= 4) return "очка";
  return "очков";
}

export function formatPoints(n: number): string {
  return `${n} ${pluralizePoints(n)}`;
}

export function formatSignedPoints(n: number): string {
  if (n > 0) return `+${n} ${pluralizePoints(n)}`;
  if (n < 0) return `${n} ${pluralizePoints(n)}`;
  return `0 ${pluralizePoints(0)}`;
}

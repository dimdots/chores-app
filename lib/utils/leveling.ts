import { LEVEL_THRESHOLDS } from "@/config/levels";

export type LevelInfo = {
  level: number;
  pointsIntoLevel: number;
  pointsForNextLevel: number | null;
  progressPercent: number; // 0..100. 100 if max level reached.
};

/** Pure level math — unit-testable, no DB. */
export function getLevelInfo(points: number): LevelInfo {
  const thresholds = LEVEL_THRESHOLDS;
  const p = Math.max(0, points);
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (p >= thresholds[i]!) level = i + 1;
    else break;
  }
  const currentFloor = thresholds[level - 1] ?? 0;
  const nextFloor = thresholds[level]; // may be undefined at max level
  if (nextFloor === undefined) {
    return {
      level,
      pointsIntoLevel: p - currentFloor,
      pointsForNextLevel: null,
      progressPercent: 100,
    };
  }
  const span = nextFloor - currentFloor;
  const into = p - currentFloor;
  const pct = span <= 0 ? 100 : Math.min(100, Math.round((into / span) * 100));
  return {
    level,
    pointsIntoLevel: into,
    pointsForNextLevel: nextFloor - p,
    progressPercent: pct,
  };
}

export function getLevelForPoints(points: number): number {
  return getLevelInfo(points).level;
}

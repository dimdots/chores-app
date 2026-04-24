// Level thresholds. Edit this file to change the leveling curve.
// A child is at level N if their currentPoints >= LEVEL_THRESHOLDS[N-1]
// and (N == LEVEL_THRESHOLDS.length || currentPoints < LEVEL_THRESHOLDS[N]).

export const LEVEL_THRESHOLDS: readonly number[] = [
  0, // Level 1
  100, // Level 2
  250, // Level 3
  500, // Level 4
  800, // Level 5
  1200, // Level 6
  1700, // Level 7
  2300, // Level 8
  3000, // Level 9
  4000, // Level 10
] as const;

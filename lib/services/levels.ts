// Thin wrapper around the pure leveling math so the services layer
// has a single import site. Actual math lives in lib/utils/leveling.ts.
export { getLevelInfo, getLevelForPoints } from "@/lib/utils/leveling";
export type { LevelInfo } from "@/lib/utils/leveling";

import { getLevelInfo as _g, type LevelInfo } from "@/lib/utils/leveling";

export function getProgressToNextLevel(points: number): LevelInfo {
  return _g(points);
}

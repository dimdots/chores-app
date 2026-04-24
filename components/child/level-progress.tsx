import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { t } from "@/lib/i18n/ru";
import type { LevelInfo } from "@/lib/utils/leveling";
import { pluralizePoints } from "@/lib/utils/format";

export function LevelProgress({ info }: { info: LevelInfo }) {
  return (
    <Card>
      <CardContent>
        <div className="flex justify-between items-baseline">
          <p className="text-sm text-slate-500">{t.childDashboard.progressToNext}</p>
          <p className="text-sm font-medium text-slate-900">
            {info.pointsForNextLevel === null
              ? "Макс. уровень"
              : `${info.pointsForNextLevel} ${pluralizePoints(info.pointsForNextLevel)}`}
          </p>
        </div>
        <div className="mt-3">
          <Progress value={info.progressPercent} />
        </div>
      </CardContent>
    </Card>
  );
}

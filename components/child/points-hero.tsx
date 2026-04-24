import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n/ru";
import { pluralizePoints } from "@/lib/utils/format";

export function PointsHero({
  name,
  points,
  level,
  streak,
}: {
  name: string;
  points: number;
  level: number;
  streak: number;
}) {
  return (
    <Card className="bg-gradient-to-br from-brand-500 to-brand-700 text-white border-0 shadow-float">
      <div className="p-6">
        <p className="text-brand-100 text-sm">
          {t.childDashboard.hello}, {name}!
        </p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-5xl font-semibold leading-none tabular-nums">{points}</span>
          <span className="text-brand-100 pb-1">{pluralizePoints(points)}</span>
        </div>
        <div className="mt-4 flex items-center gap-3 text-sm">
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1">
            ★ {t.childDashboard.level} {level}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1">
            🔥 {streak > 0 ? `${streak} ${t.childDashboard.days}` : t.childDashboard.streakZero}
          </span>
        </div>
      </div>
    </Card>
  );
}

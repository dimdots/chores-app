import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatPoints } from "@/lib/utils/format";
import { t } from "@/lib/i18n/ru";

export function ChildSummaryCard({
  childId,
  displayName,
  points,
  level,
  streak,
}: {
  childId: string;
  displayName: string;
  points: number;
  level: number;
  streak: number;
}) {
  return (
    <Link href={`/parent/children/${childId}`}>
      <Card className="hover:shadow-float transition-shadow">
        <CardContent>
          <p className="text-sm text-slate-500">{displayName}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
            {formatPoints(points)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t.childDashboard.level} {level} · 🔥 {streak} {t.childDashboard.days}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

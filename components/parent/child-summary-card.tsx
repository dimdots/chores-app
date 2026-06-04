"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatPoints } from "@/lib/utils/format";
import { useT, useLocale } from "@/lib/i18n/client";

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
  const t = useT();
  const locale = useLocale();
  return (
    <Link href={`/parent/children/${childId}`}>
      <Card className="hover:shadow-float transition-shadow">
        <CardContent>
          <p className="text-sm text-slate-500">{displayName}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
            {formatPoints(points, locale)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t.childDashboard.level} {level} ·{" "}
            <span className="cursor-help" title={t.childDashboard.streakHelp}>
              🔥 {streak} {t.childDashboard.days} <span aria-hidden className="opacity-70">ⓘ</span>
            </span>
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

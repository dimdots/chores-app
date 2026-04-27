import Link from "next/link";
import { notFound } from "next/navigation";
import { requireParent } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { getWeeklyPointsSeries } from "@/lib/services/reports";
import { calculateChildBalanceFromLedgerOrValidatedState } from "@/lib/services/points";
import { titlesForActivityLogs } from "@/lib/services/activity-log";
import { getLevelInfo } from "@/lib/utils/leveling";
import { WeeklyChart } from "@/components/parent/weekly-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TaskStatusPill, RewardStatusPill } from "@/components/shared/status-pill";
import { t } from "@/lib/i18n/ru";
import { formatDateTimeRu, formatDateRu, startOfLocalWeek } from "@/lib/utils/dates";
import { formatPoints, formatSignedPoints } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const DAY_LABELS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default async function ChildDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireParent();
  const child = await prisma.childProfile.findUnique({
    where: { id: params.id },
    include: { user: true },
  });
  if (!child) notFound();

  const weekStart = startOfLocalWeek();
  const [weekly, recentTasks, recentRewards, recentActivity, check] = await Promise.all([
    getWeeklyPointsSeries(child.id, weekStart),
    prisma.assignedTask.findMany({
      where: { childId: child.id },
      include: { taskDefinition: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.rewardRequest.findMany({
      where: { childId: child.id },
      include: { reward: true },
      orderBy: { requestedAt: "desc" },
      take: 10,
    }),
    prisma.activityLog.findMany({
      where: { childId: child.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    calculateChildBalanceFromLedgerOrValidatedState(child.id),
  ]);

  const activityTitles = await titlesForActivityLogs(recentActivity);
  // Level comes from lifetimePoints (cumulative earned) so a kid who spent
  // points on a reward doesn't appear to have lost progress on this page.
  const level = getLevelInfo(child.lifetimePoints);
  const chartData = weekly.series.map((p) => {
    const dt = new Date(`${p.date}T00:00:00`);
    const dow = (dt.getDay() + 6) % 7;
    return {
      date: p.date,
      points: p.points,
      label: DAY_LABELS_RU[dow] ?? p.date.slice(5),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{child.displayName}</h1>
        <Link href="/parent/settings">
          <Button size="sm" variant="secondary">
            {t.settings.title}
          </Button>
        </Link>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">{t.parentDashboard.balance}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatPoints(child.currentPoints)}
            </p>
            {!check.consistent ? (
              <p className="text-xs text-danger-700 mt-2">
                ⚠️ Ledger: {formatPoints(check.recomputed)}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">{t.childDashboard.level}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{level.level}</p>
            <div className="mt-2">
              <Progress value={level.progressPercent} />
              <p className="text-xs text-slate-500 mt-1">
                {level.pointsIntoLevel}/{level.pointsForNextLevel}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">{t.childDashboard.streak}</p>
            <p className="mt-1 text-2xl font-semibold">🔥 {child.currentStreak}</p>
            <p className="text-xs text-slate-500 mt-1">
              {t.app.today}: {formatDateRu(new Date())}
            </p>
          </CardContent>
        </Card>
      </section>

      <WeeklyChart
        title={`${t.reports.weekly} (${weekly.total})`}
        data={chartData}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t.tasks.list}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTasks.length === 0 ? (
            <p className="text-sm text-slate-500">{t.reports.noData}</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {recentTasks.map((r) => (
                <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{r.taskDefinition.title}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {r.taskDefinition.category.name} · {formatDateRu(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone="brand">+{r.taskDefinition.points}</Badge>
                    <TaskStatusPill status={r.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.rewards.list}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentRewards.length === 0 ? (
            <p className="text-sm text-slate-500">{t.reports.noData}</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {recentRewards.map((r) => (
                <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{r.reward.title}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {formatDateRu(r.requestedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-500">{formatPoints(r.costAtRequest)}</span>
                    <RewardStatusPill status={r.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.parentDashboard.recentActivity}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500">{t.reports.noData}</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {recentActivity.map((r) => {
                const label = activityTitles.get(r.id) ?? "";
                return (
                  <li key={r.id} className="py-2 flex items-start justify-between gap-3">
                    <span className="break-words min-w-0">
                      {t.activity[r.eventType as keyof typeof t.activity] ?? r.eventType}
                      {label ? (
                        <span className="text-slate-900 font-medium"> · {label}</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-slate-500 shrink-0 text-right">
                      {formatDateTimeRu(r.createdAt)}
                      {r.pointsDelta !== 0 ? ` · ${formatSignedPoints(r.pointsDelta)}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { requireParent } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  getWeeklyPointsSeries,
  getMostCompletedTasks,
  getRewardHistory,
  getActivityHistory,
} from "@/lib/services/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeeklyChart } from "@/components/parent/weekly-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/ru";
import {
  formatDateTimeRu,
  formatDateRu,
  isoDateLocal,
  startOfLocalDay,
  startOfLocalWeek,
} from "@/lib/utils/dates";
import { formatPoints, formatSignedPoints } from "@/lib/utils/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DAY_LABELS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function parseDate(input?: string): Date | undefined {
  if (!input) return undefined;
  const d = new Date(`${input}T00:00:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  return startOfLocalDay(d);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { childId?: string; from?: string; to?: string };
}) {
  await requireParent();
  const childId = searchParams?.childId?.trim() || "";
  const from = parseDate(searchParams?.from);
  const to = parseDate(searchParams?.to);

  const [children, weekStart] = await Promise.all([
    prisma.childProfile.findMany({
      include: { user: true },
      orderBy: { displayName: "asc" },
    }),
    Promise.resolve(startOfLocalWeek()),
  ]);

  const activeChildId = childId && children.some((c) => c.id === childId) ? childId : "";

  const [weekly, topChores, rewardHistory, activity] = await Promise.all([
    Promise.all(
      (activeChildId ? children.filter((c) => c.id === activeChildId) : children).map((c) =>
        getWeeklyPointsSeries(c.id, weekStart),
      ),
    ),
    getMostCompletedTasks(from ?? weekStart, 10),
    getRewardHistory(activeChildId || undefined, 50),
    getActivityHistory({
      childId: activeChildId || undefined,
      from,
      to,
      limit: 100,
    }),
  ]);

  const exportQS = new URLSearchParams();
  if (activeChildId) exportQS.set("childId", activeChildId);
  if (from) exportQS.set("from", isoDateLocal(from));
  if (to) exportQS.set("to", isoDateLocal(to));
  const qs = exportQS.toString();
  const qsSuffix = qs ? `?${qs}` : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t.reports.title}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.app.actions}</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px_auto] gap-2 items-end">
            <div>
              <label className="block text-sm text-slate-700 mb-1">{t.settings.children}</label>
              <select
                name="childId"
                defaultValue={activeChildId}
                className="block w-full h-11 rounded-xl border border-slate-200 bg-white px-3"
              >
                <option value="">{t.app.all}</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">{t.reports.dateFrom}</label>
              <input
                type="date"
                name="from"
                defaultValue={searchParams?.from ?? ""}
                className="block w-full h-11 rounded-xl border border-slate-200 bg-white px-3"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">{t.reports.dateTo}</label>
              <input
                type="date"
                name="to"
                defaultValue={searchParams?.to ?? ""}
                className="block w-full h-11 rounded-xl border border-slate-200 bg-white px-3"
              />
            </div>
            <Button type="submit">{t.app.confirm}</Button>
          </form>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weekly.length === 0 ? (
          <EmptyState title={t.reports.noData} />
        ) : (
          weekly.map((w) => {
            const child = children.find((c) => c.id === w.childId);
            if (!child) return null;
            const chartData = w.series.map((p) => {
              const dt = new Date(`${p.date}T00:00:00`);
              const dow = (dt.getDay() + 6) % 7;
              return {
                date: p.date,
                points: p.points,
                label: DAY_LABELS_RU[dow] ?? p.date.slice(5),
              };
            });
            return (
              <WeeklyChart
                key={w.childId}
                title={`${child.displayName} · ${t.reports.weekly} (${w.total})`}
                data={chartData}
              />
            );
          })
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t.reports.topChores}</CardTitle>
        </CardHeader>
        <CardContent>
          {topChores.length === 0 ? (
            <p className="text-sm text-slate-500">{t.reports.noData}</p>
          ) : (
            <ul className="space-y-1">
              {topChores.map((c) => (
                <li key={c.definition.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">
                    <span className="text-slate-500 mr-1">{c.definition.category.name}</span>
                    {c.definition.title}
                  </span>
                  <span className="text-slate-500">{c.count}×</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.reports.rewardsHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {rewardHistory.length === 0 ? (
            <p className="text-sm text-slate-500">{t.reports.noData}</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {rewardHistory.slice(0, 20).map((r) => (
                <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.reward.title}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {r.child.displayName} · {formatDateRu(r.requestedAt)} ·{" "}
                      {r.status === "PENDING"
                        ? t.rewards.pending
                        : r.status === "APPROVED"
                          ? t.tasks.status.APPROVED
                          : t.tasks.status.REJECTED}
                    </p>
                  </div>
                  <span className="shrink-0 text-slate-500">{formatPoints(r.costAtRequest)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.reports.activity}</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500">{t.reports.noData}</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {activity.slice(0, 30).map((r) => (
                <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                  <span className="truncate">
                    {t.activity[r.eventType as keyof typeof t.activity] ?? r.eventType}
                    {r.child ? ` · ${r.child.displayName}` : ""}
                  </span>
                  <span className="text-xs text-slate-500 shrink-0">
                    {formatDateTimeRu(r.createdAt)}
                    {r.pointsDelta !== 0 ? ` · ${formatSignedPoints(r.pointsDelta)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.reports.export}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href={`/api/export/activity${qsSuffix}`}>
              <Button variant="secondary" size="sm">
                {t.reports.exportActivity}
              </Button>
            </Link>
            <Link href={`/api/export/tasks${qsSuffix}`}>
              <Button variant="secondary" size="sm">
                {t.reports.exportTasks}
              </Button>
            </Link>
            <Link href={`/api/export/points${qsSuffix}`}>
              <Button variant="secondary" size="sm">
                {t.reports.exportPoints}
              </Button>
            </Link>
            <Link href={`/api/export/rewards${qsSuffix}`}>
              <Button variant="secondary" size="sm">
                {t.reports.exportRewards}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { requireParent } from "@/lib/auth/permissions";
import { getParentDashboardData } from "@/lib/services/children";
import { ChildSummaryCard } from "@/components/parent/child-summary-card";
import {
  ChildTodayTasks,
  type ParentTodayTaskRow,
} from "@/components/parent/child-today-tasks";
import { QuickActions } from "@/components/parent/quick-actions";
import { WeeklyChart } from "@/components/parent/weekly-chart";
import { RecentActivity } from "@/components/shared/recent-activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ParentDashboard() {

  const t = getT();
  const session = await requireParent();
  const data = await getParentDashboardData(session.familyId, session.userId);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {data.children.length === 0 ? (
          <EmptyState title={t.settings.noChildren} />
        ) : (
          data.children.map((c) => (
            <ChildSummaryCard
              key={c.id}
              childId={c.id}
              displayName={c.displayName}
              points={c.currentPoints}
              level={c.currentLevel}
              streak={c.currentStreak}
            />
          ))
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickActions />
        <Card>
          <CardHeader>
            <CardTitle>{t.parentDashboard.topChores}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topChores.length === 0 ? (
              <p className="text-sm text-slate-500">{t.reports.noData}</p>
            ) : (
              <ul className="space-y-2">
                {data.topChores.map((c) => (
                  <li
                    key={c.definition.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <span className="break-words min-w-0">{c.definition.title}</span>
                    <span className="text-slate-500 shrink-0">{c.count}×</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {data.todayTasksByChild.length > 0 ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.todayTasksByChild.map(({ child, tasks }) => {
            const rows: ParentTodayTaskRow[] = tasks.map((task) => ({
              id: task.id,
              title: task.taskDefinition.title,
              category: task.taskDefinition.category.name,
              points: task.taskDefinition.points,
              status: task.status,
            }));
            return (
              <ChildTodayTasks
                key={child.id}
                childId={child.id}
                childName={child.displayName}
                tasks={rows}
              />
            );
          })}
        </section>
      ) : null}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.weekly.map((w, i) => {
          const child = data.children[i];
          if (!child) return null;
          const chartData = w.series.map((p) => {
            const dt = new Date(p.date);
            const dow = (dt.getDay() + 6) % 7; // 0=Mon
            return {
              date: p.date,
              points: p.points,
              label: t.app.weekdaysShort[dow] ?? p.date.slice(5),
            };
          });
          return (
            <WeeklyChart
              key={child.id}
              title={`${child.displayName} · ${t.parentDashboard.weeklySummary} (${w.total})`}
              data={chartData}
            />
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t.parentDashboard.recentActivity}</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivity items={data.recent} />
        </CardContent>
      </Card>
    </div>
  );
}

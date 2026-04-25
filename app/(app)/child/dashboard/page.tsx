import { requireChild } from "@/lib/auth/permissions";
import { getChildDashboardData } from "@/lib/services/children";
import { PointsHero } from "@/components/child/points-hero";
import { LevelProgress } from "@/components/child/level-progress";
import { TaskTileGroup } from "@/components/child/task-tile-group";
import type { ChildTaskTileData } from "@/components/child/task-tile";
import { RewardTile } from "@/components/child/reward-tile";
import { ReactionBar } from "@/components/shared/reaction-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n/ru";
import { formatDateTimeRu } from "@/lib/utils/dates";
import { formatSignedPoints } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function ChildDashboard() {
  const session = await requireChild();
  const data = await getChildDashboardData(session.childId, session.userId);

  const toTile = (
    task: (typeof data.todayTasks)[number],
  ): ChildTaskTileData => ({
    id: task.id,
    title: task.taskDefinition.title,
    category: task.taskDefinition.category.name,
    points: task.taskDefinition.points,
    status: task.status,
  });
  const today = data.todayTasks.filter((t_) => t_.status === "ASSIGNED").map(toTile);
  // Pending rows only exist from the pre-pivot era; we still show them so
  // stale rows don't become invisible.
  const pending = data.todayTasks
    .filter((t_) => t_.status === "PENDING_APPROVAL")
    .map(toTile);
  const rewardsTop = data.rewards.slice(0, 5);

  return (
    <div className="space-y-6">
      <PointsHero
        name={data.profile.displayName}
        points={data.profile.currentPoints}
        level={data.levelInfo.level}
        streak={data.profile.currentStreak}
      />
      <LevelProgress info={data.levelInfo} />

      <section>
        <h2 className="text-lg font-semibold mb-3">{t.childDashboard.today}</h2>
        {today.length === 0 ? (
          <EmptyState title={t.childDashboard.allDone} />
        ) : (
          <TaskTileGroup scope="child-dashboard-today" tasks={today} />
        )}
      </section>

      {pending.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold mb-3">{t.childDashboard.pending}</h2>
          <TaskTileGroup scope="child-dashboard-pending" tasks={pending} />
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold mb-3">{t.childDashboard.rewardsAvailable}</h2>
        {rewardsTop.length === 0 ? (
          <EmptyState title={t.rewards.empty} />
        ) : (
          <div className="space-y-2">
            {rewardsTop.map((r) => (
              <RewardTile key={r.id} reward={r} />
            ))}
          </div>
        )}
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>{t.childDashboard.recent}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent.length === 0 ? (
              <p className="text-sm text-slate-500">{t.app.empty}</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {data.recent.map((r) => (
                  <li key={r.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-700 truncate">
                        {t.activity[r.eventType as keyof typeof t.activity] ?? r.eventType}
                        {r.referenceLabel ? (
                          <span className="text-slate-900 font-medium"> · {r.referenceLabel}</span>
                        ) : null}
                      </span>
                      <span className="text-xs text-slate-500 shrink-0">
                        {formatDateTimeRu(r.createdAt)}
                        {r.pointsDelta !== 0 ? ` · ${formatSignedPoints(r.pointsDelta)}` : ""}
                      </span>
                    </div>
                    <ReactionBar
                      activityLogId={r.id}
                      counts={r.reactions.counts}
                      mine={r.reactions.mine}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

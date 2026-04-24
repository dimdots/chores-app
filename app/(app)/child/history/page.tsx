import { requireChild } from "@/lib/auth/permissions";
import { listChildTaskHistory } from "@/lib/services/tasks";
import { listChildRewardHistory } from "@/lib/services/rewards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskStatusPill, RewardStatusPill } from "@/components/shared/status-pill";
import { t } from "@/lib/i18n/ru";
import { formatDateTimeRu } from "@/lib/utils/dates";
import { formatSignedPoints } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function ChildHistory() {
  const s = await requireChild();
  const [tasks, rewards] = await Promise.all([
    listChildTaskHistory(s.childId, 50),
    listChildRewardHistory(s.childId, 50),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t.nav.history}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t.tasks.list}</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <EmptyState title={t.app.empty} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <li key={task.id} className="py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {task.taskDefinition.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {task.approvedAt ? formatDateTimeRu(task.approvedAt) : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-brand-700 font-medium">
                      {formatSignedPoints(task.pointsAwarded)}
                    </p>
                    <TaskStatusPill status={task.status} />
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
          {rewards.length === 0 ? (
            <EmptyState title={t.app.empty} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rewards.map((r) => (
                <li key={r.id} className="py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {r.reward.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTimeRu(r.requestedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-700">
                      {r.status === "APPROVED"
                        ? formatSignedPoints(-r.costAtRequest)
                        : `${r.costAtRequest} ${t.app.pointsShort}`}
                    </p>
                    <RewardStatusPill status={r.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

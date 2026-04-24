import { requireParent } from "@/lib/auth/permissions";
import { listAllPendingApprovals } from "@/lib/services/approvals";
import {
  TaskApprovalCard,
  RewardApprovalCard,
} from "@/components/parent/approval-card";
import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n/ru";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  await requireParent();
  const { tasks, rewards } = await listAllPendingApprovals();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t.approvals.title}</h1>

      <section>
        <h2 className="text-sm font-medium text-slate-500 mb-2">
          {t.approvals.tasksTab} ({tasks.length})
        </h2>
        {tasks.length === 0 ? (
          <EmptyState title={t.parentDashboard.noPendingApprovals} />
        ) : (
          <div className="space-y-2">
            {tasks.map((row) => (
              <TaskApprovalCard
                key={row.id}
                row={{
                  id: row.id,
                  title: row.taskDefinition.title,
                  category: row.taskDefinition.category.name,
                  childName: row.child.displayName,
                  points: row.taskDefinition.points,
                  requestedAt: row.completionRequestedAt,
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-500 mb-2">
          {t.approvals.rewardsTab} ({rewards.length})
        </h2>
        {rewards.length === 0 ? (
          <EmptyState title={t.parentDashboard.noPendingRewards} />
        ) : (
          <div className="space-y-2">
            {rewards.map((row) => (
              <RewardApprovalCard
                key={row.id}
                row={{
                  id: row.id,
                  rewardTitle: row.reward.title,
                  childName: row.child.displayName,
                  cost: row.costAtRequest,
                  requestedAt: row.requestedAt,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

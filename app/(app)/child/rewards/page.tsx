import { requireChild } from "@/lib/auth/permissions";
import { listAvailableRewardsForChild } from "@/lib/services/rewards";
import { RewardTile } from "@/components/child/reward-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n/ru";

export const dynamic = "force-dynamic";

export default async function ChildRewards() {
  const s = await requireChild();
  const rewards = await listAvailableRewardsForChild(s.childId);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t.rewards.list}</h1>
      {rewards.length === 0 ? (
        <EmptyState title={t.rewards.empty} />
      ) : (
        <div className="space-y-2">
          {rewards.map((r) => (
            <RewardTile key={r.id} reward={r} />
          ))}
        </div>
      )}
    </div>
  );
}

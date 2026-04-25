import Link from "next/link";
import { requireParent } from "@/lib/auth/permissions";
import { listRewardDefinitions } from "@/lib/services/rewards";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n/ru";
import { formatPoints } from "@/lib/utils/format";
import { formatDateRu } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export default async function ParentRewardsPage() {
  await requireParent();
  const rewards = await listRewardDefinitions({ includeInactive: true });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t.rewards.list}</h1>
        <Link href="/parent/rewards/new">
          <Button size="sm">{t.rewards.new}</Button>
        </Link>
      </div>

      {rewards.length === 0 ? (
        <EmptyState title={t.rewards.empty} />
      ) : (
        <div className="space-y-2">
          {rewards.map((r) => (
            <Link key={r.id} href={`/parent/rewards/${r.id}`}>
              <Card className="hover:shadow-float transition-shadow">
                <CardContent className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium text-slate-900 break-words">{r.title}</p>
                      {!r.isActive ? <Badge tone="neutral">{t.rewards.inactive}</Badge> : null}
                    </div>
                    <p className="text-xs text-slate-500">
                      {r.expiresAt ? `до ${formatDateRu(r.expiresAt)} · ` : ""}
                      {r.quantityLimit !== null
                        ? `${r.quantityUsed}/${r.quantityLimit}`
                        : t.rewards.available}
                    </p>
                  </div>
                  <span className="shrink-0 text-brand-700 font-semibold">
                    {formatPoints(r.cost)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

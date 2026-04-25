"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n/ru";
import { formatPoints } from "@/lib/utils/format";
import { requestRewardAction } from "@/app/(app)/child/rewards/actions";
import type { AvailableRewardView } from "@/lib/services/rewards";

export function RewardTile({ reward }: { reward: AvailableRewardView }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Inline two-step confirm instead of window.confirm(): Chrome silently
  // suppresses confirm() in some desktop contexts ("page is not the active
  // tab"), which made the Claim button appear dead.
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function doRequest() {
    setError(null);
    start(async () => {
      const res = await requestRewardAction(reward.id);
      if (!res.ok) {
        setError(res.error);
        setConfirming(false);
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  const reasonLabel =
    reward.reason === "insufficient"
      ? t.rewards.notEnoughPoints
      : reward.reason === "expired"
        ? t.rewards.expired
        : reward.reason === "soldOut"
          ? t.rewards.soldOut
          : null;

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 break-words">{reward.title}</p>
          {reward.description ? (
            <p className="text-xs text-slate-500 break-words">{reward.description}</p>
          ) : null}
          {reasonLabel ? (
            <Badge tone="warning" className="mt-1">
              {reasonLabel}
            </Badge>
          ) : null}
          {error ? (
            <p className="text-xs text-danger-700 mt-1">{error}</p>
          ) : null}
        </div>
        <div className="text-right shrink-0">
          <p className="text-brand-700 font-semibold">{formatPoints(reward.cost)}</p>
          <div className="mt-1">
            {confirming ? (
              <div className="flex items-center gap-1">
                <Button
                  onClick={doRequest}
                  disabled={pending}
                  size="sm"
                  variant="primary"
                >
                  {pending ? t.app.loading : t.app.yes}
                </Button>
                <Button
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                  size="sm"
                  variant="ghost"
                >
                  {t.app.no}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setConfirming(true)}
                disabled={!reward.canRequest || pending}
                size="sm"
              >
                {t.rewards.request}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

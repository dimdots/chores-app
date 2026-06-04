"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils/dates";
import { formatPoints } from "@/lib/utils/format";
import { useT, useLocale } from "@/lib/i18n/client";
import {
  approveTaskAction,
  rejectTaskAction,
} from "@/app/(app)/parent/approvals/actions";
import {
  approveRewardRequestAction,
  rejectRewardRequestAction,
} from "@/app/(app)/parent/approvals/actions";

export type TaskApprovalRow = {
  id: string;
  title: string;
  category: string;
  childName: string;
  points: number;
  requestedAt: Date | null;
};

export type RewardApprovalRow = {
  id: string;
  rewardTitle: string;
  childName: string;
  cost: number;
  requestedAt: Date;
};

export function TaskApprovalCard({ row }: { row: TaskApprovalRow }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  function decide(kind: "approve" | "reject") {
    start(async () => {
      const res =
        kind === "approve"
          ? await approveTaskAction(row.id)
          : await rejectTaskAction(row.id, reason || null);
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-slate-900 break-words">{row.title}</p>
            <p className="text-xs text-slate-500 truncate">
              {row.childName} · {row.category}
              {row.requestedAt ? ` · ${formatDateTime(row.requestedAt, locale)}` : ""}
            </p>
          </div>
          <span className="shrink-0 text-brand-700 font-semibold">
            +{formatPoints(row.points, locale)}
          </span>
        </div>
        {showReject ? (
          <div className="mt-3 space-y-2">
            <Textarea
              placeholder={t.tasks.rejectReason}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowReject(false)}>
                {t.app.cancel}
              </Button>
              <Button variant="danger" onClick={() => decide("reject")} disabled={pending}>
                {t.tasks.reject}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowReject(true)}
              disabled={pending}
            >
              {t.tasks.reject}
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={() => decide("approve")}
              disabled={pending}
            >
              {t.tasks.approve}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RewardApprovalCard({ row }: { row: RewardApprovalRow }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  function decide(kind: "approve" | "reject") {
    start(async () => {
      const res =
        kind === "approve"
          ? await approveRewardRequestAction(row.id)
          : await rejectRewardRequestAction(row.id, reason || null);
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-slate-900 break-words">{row.rewardTitle}</p>
            <p className="text-xs text-slate-500 truncate">
              {row.childName} · {formatDateTime(row.requestedAt, locale)}
            </p>
          </div>
          <span className="shrink-0 text-brand-700 font-semibold">
            −{formatPoints(row.cost, locale)}
          </span>
        </div>
        {showReject ? (
          <div className="mt-3 space-y-2">
            <Textarea
              placeholder={t.tasks.rejectReason}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowReject(false)}>
                {t.app.cancel}
              </Button>
              <Button variant="danger" onClick={() => decide("reject")} disabled={pending}>
                {t.rewards.reject}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowReject(true)}
              disabled={pending}
            >
              {t.rewards.reject}
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={() => decide("approve")}
              disabled={pending}
            >
              {t.rewards.approve}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

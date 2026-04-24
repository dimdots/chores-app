"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/ru";
import {
  archiveRewardAction,
  restoreRewardAction,
} from "@/app/(app)/parent/rewards/actions";

export function ArchiveRewardButtons({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    setError(null);
    start(async () => {
      const res = isActive ? await archiveRewardAction(id) : await restoreRewardAction(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <Button variant={isActive ? "danger" : "success"} onClick={toggle} disabled={pending}>
        {pending
          ? t.app.loading
          : isActive
            ? t.tasks.archive
            : t.tasks.restore}
      </Button>
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
    </div>
  );
}

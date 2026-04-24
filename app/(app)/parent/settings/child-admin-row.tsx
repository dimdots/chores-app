"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n/ru";
import {
  resetChildPinAction,
  setChildActiveAction,
  resetCycleAction,
} from "./actions";

type Row = {
  childId: string;
  childUserId: string;
  displayName: string;
  isActive: boolean;
};

export function ChildAdminRow({ row }: { row: Row }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pinValue, setPinValue] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const resetPin = () => {
    setError(null);
    setInfo(null);
    start(async () => {
      const res = await resetChildPinAction({
        childUserId: row.childUserId,
        newPin: pinValue,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPinValue("");
      setPinOpen(false);
      setInfo(t.settings.pinReset);
      router.refresh();
    });
  };

  const toggleActive = () => {
    setError(null);
    start(async () => {
      const res = await setChildActiveAction({
        childId: row.childId,
        active: !row.isActive,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  const cycleReset = () => {
    setError(null);
    setInfo(null);
    if (!confirm(t.settings.cycleResetHelp)) return;
    start(async () => {
      const res = await resetCycleAction({ childId: row.childId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setInfo(t.settings.cycleResetDone);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium flex-1 min-w-0 truncate">{row.displayName}</span>
        {!row.isActive ? <Badge tone="neutral">{t.tasks.inactive}</Badge> : null}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setPinOpen((v) => !v)}
          disabled={pending}
        >
          {t.settings.resetPin}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleActive}
          disabled={pending}
        >
          {row.isActive ? t.tasks.archive : t.tasks.restore}
        </Button>
        <Button size="sm" variant="ghost" onClick={cycleReset} disabled={pending}>
          {t.settings.cycleReset}
        </Button>
      </div>
      {pinOpen ? (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              value={pinValue}
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder={t.settings.newPin}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          <Button size="sm" onClick={resetPin} disabled={pending || pinValue.length !== 6}>
            {t.app.save}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPinOpen(false)}>
            {t.app.cancel}
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
      {info ? <p className="text-sm text-success-700">{info}</p> : null}
    </div>
  );
}

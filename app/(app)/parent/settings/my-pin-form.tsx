"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { t } from "@/lib/i18n/ru";
import { setMyPinAction } from "./actions";

export function MyPinForm({ hasPin }: { hasPin: boolean }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!/^\d{6}$/.test(pin)) {
      setError(t.errors.pinMustBeSixDigits);
      return;
    }
    start(async () => {
      const res = await setMyPinAction({ pin });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPin("");
      setInfo(t.settings.myPinSet);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-sm">
      <p className="text-sm text-slate-500">
        {hasPin ? t.settings.myPinExistsHelp : t.settings.myPinHelp}
      </p>
      <div>
        <Label htmlFor="myPin">{t.settings.newPin}</Label>
        <Input
          id="myPin"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          minLength={6}
          required
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="text-center text-2xl tracking-[0.5em]"
        />
      </div>
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
      {info ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl bg-success-50 px-3 py-2 text-sm text-success-700"
        >
          {info}
        </div>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? t.app.loading : t.app.save}
      </Button>
    </form>
  );
}

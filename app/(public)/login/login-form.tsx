"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { t } from "@/lib/i18n/ru";

type Profile = { id: string; name: string; role: "PARENT" | "CHILD" };

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "·";
}

export function LoginPicker({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Profile | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!picked) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-500">{t.login.pickerSubtitle}</p>
        <div className="grid grid-cols-2 gap-3">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPicked(p);
                setPin("");
                setError(null);
              }}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <div
                className={
                  "flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-white " +
                  (p.role === "PARENT" ? "bg-brand-600" : "bg-success-500")
                }
                aria-hidden="true"
              >
                {initialsOf(p.name)}
              </div>
              <div className="text-center">
                <div className="text-base font-medium text-slate-900 leading-tight">
                  {p.name}
                </div>
                <div className="text-xs text-slate-500">
                  {p.role === "PARENT" ? t.login.roleParent : t.login.roleChild}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(pin)) {
      setError(t.errors.pinMustBeSixDigits);
      return;
    }
    const profile = picked!;
    start(async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id, pin }),
      });
      if (res.ok) {
        // Until Phase B lands, route into the per-role dashboard.
        const target = profile.role === "PARENT" ? "/parent/dashboard" : "/child/dashboard";
        router.replace(target);
        router.refresh();
        return;
      }
      const body: unknown = await res.json().catch(() => ({}));
      const code =
        typeof body === "object" && body !== null && "error" in body
          ? String((body as { error?: unknown }).error)
          : "";
      setError(code === "blocked" ? t.login.tooManyAttempts : t.login.invalid);
      setPin("");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className={
            "flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold text-white " +
            (picked.role === "PARENT" ? "bg-brand-600" : "bg-success-500")
          }
          aria-hidden="true"
        >
          {initialsOf(picked.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-900 truncate">{picked.name}</div>
          <div className="text-xs text-slate-500">
            {picked.role === "PARENT" ? t.login.roleParent : t.login.roleChild}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setPicked(null);
            setPin("");
            setError(null);
          }}
        >
          {t.login.backToPicker}
        </Button>
      </div>
      <div>
        <Label htmlFor="pin">{t.login.pin}</Label>
        <Input
          id="pin"
          autoFocus
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
      <Button type="submit" fullWidth disabled={pending} size="lg">
        {pending ? t.app.loading : t.login.submit}
      </Button>
    </form>
  );
}

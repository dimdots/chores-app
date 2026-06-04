"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";

type Profile = { id: string; name: string; role: "PARENT" | "CHILD" };

/**
 * Six single-digit boxes that together hold one 6-char PIN. `value` is the
 * joined string (source of truth lives in the parent); typing auto-advances,
 * Backspace on an empty box steps back, and pasting a code fills all boxes.
 */
function PinBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  function setAt(i: number, d: string) {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join("").slice(0, 6));
  }

  function handleChange(i: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      setAt(i, "");
      return;
    }
    setAt(i, cleaned[cleaned.length - 1]!);
    if (i < 5) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[i]) {
        setAt(i, "");
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
        setAt(i - 1, "");
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      refs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, 5)]?.focus();
  }

  return (
    <div className="flex justify-between gap-2" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          id={i === 0 ? "pin-0" : undefined}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={i === 0}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          pattern="\d{1}"
          maxLength={1}
          value={d}
          disabled={disabled}
          aria-label={`PIN ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-14 w-full rounded-xl border border-slate-200 bg-white text-center text-2xl font-semibold tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60"
        />
      ))}
    </div>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "·";
}

export function LoginPicker({ profiles }: { profiles: Profile[] }) {
  const t = useT();
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
                <span
                  className={cn(
                    "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    p.role === "PARENT"
                      ? "bg-brand-100 text-brand-800"
                      : "bg-success-50 text-success-700",
                  )}
                >
                  {p.role === "PARENT" ? t.login.roleParent : t.login.roleChild}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    // (Don't call useT() here — hooks can only run during render. We use
    // the outer-scope `t` captured at the top of LoginPicker.)
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
        <Label htmlFor="pin-0">{t.login.pin}</Label>
        <div className="mt-1">
          <PinBoxes value={pin} onChange={setPin} disabled={pending} />
        </div>
      </div>
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
      <Button type="submit" fullWidth disabled={pending} size="lg">
        {pending ? t.app.loading : t.login.submit}
      </Button>
    </form>
  );
}

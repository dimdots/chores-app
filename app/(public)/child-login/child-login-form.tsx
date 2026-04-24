"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { t } from "@/lib/i18n/ru";

type ChildOption = { id: string; name: string };

export function ChildLoginForm({ children }: { children: ChildOption[] }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string>(children[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(pin)) {
      setError(t.errors.pinMustBeSixDigits);
      return;
    }
    start(async () => {
      const res = await fetch("/api/auth/child-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, pin }),
      });
      if (res.ok) {
        router.replace("/child/dashboard");
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
      <div>
        <Label htmlFor="child">Имя</Label>
        <Select id="child" value={userId} onChange={(e) => setUserId(e.target.value)}>
          {children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="pin">{t.login.pin}</Label>
        <Input
          id="pin"
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

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { t } from "@/lib/i18n/ru";
import { bootstrapAction } from "./actions";

export function SetupForm() {
  const router = useRouter();
  const [state, setState] = useState({ token: "", name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await bootstrapAction(state);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOk(true);
      setTimeout(() => {
        router.replace("/parent-login");
      }, 800);
    });
  }

  if (ok) {
    return <p className="text-sm text-success-700">{t.setup.success}</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="token">{t.setup.token}</Label>
        <Input
          id="token"
          value={state.token}
          onChange={(e) => setState((s) => ({ ...s, token: e.target.value }))}
          required
        />
      </div>
      <div>
        <Label htmlFor="name">{t.setup.name}</Label>
        <Input
          id="name"
          value={state.name}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
          required
        />
      </div>
      <div>
        <Label htmlFor="email">{t.login.email}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={state.email}
          onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="password">{t.login.password}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={state.password}
          onChange={(e) => setState((s) => ({ ...s, password: e.target.value }))}
        />
      </div>
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? t.app.loading : t.app.create}
      </Button>
    </form>
  );
}

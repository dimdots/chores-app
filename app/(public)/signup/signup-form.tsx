"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import { familySignupAction } from "./actions";

export function SignupForm({ token }: { token: string }) {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState({
    familyName: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await familySignupAction({ token, ...state });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOk(true);
      // Hard refresh so the new session cookie is picked up everywhere
      // including the device-family cookie that scopes the picker.
      setTimeout(() => {
        router.replace("/parent/dashboard");
        router.refresh();
      }, 600);
    });
  }

  if (ok) {
    return <p className="text-sm text-success-700">{t.signup.success}</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="familyName">{t.signup.familyName}</Label>
        <Input
          id="familyName"
          value={state.familyName}
          onChange={(e) => setState((s) => ({ ...s, familyName: e.target.value }))}
          required
          maxLength={100}
        />
        <p className="text-xs text-slate-500 mt-1">{t.signup.familyNameHelp}</p>
      </div>
      <div>
        <Label htmlFor="name">{t.setup.name}</Label>
        <Input
          id="name"
          value={state.name}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
          required
          maxLength={100}
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

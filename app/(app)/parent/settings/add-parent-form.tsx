"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { t } from "@/lib/i18n/ru";
import { addParentAction } from "./actions";

export function AddParentForm() {
  const router = useRouter();
  const [state, setState] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(false);
    start(async () => {
      const res = await addParentAction(state);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOk(true);
      setState({ name: "", email: "", password: "" });
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label htmlFor="parent-name">Имя</Label>
        <Input
          id="parent-name"
          required
          value={state.name}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
          maxLength={100}
        />
      </div>
      <div>
        <Label htmlFor="parent-email">{t.login.email}</Label>
        <Input
          id="parent-email"
          type="email"
          required
          value={state.email}
          onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
          maxLength={200}
        />
      </div>
      <div>
        <Label htmlFor="parent-password">{t.login.password}</Label>
        <Input
          id="parent-password"
          type="password"
          required
          minLength={8}
          value={state.password}
          onChange={(e) => setState((s) => ({ ...s, password: e.target.value }))}
        />
      </div>
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
      {ok ? <p className="text-sm text-success-700">{t.points.saved}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? t.app.loading : t.settings.addParent}
      </Button>
    </form>
  );
}

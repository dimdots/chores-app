"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { t } from "@/lib/i18n/ru";
import { addChildAction } from "./actions";

export function AddChildForm() {
  const router = useRouter();
  const [state, setState] = useState({ name: "", displayName: "", pin: "" });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(false);
    start(async () => {
      const res = await addChildAction({
        name: state.name.trim(),
        displayName: state.displayName.trim() || undefined,
        pin: state.pin,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOk(true);
      setState({ name: "", displayName: "", pin: "" });
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label htmlFor="child-name">Имя</Label>
        <Input
          id="child-name"
          value={state.name}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
          required
          maxLength={100}
        />
      </div>
      <div>
        <Label htmlFor="child-display">
          Отображаемое имя <span className="text-slate-400">({t.app.optional})</span>
        </Label>
        <Input
          id="child-display"
          value={state.displayName}
          onChange={(e) => setState((s) => ({ ...s, displayName: e.target.value }))}
          maxLength={100}
        />
      </div>
      <div>
        <Label htmlFor="child-pin">{t.login.pin}</Label>
        <Input
          id="child-pin"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          value={state.pin}
          onChange={(e) =>
            setState((s) => ({ ...s, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))
          }
          required
        />
      </div>
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
      {ok ? <p className="text-sm text-success-700">{t.points.saved}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? t.app.loading : t.settings.addChild}
      </Button>
    </form>
  );
}

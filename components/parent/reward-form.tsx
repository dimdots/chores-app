"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { t } from "@/lib/i18n/ru";
import {
  createRewardAction,
  updateRewardAction,
} from "@/app/(app)/parent/rewards/actions";

export type RewardFormInitial = {
  id?: string;
  title?: string;
  description?: string | null;
  cost?: number;
  expiresAt?: Date | null;
  quantityLimit?: number | null;
  isActive?: boolean;
};

function dateToInput(d?: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function RewardForm({ initial }: { initial?: RewardFormInitial }) {
  const router = useRouter();
  const [state, setState] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    cost: initial?.cost ?? 50,
    expiresAt: dateToInput(initial?.expiresAt),
    quantityLimit: initial?.quantityLimit ?? "",
    isActive: initial?.isActive ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      title: state.title,
      description: state.description || null,
      cost: state.cost,
      expiresAt: state.expiresAt || null,
      quantityLimit:
        state.quantityLimit === "" || state.quantityLimit === null
          ? null
          : Number(state.quantityLimit),
    };
    start(async () => {
      const res = initial?.id
        ? await updateRewardAction({ id: initial.id, ...payload, isActive: state.isActive })
        : await createRewardAction(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/parent/rewards");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-xl">
      <div>
        <Label htmlFor="title">{t.rewards.title}</Label>
        <Input
          id="title"
          required
          maxLength={120}
          value={state.title}
          onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="description">{t.rewards.description}</Label>
        <Textarea
          id="description"
          value={state.description}
          onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="cost">{t.rewards.cost}</Label>
          <Input
            id="cost"
            type="number"
            min={0}
            value={state.cost}
            onChange={(e) =>
              setState((s) => ({ ...s, cost: Number.parseInt(e.target.value || "0", 10) }))
            }
          />
        </div>
        <div>
          <Label htmlFor="expires">{t.rewards.expiresAt}</Label>
          <Input
            id="expires"
            type="date"
            value={state.expiresAt}
            onChange={(e) => setState((s) => ({ ...s, expiresAt: e.target.value }))}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="limit">
          {t.rewards.quantityLimit} <span className="text-slate-400">({t.app.optional})</span>
        </Label>
        <Input
          id="limit"
          type="number"
          min={1}
          value={state.quantityLimit as number | ""}
          onChange={(e) =>
            setState((s) => ({ ...s, quantityLimit: e.target.value === "" ? "" : Number(e.target.value) }))
          }
        />
      </div>
      {initial?.id ? (
        <div className="flex items-center gap-2">
          <input
            id="active"
            type="checkbox"
            checked={state.isActive}
            onChange={(e) => setState((s) => ({ ...s, isActive: e.target.checked }))}
          />
          <label htmlFor="active" className="text-sm text-slate-700">
            {t.rewards.active}
          </label>
        </div>
      ) : null}
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t.app.loading : initial?.id ? t.app.save : t.app.create}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          {t.app.cancel}
        </Button>
      </div>
    </form>
  );
}

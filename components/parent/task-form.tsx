"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { t } from "@/lib/i18n/ru";
import {
  createTaskAction,
  updateTaskAction,
} from "@/app/(app)/parent/tasks/actions";

type Category = { id: string; name: string };
type Recurrence = "NONE" | "DAILY" | "WEEKLY" | "WEEKDAYS";

export type TaskFormInitial = {
  id?: string;
  title?: string;
  description?: string | null;
  categoryId?: string;
  points?: number;
  recurrenceType?: Recurrence;
  recurrenceDays?: number[] | null;
  isActive?: boolean;
};

export function TaskForm({
  categories,
  initial,
}: {
  categories: Category[];
  initial?: TaskFormInitial;
}) {
  const router = useRouter();
  const [state, setState] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    categoryId: initial?.categoryId ?? categories[0]?.id ?? "",
    points: initial?.points ?? 10,
    recurrenceType: (initial?.recurrenceType ?? "NONE") as Recurrence,
    recurrenceDays: new Set<number>(initial?.recurrenceDays ?? []),
    isActive: initial?.isActive ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggleDay(d: number) {
    setState((s) => {
      const next = new Set(s.recurrenceDays);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return { ...s, recurrenceDays: next };
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      title: state.title,
      description: state.description || null,
      categoryId: state.categoryId,
      points: state.points,
      recurrenceType: state.recurrenceType,
      recurrenceDays:
        state.recurrenceType === "WEEKDAYS" ? Array.from(state.recurrenceDays).sort() : null,
    };
    start(async () => {
      const res = initial?.id
        ? await updateTaskAction({ id: initial.id, ...payload, isActive: state.isActive })
        : await createTaskAction(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // On create, jump into the new task's detail page so the parent can
      // assign it immediately without an extra round-trip through the list.
      if (!initial?.id && res.id) {
        router.push(`/parent/tasks/${res.id}`);
      } else {
        router.push("/parent/tasks");
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-xl">
      <div>
        <Label htmlFor="title">{t.tasks.title}</Label>
        <Input
          id="title"
          required
          maxLength={120}
          value={state.title}
          onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="description">{t.tasks.description}</Label>
        <Textarea
          id="description"
          value={state.description}
          onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="category">{t.tasks.category}</Label>
          <Select
            id="category"
            value={state.categoryId}
            onChange={(e) => setState((s) => ({ ...s, categoryId: e.target.value }))}
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="points">{t.tasks.points}</Label>
          <Input
            id="points"
            type="number"
            min={0}
            max={1_000_000}
            value={state.points}
            onChange={(e) =>
              setState((s) => ({ ...s, points: Number.parseInt(e.target.value || "0", 10) }))
            }
          />
        </div>
      </div>
      <div>
        <Label htmlFor="recurrence">{t.tasks.recurrence}</Label>
        <Select
          id="recurrence"
          value={state.recurrenceType}
          onChange={(e) =>
            setState((s) => ({ ...s, recurrenceType: e.target.value as Recurrence }))
          }
        >
          <option value="NONE">{t.tasks.recurrenceNone}</option>
          <option value="DAILY">{t.tasks.recurrenceDaily}</option>
          <option value="WEEKLY">{t.tasks.recurrenceWeekly}</option>
          <option value="WEEKDAYS">{t.tasks.recurrenceWeekdays}</option>
        </Select>
      </div>
      {state.recurrenceType === "WEEKDAYS" ? (
        <div>
          <Label>{t.tasks.recurrenceWeekdays}</Label>
          <div className="flex flex-wrap gap-2">
            {t.tasks.weekdays.map((label, idx) => {
              const active = state.recurrenceDays.has(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={
                    "h-10 w-12 rounded-xl border text-sm font-medium " +
                    (active
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {initial?.id ? (
        <div className="flex items-center gap-2">
          <input
            id="active"
            type="checkbox"
            checked={state.isActive}
            onChange={(e) => setState((s) => ({ ...s, isActive: e.target.checked }))}
          />
          <label htmlFor="active" className="text-sm text-slate-700">
            {t.tasks.active}
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

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { t } from "@/lib/i18n/ru";
import { createChildTaskAction } from "../actions";

type Category = { id: string; name: string };
type Recurrence = "NONE" | "DAILY" | "WEEKLY" | "WEEKDAYS";

const POINT_PRESETS = [5, 10, 15, 25];

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "NONE", label: t.tasks.recurrenceNone },
  { value: "DAILY", label: t.tasks.recurrenceDaily },
  { value: "WEEKLY", label: t.tasks.recurrenceWeekly },
  { value: "WEEKDAYS", label: t.tasks.recurrenceWeekdays },
];

export function ChildTaskForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [points, setPoints] = useState<number>(POINT_PRESETS[1] ?? 10);
  const [recurrenceType, setRecurrenceType] = useState<Recurrence>("NONE");
  const [recurrenceDays, setRecurrenceDays] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggleDay(d: number) {
    setRecurrenceDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError(t.login.required);
      return;
    }
    if (!categoryId) {
      setError(t.errors.unknown);
      return;
    }
    if (recurrenceType === "WEEKDAYS" && recurrenceDays.size === 0) {
      // Don't silently default to "no days selected" — ask the kid to pick
      // at least one day so the task actually appears somewhere.
      setError(t.login.required);
      return;
    }
    start(async () => {
      const res = await createChildTaskAction({
        title: title.trim(),
        categoryId,
        points,
        recurrenceType,
        recurrenceDays:
          recurrenceType === "WEEKDAYS"
            ? Array.from(recurrenceDays).sort()
            : null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace("/child/tasks");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-sm">
      <div>
        <Label htmlFor="title">{t.tasks.title}</Label>
        <Input
          id="title"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="category">{t.tasks.category}</Label>
        <Select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
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
        <Label>{t.tasks.points}</Label>
        <div className="flex flex-wrap gap-2">
          {POINT_PRESETS.map((n) => {
            const active = points === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setPoints(n)}
                className={
                  "h-12 min-w-[64px] rounded-xl border px-4 text-base font-medium " +
                  (active
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")
                }
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label>{t.tasks.recurrence}</Label>
        <div className="flex flex-wrap gap-2">
          {RECURRENCE_OPTIONS.map((opt) => {
            const active = recurrenceType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRecurrenceType(opt.value)}
                className={
                  "h-11 rounded-xl border px-4 text-sm font-medium " +
                  (active
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      {recurrenceType === "WEEKDAYS" ? (
        <div>
          <Label>{t.tasks.recurrenceWeekdays}</Label>
          <div className="flex flex-wrap gap-2">
            {t.tasks.weekdays.map((label, idx) => {
              const active = recurrenceDays.has(idx);
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
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending} fullWidth>
          {pending ? t.app.loading : t.app.create}
        </Button>
      </div>
    </form>
  );
}

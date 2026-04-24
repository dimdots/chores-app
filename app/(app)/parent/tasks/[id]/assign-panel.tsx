"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input, Label } from "@/components/ui/input";
import { t } from "@/lib/i18n/ru";
import { assignTaskAction } from "@/app/(app)/parent/tasks/actions";

type ChildOpt = { id: string; displayName: string };

export function AssignTaskPanel({
  taskId,
  children,
}: {
  taskId: string;
  children: ChildOpt[];
}) {
  const router = useRouter();
  const [childId, setChildId] = useState(children[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (children.length === 0) return null;

  const selectedChildName =
    children.find((c) => c.id === childId)?.displayName ?? "";

  function submit() {
    setError(null);
    setInfo(null);
    const childName = selectedChildName;
    const scheduled = date;
    start(async () => {
      const res = await assignTaskAction({
        taskDefinitionId: taskId,
        childId,
        scheduledDate: date || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const suffix = scheduled ? ` · ${scheduled}` : "";
      setInfo(`${t.tasks.assigned}: ${childName}${suffix}`);
      router.refresh();
    });
  }

  function onChildChange(value: string) {
    setChildId(value);
    setInfo(null);
    setError(null);
  }

  function onDateChange(value: string) {
    setDate(value);
    setInfo(null);
    setError(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.tasks.assign}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-w-sm">
        <div>
          <Label htmlFor="assignChild">{t.nav.children}</Label>
          <Select
            id="assignChild"
            value={childId}
            onChange={(e) => onChildChange(e.target.value)}
          >
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="assignDate">{t.reports.dateFrom}</Label>
          <Input
            id="assignDate"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-danger-700">{error}</p> : null}
        {info ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl bg-success-50 px-3 py-2 text-sm text-success-700"
          >
            {info}
          </div>
        ) : null}
        <Button onClick={submit} disabled={pending}>
          {t.tasks.assign}
        </Button>
      </CardContent>
    </Card>
  );
}

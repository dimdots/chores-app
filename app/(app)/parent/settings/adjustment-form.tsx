"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { t } from "@/lib/i18n/ru";
import { addAdjustmentAction } from "./actions";

export function AdjustmentForm({
  kids,
}: {
  kids: Array<{ id: string; displayName: string }>;
}) {
  const router = useRouter();
  const [childId, setChildId] = useState(kids[0]?.id ?? "");
  const [kind, setKind] = useState<"bonus" | "penalty">("bonus");
  // Stored as a string so the user can fully clear the field on mobile.
  // Parsing on submit lets the field be empty mid-edit.
  const [value, setValue] = useState("10");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setError(t.points.valueInvalid);
      return;
    }
    const signedValue = kind === "bonus" ? Math.abs(parsed) : -Math.abs(parsed);
    if (kind === "penalty" && !confirm(t.points.confirmPenalty)) return;
    start(async () => {
      const res = await addAdjustmentAction({
        childId,
        value: signedValue,
        reason: reason.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setReason("");
      setValue("10");
      setInfo(t.points.saved);
      router.refresh();
    });
  };

  if (kids.length === 0) return <p className="text-sm text-slate-500">{t.settings.noChildren}</p>;

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label htmlFor="adj-child">{t.settings.children}</Label>
        <Select id="adj-child" value={childId} onChange={(e) => setChildId(e.target.value)}>
          {kids.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="adj-kind">{t.app.actions}</Label>
          <Select
            id="adj-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as "bonus" | "penalty")}
          >
            <option value="bonus">{t.points.bonus}</option>
            <option value="penalty">{t.points.penalty}</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="adj-value">{t.points.value}</Label>
          <Input
            id="adj-value"
            type="number"
            inputMode="numeric"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="adj-reason">{t.points.reason}</Label>
        <Textarea
          id="adj-reason"
          required
          maxLength={200}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
      {info ? <p className="text-sm text-success-700">{info}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? t.app.loading : t.app.save}
      </Button>
    </form>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Progress({
  value,
  className,
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <div className="text-xs text-slate-500 mb-1 flex justify-between">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      ) : null}
      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden" aria-hidden="false">
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-full bg-brand-500 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

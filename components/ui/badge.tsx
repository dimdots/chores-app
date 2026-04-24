import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "brand" | "success" | "danger" | "warning";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  brand: "bg-brand-50 text-brand-700",
  success: "bg-success-50 text-success-700",
  danger: "bg-danger-50 text-danger-700",
  warning: "bg-warning-50 text-warning-700",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: { tone?: Tone } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 h-6 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}

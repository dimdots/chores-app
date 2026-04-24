import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "block w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900",
        "focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400",
        "disabled:bg-slate-50 disabled:text-slate-400",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

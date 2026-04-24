import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "block w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900",
          "placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400",
          "disabled:bg-slate-50 disabled:text-slate-400",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900",
        "placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400",
        "min-h-[88px]",
        className,
      )}
      {...props}
    />
  );
});

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-sm font-medium text-slate-700 mb-1", className)}
      {...props}
    />
  );
}

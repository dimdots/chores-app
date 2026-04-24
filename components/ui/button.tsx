import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-200",
  secondary:
    "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 disabled:text-slate-400",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 disabled:text-slate-400",
  danger:
    "bg-danger-500 text-white hover:bg-danger-700 active:bg-danger-700 disabled:bg-danger-50 disabled:text-danger-500",
  success:
    "bg-success-500 text-white hover:bg-success-700 active:bg-success-700 disabled:bg-success-50 disabled:text-success-500",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-4 text-base rounded-xl",
  lg: "h-14 px-6 text-lg rounded-2xl",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", fullWidth, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
});

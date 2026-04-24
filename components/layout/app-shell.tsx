import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function AppShell({
  header,
  children,
  mobileNav,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  mobileNav?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {header}
      <main className={cn("flex-1 w-full max-w-5xl mx-auto px-4 py-4 md:py-8 pb-24 md:pb-8")}>
        {children}
      </main>
      {mobileNav ? (
        <div className="fixed bottom-0 inset-x-0 md:hidden border-t border-slate-200 bg-white">
          {mobileNav}
        </div>
      ) : null}
    </div>
  );
}

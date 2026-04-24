import Link from "next/link";
import { t } from "@/lib/i18n/ru";
import { LogoutButton } from "./logout-button";

type NavItem = { href: string; label: string };

export function Header({
  title,
  nav,
  role,
}: {
  title: string;
  nav: NavItem[];
  role: "PARENT" | "CHILD";
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-4">
        <Link href={role === "PARENT" ? "/parent/dashboard" : "/child/dashboard"} className="font-semibold text-slate-900">
          {title}
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <LogoutButton role={role} label={t.app.signOut} />
      </div>
    </header>
  );
}

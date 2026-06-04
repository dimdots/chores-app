import { requireChild } from "@/lib/auth/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ChildLayout({ children }: { children: React.ReactNode }) {
  await requireChild();
  // Nav labels built inside the component so they pick up the active locale
  // on every request (layout re-renders per route navigation anyway).
  const t = getT();
  const nav = [
    { href: "/child/dashboard", label: t.nav.dashboard },
    { href: "/child/tasks", label: t.nav.tasks },
    { href: "/child/rewards", label: t.nav.rewards },
    { href: "/child/history", label: t.nav.history },
  ];
  return (
    <AppShell
      header={<Header title={t.app.name} nav={nav} role="CHILD" />}
      mobileNav={<MobileNav nav={nav} />}
    >
      {children}
    </AppShell>
  );
}

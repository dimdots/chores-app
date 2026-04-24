import { requireChild } from "@/lib/auth/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { t } from "@/lib/i18n/ru";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/child/dashboard", label: t.nav.dashboard },
  { href: "/child/tasks", label: t.nav.tasks },
  { href: "/child/rewards", label: t.nav.rewards },
  { href: "/child/history", label: t.nav.history },
];

export default async function ChildLayout({ children }: { children: React.ReactNode }) {
  await requireChild();
  return (
    <AppShell
      header={<Header title={t.app.name} nav={NAV} role="CHILD" />}
      mobileNav={<MobileNav nav={NAV} />}
    >
      {children}
    </AppShell>
  );
}

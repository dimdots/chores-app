import { requireParent } from "@/lib/auth/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { t } from "@/lib/i18n/ru";

export const dynamic = "force-dynamic";

// Note: /parent/approvals is intentionally omitted from nav (pivot 2026-04-19).
// The route is still reachable directly; it will be formally parked in Phase E.
const NAV = [
  { href: "/parent/dashboard", label: t.nav.dashboard },
  { href: "/parent/tasks", label: t.nav.tasks },
  { href: "/parent/rewards", label: t.nav.rewards },
  { href: "/parent/reports", label: t.nav.reports },
  { href: "/parent/settings", label: t.nav.settings },
];

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  await requireParent();
  return (
    <AppShell
      header={<Header title={t.app.name} nav={NAV} role="PARENT" />}
      mobileNav={<MobileNav nav={NAV} />}
    >
      {children}
    </AppShell>
  );
}

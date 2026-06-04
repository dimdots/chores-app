import { requireParent } from "@/lib/auth/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  await requireParent();
  // Approvals/Validations is intentionally omitted — the family uses the
  // auto-approve flow (pivot 2026-04-19), so there's no approval queue to
  // surface. The /parent/approvals route still exists but isn't linked.
  // Built inside the component so labels pick up the active locale.
  const t = getT();
  const nav = [
    { href: "/parent/dashboard", label: t.nav.dashboard },
    { href: "/parent/tasks", label: t.nav.tasks },
    { href: "/parent/rewards", label: t.nav.rewards },
    { href: "/parent/reports", label: t.nav.reports },
    { href: "/parent/settings", label: t.nav.settings },
  ];
  return (
    <AppShell
      header={<Header title={t.app.name} nav={nav} role="PARENT" />}
      mobileNav={<MobileNav nav={nav} />}
    >
      {children}
    </AppShell>
  );
}

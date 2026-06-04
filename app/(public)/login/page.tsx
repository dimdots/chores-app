import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getDeviceFamilyId } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n/server";
import { LoginPicker } from "./login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function LoginPage() {

  const t = getT();
  const session = await getSession();
  if (session) {
    redirect(session.role === "PARENT" ? "/parent/dashboard" : "/child/dashboard");
  }

  // The picker is scoped to this device's family (set by the most recent
  // successful login or signup on this browser). First-time visitors with no
  // cookie see an empty picker + the email-login fallback link.
  const familyId = getDeviceFamilyId();

  const profiles = familyId
    ? await prisma.user.findMany({
        where: { familyId, isActive: true, pinHash: { not: null } },
        include: { childProfile: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      })
    : [];

  const hasAnyParent = familyId
    ? (await prisma.user.count({
        where: { familyId, role: "PARENT", isActive: true },
      })) > 0
    : false;

  const items = profiles.map((u) => ({
    id: u.id,
    name: u.childProfile?.displayName ?? u.name,
    role: u.role,
  }));

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-slate-50">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{t.login.pickerTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <EmptyState
                title={t.login.pickerEmpty}
                description={
                  hasAnyParent
                    ? t.login.fallbackEmailWithPin
                    : t.login.fallbackEmailOrInvite
                }
              />
            ) : (
              <LoginPicker profiles={items} />
            )}
            <div className="mt-6 flex flex-col items-center gap-2 text-sm text-slate-500">
              <Link href="/parent-login" className="text-brand-700 hover:underline">
                {t.login.loginWithEmail}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

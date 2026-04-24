import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { t } from "@/lib/i18n/ru";
import { LoginPicker } from "./login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    // Until Phase B lands, parents and kids still route to their dashboards.
    redirect(session.role === "PARENT" ? "/parent/dashboard" : "/child/dashboard");
  }

  // Anyone with a PIN set — parent or child — appears in the picker.
  const profiles = await prisma.user.findMany({
    where: { isActive: true, pinHash: { not: null } },
    include: { childProfile: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const hasAnyParent =
    (await prisma.user.count({ where: { role: "PARENT", isActive: true } })) > 0;

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
                    ? "Войдите по email и задайте PIN в настройках."
                    : "Начните с /setup, чтобы создать первого родителя."
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

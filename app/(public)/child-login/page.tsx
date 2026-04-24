import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { t } from "@/lib/i18n/ru";
import { ChildLoginForm } from "./child-login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function ChildLoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "PARENT" ? "/parent/dashboard" : "/child/dashboard");
  }

  const children = await prisma.user.findMany({
    where: { role: "CHILD", isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-slate-50">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{t.login.childTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {children.length === 0 ? (
              <EmptyState
                title={t.settings.noChildren}
                description="Родитель сначала должен создать профиль ребёнка."
              />
            ) : (
              <ChildLoginForm children={children} />
            )}
            <div className="mt-6 flex flex-col items-center gap-2 text-sm text-slate-500">
              <Link href="/login" className="text-brand-700 hover:underline">
                {t.login.backToPicker} ← {t.login.pickerTitle}
              </Link>
              <Link href="/parent-login" className="text-brand-700 hover:underline">
                {t.login.switchToParent}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

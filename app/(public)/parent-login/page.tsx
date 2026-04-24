import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { t } from "@/lib/i18n/ru";
import { ParentLoginForm } from "./parent-login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ParentLoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "PARENT" ? "/parent/dashboard" : "/child/dashboard");
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-slate-50">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{t.login.parentTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ParentLoginForm />
            <div className="mt-6 flex flex-col items-center gap-2 text-sm text-slate-500">
              <Link href="/login" className="text-brand-700 hover:underline">
                {t.login.backToPicker} ← {t.login.pickerTitle}
              </Link>
              <Link href="/child-login" className="text-brand-700 hover:underline">
                {t.login.switchToChild}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

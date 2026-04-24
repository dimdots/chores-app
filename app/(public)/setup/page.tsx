import { canBootstrap } from "@/lib/services/bootstrap";
import { t } from "@/lib/i18n/ru";
import { SetupForm } from "./setup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const allowed = await canBootstrap();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-slate-50">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{t.setup.title}</CardTitle>
            <CardDescription>{t.setup.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {allowed ? <SetupForm /> : <EmptyState title={t.setup.disabled} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

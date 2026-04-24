import { requireParent } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { listChildren } from "@/lib/services/children";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AddChildForm } from "./add-child-form";
import { AddParentForm } from "./add-parent-form";
import { ChildAdminRow } from "./child-admin-row";
import { AdjustmentForm } from "./adjustment-form";
import { MyPinForm } from "./my-pin-form";
import { formatPoints } from "@/lib/utils/format";
import { t } from "@/lib/i18n/ru";

export const dynamic = "force-dynamic";

export default async function ParentSettingsPage() {
  const session = await requireParent();
  const [children, parents, me] = await Promise.all([
    listChildren(),
    prisma.user.findMany({
      where: { role: "PARENT" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, isActive: true, pinHash: true },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { pinHash: true },
    }),
  ]);

  const hasOwnPin = Boolean(me?.pinHash);
  const adjChildren = children.map((c) => ({ id: c.id, displayName: c.displayName }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t.settings.title}</h1>

      {!hasOwnPin ? (
        <div className="rounded-xl border border-warning-50 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          {t.settings.myPinHelp}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.myPinTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <MyPinForm hasPin={hasOwnPin} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.points.adjustTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <AdjustmentForm kids={adjChildren} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.children}</CardTitle>
        </CardHeader>
        <CardContent>
          {children.length === 0 ? (
            <EmptyState title={t.settings.noChildren} />
          ) : (
            <ul className="space-y-4 divide-y divide-slate-100">
              {children.map((c) => (
                <li key={c.id} className="pt-4 first:pt-0">
                  <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                    <span>
                      {t.parentDashboard.balance}: {formatPoints(c.currentPoints)}
                    </span>
                    <span>
                      {t.childDashboard.level} {c.currentLevel} · 🔥 {c.currentStreak}
                    </span>
                  </div>
                  <ChildAdminRow
                    row={{
                      childId: c.id,
                      childUserId: c.userId,
                      displayName: c.displayName,
                      isActive: c.user.isActive,
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {children.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.settings.addChild}</CardTitle>
          </CardHeader>
          <CardContent>
            <AddChildForm />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.addParent}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y divide-slate-100 text-sm">
            {parents.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between">
                <span className="truncate">
                  {p.name} <span className="text-slate-500">· {p.email}</span>
                </span>
                {!p.isActive ? (
                  <span className="text-xs text-slate-500">{t.tasks.inactive}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <AddParentForm />
        </CardContent>
      </Card>
    </div>
  );
}

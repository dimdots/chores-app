"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

export function QuickActions() {
  const t = useT();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.parentDashboard.quickActions}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        <Link href="/parent/tasks/new">
          <Button variant="secondary" fullWidth>
            {t.parentDashboard.createTask}
          </Button>
        </Link>
        <Link href="/parent/rewards/new">
          <Button variant="secondary" fullWidth>
            {t.parentDashboard.createReward}
          </Button>
        </Link>
        <Link href="/parent/settings">
          <Button variant="secondary" fullWidth>
            {t.parentDashboard.addBonus}
          </Button>
        </Link>
        <Link href="/parent/reports">
          <Button variant="secondary" fullWidth>
            {t.nav.reports}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

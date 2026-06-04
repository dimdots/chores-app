import { requireParent } from "@/lib/auth/permissions";
import { RewardForm } from "@/components/parent/reward-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewRewardPage() {

  const t = getT();
  await requireParent();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.rewards.new}</CardTitle>
      </CardHeader>
      <CardContent>
        <RewardForm />
      </CardContent>
    </Card>
  );
}

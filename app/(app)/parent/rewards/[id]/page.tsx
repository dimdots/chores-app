import { notFound } from "next/navigation";
import { requireParent } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { RewardForm } from "@/components/parent/reward-form";
import { ArchiveRewardButtons } from "./archive-buttons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n/ru";

export const dynamic = "force-dynamic";

export default async function EditRewardPage({ params }: { params: { id: string } }) {
  await requireParent();
  const reward = await prisma.reward.findUnique({ where: { id: params.id } });
  if (!reward) notFound();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.rewards.edit}</CardTitle>
        </CardHeader>
        <CardContent>
          <RewardForm
            initial={{
              id: reward.id,
              title: reward.title,
              description: reward.description,
              cost: reward.cost,
              expiresAt: reward.expiresAt,
              quantityLimit: reward.quantityLimit,
              isActive: reward.isActive,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.app.actions}</CardTitle>
        </CardHeader>
        <CardContent>
          <ArchiveRewardButtons id={reward.id} isActive={reward.isActive} />
        </CardContent>
      </Card>
    </div>
  );
}

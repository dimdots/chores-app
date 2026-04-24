import { z } from "zod";

export const pointsAdjustmentSchema = z.object({
  childId: z.string().min(1),
  value: z.coerce.number().int().refine((n) => n !== 0, { message: "value must be non-zero" }),
  reason: z.string().trim().min(1).max(200),
});
export type PointsAdjustmentInput = z.infer<typeof pointsAdjustmentSchema>;

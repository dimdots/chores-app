import { z } from "zod";

export const rewardCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  cost: z.coerce.number().int().min(0).max(1_000_000),
  expiresAt: z.coerce.date().optional().nullable(),
  quantityLimit: z.coerce.number().int().min(1).max(1_000_000).optional().nullable(),
});
export type RewardCreateInput = z.infer<typeof rewardCreateSchema>;

export const rewardUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  cost: z.coerce.number().int().min(0).max(1_000_000).optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  quantityLimit: z.coerce.number().int().min(1).max(1_000_000).nullable().optional(),
  isActive: z.boolean().optional(),
});
export type RewardUpdateInput = z.infer<typeof rewardUpdateSchema>;

export const requestRewardSchema = z.object({
  rewardId: z.string().min(1),
});

import { z } from "zod";

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const categoryUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(60).optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

import { z } from "zod";

export const recurrenceEnum = z.enum(["NONE", "DAILY", "WEEKLY", "WEEKDAYS"]);

const weekdayArray = z
  .array(z.number().int().min(0).max(6))
  .min(1)
  .max(7);

export const taskDefinitionCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).optional().nullable(),
    categoryId: z.string().min(1),
    points: z.coerce.number().int().min(0).max(1_000_000),
    recurrenceType: recurrenceEnum.default("NONE"),
    recurrenceDays: weekdayArray.optional().nullable(),
  })
  .refine(
    (d) =>
      d.recurrenceType !== "WEEKDAYS" ||
      (Array.isArray(d.recurrenceDays) && d.recurrenceDays.length > 0),
    { message: "recurrenceDays required when recurrenceType=WEEKDAYS", path: ["recurrenceDays"] },
  );
export type TaskDefinitionCreateInput = z.infer<typeof taskDefinitionCreateSchema>;

export const taskDefinitionUpdateSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    categoryId: z.string().min(1).optional(),
    points: z.coerce.number().int().min(0).max(1_000_000).optional(),
    recurrenceType: recurrenceEnum.optional(),
    recurrenceDays: weekdayArray.nullable().optional(),
    isActive: z.boolean().optional(),
  });
export type TaskDefinitionUpdateInput = z.infer<typeof taskDefinitionUpdateSchema>;

export const assignTaskSchema = z.object({
  taskDefinitionId: z.string().min(1),
  childId: z.string().min(1),
  dueDate: z.coerce.date().optional().nullable(),
  scheduledDate: z.coerce.date().optional().nullable(),
});
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;

export const rejectReasonSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

import { z } from "zod";

export const parentLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});
export type ParentLoginInput = z.infer<typeof parentLoginSchema>;

export const childLoginSchema = z.object({
  userId: z.string().min(1),
  pin: z.string().regex(/^\d{6}$/, { message: "PIN must be 6 digits" }),
});
export type ChildLoginInput = z.infer<typeof childLoginSchema>;

/** Shared PIN login — same shape as child, but applies to any user (parent or child). */
export const pinLoginSchema = z.object({
  userId: z.string().min(1),
  pin: z.string().regex(/^\d{6}$/, { message: "PIN must be 6 digits" }),
});
export type PinLoginInput = z.infer<typeof pinLoginSchema>;

export const setPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, { message: "PIN must be 6 digits" }),
});
export type SetPinInput = z.infer<typeof setPinSchema>;

export const bootstrapSchema = z.object({
  token: z.string().min(8),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});
export type BootstrapInput = z.infer<typeof bootstrapSchema>;

export const parentCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});
export type ParentCreateInput = z.infer<typeof parentCreateSchema>;

export const childCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  displayName: z.string().trim().min(1).max(100).optional(),
  pin: z.string().regex(/^\d{6}$/, { message: "PIN must be 6 digits" }),
});
export type ChildCreateInput = z.infer<typeof childCreateSchema>;

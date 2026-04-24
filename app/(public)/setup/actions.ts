"use server";

import { bootstrapFirstParent } from "@/lib/services/bootstrap";
import { t } from "@/lib/i18n/ru";

export async function bootstrapAction(
  input: { token: string; name: string; email: string; password: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await bootstrapFirstParent(input);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : t.errors.unknown;
    return { ok: false, error: msg };
  }
}

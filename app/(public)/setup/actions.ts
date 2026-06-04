"use server";

import { bootstrapFirstParent } from "@/lib/services/bootstrap";
import { getT } from "@/lib/i18n/server";

export async function bootstrapAction(
  input: { token: string; name: string; email: string; password: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = getT();
  try {
    await bootstrapFirstParent(input);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : t.errors.unknown;
    return { ok: false, error: msg };
  }
}

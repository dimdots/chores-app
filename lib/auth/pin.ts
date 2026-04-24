import argon2 from "argon2";

// Same argon2id parameters as password; PINs have very low entropy so we
// rely on argon2 + rate limiting to make online guessing impractical.
const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function isSixDigitPin(raw: string): boolean {
  return /^\d{6}$/.test(raw);
}

export async function hashPin(pin: string): Promise<string> {
  if (!isSixDigitPin(pin)) {
    throw new Error("PIN must be 6 digits");
  }
  return argon2.hash(pin, OPTIONS);
}

export async function verifyPin(hash: string, pin: string): Promise<boolean> {
  if (!isSixDigitPin(pin)) return false;
  try {
    return await argon2.verify(hash, pin);
  } catch {
    return false;
  }
}

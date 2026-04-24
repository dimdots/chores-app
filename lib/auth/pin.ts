import bcrypt from "bcryptjs";

// bcrypt cost factor. 12 is ~250ms on modern hardware — fast enough for login,
// slow enough that online brute-forcing 6-digit PINs is infeasible when
// combined with the rate limiter in lib/auth/rate-limit.ts.
const SALT_ROUNDS = 12;

export function isSixDigitPin(raw: string): boolean {
  return /^\d{6}$/.test(raw);
}

export async function hashPin(pin: string): Promise<string> {
  if (!isSixDigitPin(pin)) {
    throw new Error("PIN must be 6 digits");
  }
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function verifyPin(hash: string, pin: string): Promise<boolean> {
  if (!isSixDigitPin(pin)) return false;
  try {
    return await bcrypt.compare(pin, hash);
  } catch {
    return false;
  }
}

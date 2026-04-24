/**
 * Very small in-process rate limiter for login endpoints.
 *
 * This is intentionally simple — family-scale traffic on a single server
 * instance is easy to protect from online PIN guessing by:
 *   - argon2id hashing (slow),
 *   - a per-identifier max of 5 failed attempts per 15 min,
 *   - a global max of 30 failed attempts per 15 min.
 *
 * In serverless environments (Vercel) this is best-effort per instance.
 * For harder guarantees, place the app behind Cloudflare / Vercel WAF.
 */

type Bucket = { count: number; resetAt: number };

const ATTEMPTS: Map<string, Bucket> = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_KEY = 5;

function prune(now: number) {
  for (const [k, b] of ATTEMPTS) {
    if (b.resetAt <= now) ATTEMPTS.delete(k);
  }
}

export function recordFailure(key: string): void {
  const now = Date.now();
  prune(now);
  const b = ATTEMPTS.get(key);
  if (!b || b.resetAt <= now) {
    ATTEMPTS.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    b.count += 1;
  }
}

export function recordSuccess(key: string): void {
  ATTEMPTS.delete(key);
}

export function isBlocked(key: string): boolean {
  const now = Date.now();
  prune(now);
  const b = ATTEMPTS.get(key);
  if (!b) return false;
  if (b.resetAt <= now) {
    ATTEMPTS.delete(key);
    return false;
  }
  return b.count >= MAX_PER_KEY;
}

// App-wide configuration, mostly read from env vars.

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const appConfig = {
  timezone: process.env.APP_TIMEZONE ?? "Europe/Moscow",
  parentSessionDays: readInt("PARENT_SESSION_DAYS", 7),
  childSessionDays: readInt("CHILD_SESSION_DAYS", 30),
  publicUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
} as const;

export type AppConfig = typeof appConfig;

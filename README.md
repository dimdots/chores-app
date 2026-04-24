# Family Chores & Rewards

Private family web app for tracking chores, points, and rewards. Two parent accounts (email + password) and one or more children (6-digit PIN). Russian UI. Mobile-first.

## Stack

- Next.js 14 (App Router, React Server Components, Server Actions)
- TypeScript, strict mode
- PostgreSQL + Prisma
- Tailwind CSS + custom shadcn-like primitives
- Zod for all input validation
- `jose` for signed JWT session cookies, `argon2` for password + PIN hashing
- `date-fns` + `date-fns-tz` for timezone-aware streaks and weekly reports
- `recharts` for the parent weekly chart (one chart, deliberately minimal)
- Vitest for unit + integration tests

## Quick start

```bash
# 1. Install deps
npm install

# 2. Configure env (see `Environment` below)
cp .env.example .env
# then edit .env: set DATABASE_URL, AUTH_SECRET, BOOTSTRAP_TOKEN

# 3. Migrate the database
npx prisma migrate dev

# 4. (Optional) seed with defaults + one parent + one child
npm run db:seed

# 5. Start the app
npm run dev
```

Open <http://localhost:3000>. If no parents exist yet, you'll be redirected to `/setup`.

## Environment

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | yes |
| `AUTH_SECRET` | 32+ char secret used to sign session JWTs | yes |
| `BOOTSTRAP_TOKEN` | One-off token to create the first parent via `/setup` | yes (until first parent exists) |
| `APP_TIMEZONE` | IANA zone for streaks/reports (default `Europe/Moscow`) | no |
| `PARENT_SESSION_DAYS` | Session duration, parent (default `7`) | no |
| `CHILD_SESSION_DAYS` | Session duration, child (default `30`) | no |
| `NEXT_PUBLIC_APP_URL` | Canonical URL (used for links in emails — reserved for future) | no |
| `SEED_PARENT_EMAIL` / `SEED_PARENT_PASSWORD` / `SEED_PARENT_NAME` | Seed script inputs | no (seed only) |
| `SEED_CHILD_NAME` / `SEED_CHILD_PIN` | Seed script inputs (default PIN `123456` — change!) | no (seed only) |

## Creating the first parent

Two options:

**Web `/setup`** — start the app, navigate to `/setup`, and enter your `BOOTSTRAP_TOKEN`, name, email, and password. Disabled once any parent exists.

**CLI** — `npm run bootstrap:parent -- --email you@example.com --password "strong" --name "You"`.

Add additional parents from the parent **Settings** screen.

## Day-to-day commands

```bash
npm run dev             # next dev
npm run build           # prisma generate && next build
npm run typecheck       # tsc --noEmit
npm run lint
npm run test            # vitest (unit + integration)
npm run test:unit
npm run test:integration
npm run prisma:studio   # inspect DB
```

## Database

Schema lives in `prisma/schema.prisma`. Key invariants:

- `AssignedTask` has a unique index on `(taskDefinitionId, childId, scheduledDate)` so recurring generation can safely `createMany({ skipDuplicates: true })`.
- `AssignedTask.pointsAwarded` and `RewardRequest.costAtRequest` are **snapshots** — editing a task or reward does not retroactively change historical balances.
- `ChildProfile.currentPoints` is denormalized. `lib/services/points.calculateChildBalanceFromLedgerOrValidatedState()` can recompute from the ledger and verify consistency; the parent per-child page surfaces any drift.
- Non-negative balance is enforced inside `applyPointsDelta` (transactional read-then-write) — throws `InsufficientPointsError` if `currentPoints + delta < 0`.

## Timezones

All day-bucketing (streaks, weekly reports, recurring generation, reward expiry checks) is done in `APP_TIMEZONE`. Helpers live in `lib/utils/dates.ts`. Tests pin `APP_TIMEZONE=Europe/Moscow`.

## Levels

Edit `config/levels.ts`. Each index position is the minimum points for level `index + 1`. Ten levels ship by default.

## Default categories, tasks, and rewards

Edit `config/defaults.ts`. The seed script uses these if the tables are empty. After bootstrap you can manage everything from the parent UI.

## CSV exports

Parent → Reports → Export. Endpoints at `/api/export/{activity,tasks,points,rewards}` accept `childId`, `from`, `to` query parameters. Output is UTF-8 with BOM so Russian text opens correctly in Excel.

## Security notes

- Passwords and PINs are hashed with argon2id (`memoryCost=19456`, `timeCost=2`).
- Sessions are signed JWTs in an HttpOnly, SameSite=Lax cookie named `fcr_session`.
- In-process rate limit: 5 failed login attempts per key per 15 minutes (`lib/auth/rate-limit.ts`). On serverless this is best-effort per instance.
- `/setup` refuses to create a parent once any parent exists, even with a valid token; the token comparison is constant-time.
- `middleware.ts` fails closed if `AUTH_SECRET` is missing or too short — it redirects to `/parent-login`.

## Folder layout

```
app/                  # Next.js App Router
  (public)/           # /parent-login, /child-login, /setup
  (app)/
    parent/           # dashboard, approvals, tasks, rewards, categories, reports, settings, children/[id]
    child/            # dashboard, tasks, rewards, history
  api/
    auth/             # parent-login, parent-logout, child-login, child-logout
    export/           # CSV exports
    health/
components/           # ui/ primitives + domain/ (parent/, child/, shared/)
config/               # app.ts, levels.ts, defaults.ts
lib/
  auth/               # session, password, pin, permissions, rate-limit, parent-auth, child-pin-auth
  db/prisma.ts
  i18n/ru.ts          # single source of Russian strings
  services/           # tasks, points, rewards, streaks, levels, reports, children, categories, approvals, activity-log, bootstrap
  utils/              # dates, format, csv, leveling, cn
  validators/         # zod schemas
prisma/               # schema.prisma, seed.ts
scripts/              # bootstrap.ts (CLI)
tests/                # unit/, integration/
```

## Testing

Unit tests (`tests/unit/*`) run against pure functions with no DB:

- `levels.test.ts` — level math, thresholds, progress %
- `format.test.ts` — Russian point pluralization
- `dates.test.ts` — timezone-aware day bucketing (MSK)
- `csv.test.ts` — CSV writer, BOM, escaping
- `streaks.test.ts` — pure `nextStreakValue` transition
- `recurrence.test.ts` — `shouldGenerateOn` for DAILY / WEEKLY / WEEKDAYS

Integration tests (`tests/integration/*`) expect a live Postgres pointed at by `DATABASE_URL` with the schema migrated.

## Deployment

This is a standard Next.js 14 app. Any Node 20 host with Postgres works — Railway, Fly, Render, a VPS, etc. For Vercel, note that:

- Login rate limiting is per instance (acceptable for family use).
- Session cookies require HTTPS in production (`Secure` flag is set automatically when `NODE_ENV=production`).
- Run `prisma migrate deploy` on each release.

## Non-goals

This build deliberately does **not** include: notifications, badges, avatars, user-uploaded images, multi-language UI, offline mode, leaderboards, task comments, 2FA, or confetti animations. Adding any of these later should be trivial — the service layer is isolated from UI, and all user-visible strings flow through `lib/i18n/ru.ts`.

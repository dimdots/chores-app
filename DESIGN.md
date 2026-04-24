# Family Chores & Rewards — Design Doc

This is the upfront design doc for the MVP. The app is built phase by phase after
this. Any deviations from the original spec are called out under **Assumptions**.

---

## 1. Concise technical plan

We build a single Next.js 14 (App Router, TypeScript) application that serves both
parent and child UIs, backed by Postgres via Prisma. Parent authentication uses
email + password with `argon2id` hashing; child authentication uses a 6-digit PIN
with the same hashing (rate-limited). Sessions are stateless signed JWT cookies
(HTTP-only, SameSite=Lax, Secure in prod) — no NextAuth dependency, because we
have two distinct auth flows and want full control over role + child-id claims.

All business logic lives in `lib/services/*`, which are **the only path** for
mutating state. UI (server components, server actions, route handlers) calls into
services. Services enforce authorization, validate with Zod, write to Prisma
inside transactions where consistency matters (points, approvals, reward redemptions),
and emit `ActivityLog` rows for audit.

Gamification is kept narrow: configurable level thresholds, a derived streak based
on dates of approved tasks, and a progress bar. No badges, avatars, sounds, or
animations.

UI is Russian-only but all user-facing strings live in a single `lib/i18n/ru.ts`
dictionary so localization can be added later by duplicating that file.

---

## 2. Final proposed stack

- **Framework**: Next.js 14 (App Router, React Server Components, Server Actions)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS + a small hand-rolled component kit in `components/ui/`
  inspired by shadcn/ui primitives (Button, Card, Input, Select, Dialog, Badge,
  ProgressBar, Toast). We do not pull the shadcn CLI to keep the dep tree small;
  the components are idiomatic and easily replaceable.
- **DB**: PostgreSQL 15+
- **ORM**: Prisma
- **Auth**: custom — `jose` for JWT signing, `argon2` for password/PIN hashing,
  signed HTTP-only cookies.
- **Validation**: Zod
- **Dates**: `date-fns` + `date-fns-tz` (streaks/weekly reports are timezone-aware)
- **Charts**: `recharts` (used only for the parent weekly points bar; kept minimal)
- **Testing**: Vitest for unit/integration; Playwright optional for e2e smoke
- **Lint/format**: ESLint + Prettier
- **Deployment**: Vercel (recommended) with a managed Postgres (Neon/Supabase/RDS).
  Self-hosting via Docker is documented but not required.

---

## 3. Final folder structure

The tree below matches the user-supplied structure with small, deliberate tweaks:

- `lib/i18n/ru.ts` is added for the Russian dictionary.
- `lib/auth/password.ts` and `lib/auth/pin.ts` split hashing helpers cleanly.
- `lib/services/bootstrap.ts` handles first-time parent creation via env token.
- `components/ui/` holds the tiny in-house UI kit.

```
/
  app/
    (public)/
      parent-login/page.tsx
      child-login/page.tsx
      setup/page.tsx               # first-parent bootstrap using BOOTSTRAP_TOKEN
    (app)/
      layout.tsx
      page.tsx                     # redirects by role
      parent/
        layout.tsx                 # requires role=PARENT
        dashboard/page.tsx
        tasks/page.tsx
        tasks/new/page.tsx
        tasks/[id]/page.tsx
        tasks/[id]/assign/page.tsx
        categories/page.tsx
        approvals/page.tsx
        rewards/page.tsx
        rewards/new/page.tsx
        rewards/[id]/page.tsx
        reports/page.tsx
        settings/page.tsx
        children/[id]/page.tsx
      child/
        layout.tsx                 # requires role=CHILD
        dashboard/page.tsx
        tasks/page.tsx
        rewards/page.tsx
        history/page.tsx
    api/
      auth/
        parent-login/route.ts
        parent-logout/route.ts
        child-login/route.ts
        child-logout/route.ts
      export/
        activity/route.ts
        tasks/route.ts
        points/route.ts
        rewards/route.ts
      health/route.ts
    layout.tsx
    globals.css
  components/
    ui/
      button.tsx  card.tsx  input.tsx  select.tsx  dialog.tsx
      badge.tsx   progress.tsx textarea.tsx toast.tsx  empty-state.tsx
    layout/
      app-shell.tsx  mobile-nav.tsx  header.tsx
    parent/
      approval-card.tsx  task-form.tsx  reward-form.tsx  category-editor.tsx
      weekly-chart.tsx   quick-actions.tsx  child-summary-card.tsx
    child/
      points-hero.tsx  level-progress.tsx  streak-flame.tsx
      task-tile.tsx    reward-tile.tsx     history-row.tsx
    shared/
      status-pill.tsx  confirm-dialog.tsx  pagination.tsx
  lib/
    auth/
      parent-auth.ts    # login / logout / hash-verify for parents
      child-pin-auth.ts # login / logout / hash-verify for children
      session.ts        # JWT sign/verify, cookie helpers, getSession()
      permissions.ts    # requireParent(), requireChild(), requireChildOwnership()
      password.ts
      pin.ts
      rate-limit.ts     # naive in-memory + DB-backed fallback for PIN attempts
    db/
      prisma.ts
    services/
      tasks.ts
      approvals.ts
      points.ts
      rewards.ts
      reports.ts
      streaks.ts
      levels.ts
      children.ts
      categories.ts
      exports.ts
      activity-log.ts
      bootstrap.ts
    validators/
      task.ts  reward.ts  auth.ts  category.ts  points.ts  child.ts
    utils/
      dates.ts      # startOfWeek, daysBetween, timezone helpers
      csv.ts        # CSV writer with UTF-8 BOM
      format.ts     # points formatting, Russian plural helpers
      leveling.ts   # pure level math, unit-testable
    i18n/
      ru.ts
  prisma/
    schema.prisma
    seed.ts
    migrations/
  hooks/
    use-toast.ts
  types/
    session.ts  api.ts  domain.ts
  config/
    app.ts        # APP_TIMEZONE, etc.
    levels.ts     # level thresholds (editable)
    defaults.ts   # default categories, sample tasks, sample rewards
  public/
  scripts/
    bootstrap.ts  # CLI helper to create first parent
  tests/
    unit/
      levels.test.ts  streaks.test.ts  points.test.ts  csv.test.ts
    integration/
      approval-flow.test.ts  reward-flow.test.ts  auth.test.ts
    e2e/
      smoke.spec.ts  # Playwright (optional)
    setup.ts
  middleware.ts
  package.json
  tsconfig.json
  tailwind.config.ts
  postcss.config.mjs
  next.config.mjs
  vitest.config.ts
  eslint.config.mjs
  .env.example
  README.md
```

---

## 4. Prisma schema (final)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  PARENT
  CHILD
}

enum RecurrenceType {
  NONE
  DAILY
  WEEKLY
  WEEKDAYS
}

enum AssignedTaskStatus {
  ASSIGNED
  PENDING_APPROVAL
  APPROVED
  REJECTED
  CANCELED
}

enum RewardRequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELED
}

model User {
  id           String   @id @default(cuid())
  role         Role
  name         String
  email        String?  @unique
  passwordHash String?
  pinHash      String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  childProfile ChildProfile?
  createdTasks TaskDefinition[]   @relation("TaskCreatedBy")
  decidedTasks AssignedTask[]     @relation("TaskApprovedBy")
  pointAdj     PointAdjustment[]  @relation("PointAdjCreatedBy")
  createdRewards Reward[]         @relation("RewardCreatedBy")
  decidedRewardReqs RewardRequest[] @relation("RewardDecidedBy")
  activityActor ActivityLog[]     @relation("ActivityActor")

  @@index([role, isActive])
}

model ChildProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  displayName   String
  currentPoints Int      @default(0)
  currentLevel  Int      @default(1)
  currentStreak Int      @default(0)
  lastStreakDate DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  assignedTasks AssignedTask[]
  pointAdj      PointAdjustment[]
  rewardRequests RewardRequest[]
  activityLogs  ActivityLog[]
}

model TaskCategory {
  id        String   @id @default(cuid())
  name      String   @unique
  isActive  Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tasks TaskDefinition[]

  @@index([isActive, sortOrder])
}

model TaskDefinition {
  id             String         @id @default(cuid())
  title          String
  description    String?
  categoryId     String
  points         Int
  recurrenceType RecurrenceType @default(NONE)
  recurrenceDays String?        // JSON array of 0-6 (Sun..Sat) when WEEKDAYS
  isActive       Boolean        @default(true)
  createdById    String
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  category  TaskCategory   @relation(fields: [categoryId], references: [id])
  createdBy User           @relation("TaskCreatedBy", fields: [createdById], references: [id])
  assigned  AssignedTask[]

  @@index([isActive])
  @@index([categoryId])
}

model AssignedTask {
  id                    String             @id @default(cuid())
  taskDefinitionId      String
  childId               String
  dueDate               DateTime?
  scheduledDate         DateTime?
  status                AssignedTaskStatus @default(ASSIGNED)
  completionRequestedAt DateTime?
  approvedAt            DateTime?
  approvedById          String?
  rejectionReason       String?
  pointsAwarded         Int                @default(0) // snapshot at approval
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  taskDefinition TaskDefinition @relation(fields: [taskDefinitionId], references: [id])
  child          ChildProfile   @relation(fields: [childId], references: [id], onDelete: Cascade)
  approvedBy     User?          @relation("TaskApprovedBy", fields: [approvedById], references: [id])

  @@index([childId, status])
  @@index([status, createdAt])
  @@index([childId, scheduledDate])
  @@unique([taskDefinitionId, childId, scheduledDate], name: "uniq_child_task_per_day")
}

model PointAdjustment {
  id          String   @id @default(cuid())
  childId     String
  value       Int      // may be negative
  reason      String
  createdById String
  createdAt   DateTime @default(now())

  child     ChildProfile @relation(fields: [childId], references: [id], onDelete: Cascade)
  createdBy User         @relation("PointAdjCreatedBy", fields: [createdById], references: [id])

  @@index([childId, createdAt])
}

model Reward {
  id            String   @id @default(cuid())
  title         String
  description   String?
  cost          Int
  isActive      Boolean  @default(true)
  expiresAt     DateTime?
  quantityLimit Int?
  quantityUsed  Int      @default(0)
  createdById   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  createdBy User           @relation("RewardCreatedBy", fields: [createdById], references: [id])
  requests  RewardRequest[]

  @@index([isActive])
}

model RewardRequest {
  id              String              @id @default(cuid())
  rewardId        String
  childId         String
  status          RewardRequestStatus @default(PENDING)
  costAtRequest   Int                 // snapshot — reward cost may change later
  requestedAt     DateTime            @default(now())
  decidedAt       DateTime?
  decidedById     String?
  rejectionReason String?

  reward    Reward       @relation(fields: [rewardId], references: [id])
  child     ChildProfile @relation(fields: [childId], references: [id], onDelete: Cascade)
  decidedBy User?        @relation("RewardDecidedBy", fields: [decidedById], references: [id])

  @@index([childId, status])
  @@index([status, requestedAt])
}

model ActivityLog {
  id           String   @id @default(cuid())
  childId      String?
  actorUserId  String?
  eventType    String   // TASK_APPROVED, TASK_REJECTED, REWARD_APPROVED, ADJUSTMENT, LOGIN, etc.
  referenceType String? // "AssignedTask" | "RewardRequest" | "PointAdjustment" | ...
  referenceId  String?
  pointsDelta  Int      @default(0)
  metadata     Json?
  createdAt    DateTime @default(now())

  child ChildProfile? @relation(fields: [childId], references: [id], onDelete: Cascade)
  actor User?         @relation("ActivityActor", fields: [actorUserId], references: [id])

  @@index([childId, createdAt])
  @@index([createdAt])
  @@index([eventType])
}

// Used for first-parent bootstrap and for PIN-reset flows (optional future use).
// Kept intentionally small; tokens consumed on use.
model InviteToken {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  purpose   String   // "BOOTSTRAP_PARENT" | "RESET_CHILD_PIN"
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
}
```

### Schema notes
- `ChildProfile.currentPoints` is the denormalized balance; it is only mutated
  inside a DB transaction that also writes an `ActivityLog` and/or
  `PointAdjustment` / `AssignedTask` update. The invariant
  `currentPoints = sum(PointAdjustments) + sum(approved task snapshots) - sum(approved reward snapshots)`
  is enforced at write-time by the service layer and validated via a debug
  recompute helper.
- `AssignedTask.pointsAwarded` and `RewardRequest.costAtRequest` are **snapshots**
  so that editing a TaskDefinition's points or a Reward's cost later does not
  retroactively change the child's balance.
- `@@unique([taskDefinitionId, childId, scheduledDate])` prevents recurring
  generators from double-creating the same task on the same day.
- `Role` is on `User` so a single table handles both parents and children; child
  PINs and parent passwords never coexist on the same row.

---

## 5. Implementation order

Execution matches the 8 phases in the spec, with small practical reordering —
the Prisma schema is committed during Phase 1 (so TypeScript types exist),
migrations and seed data are finalized during Phase 3, and business-logic
services come online in Phase 4–7.

1. **Phase 1 — Scaffold**: Next.js + Tailwind + Prisma + TS config, global layout,
   empty pages, middleware stub, `i18n/ru.ts` scaffolding, env.example, health
   route, CI-friendly scripts.
2. **Phase 2 — Auth & guards**: session/JWT helpers, password + PIN hashing,
   parent-login + child-login server actions/routes, middleware that redirects
   unauthenticated users, `requireParent` / `requireChild`.
3. **Phase 3 — Models & seed**: finalize `schema.prisma`, run first migration,
   write `prisma/seed.ts` (parent + child placeholders, default categories,
   sample tasks, sample rewards).
4. **Phase 4 — Tasks**: categories, task definitions, recurring generator,
   assignment, child completion, parent approval/rejection. Service +
   server actions + UI.
5. **Phase 5 — Points & rewards**: manual adjustments, non-negative guard
   inside Prisma transactions, rewards CRUD, request/approve/reject flow.
6. **Phase 6 — Dashboards & gamification**: parent and child dashboards,
   `streaks.ts`, `levels.ts`, progress bar.
7. **Phase 7 — Reports & CSV exports**: weekly points, most completed chores,
   reward history, full activity history, CSV endpoints with UTF-8 BOM.
8. **Phase 8 — Hardening**: validator cleanup, empty states, mobile polish,
   unit + integration tests, README, deployment instructions.
9. **Verification**: typecheck, lint, unit + integration test run, spot
   review.

---

## 6. Assumptions (called out explicitly)

1. **Postgres**. Spec says Postgres; we do not add SQLite fallback. For local
   dev we recommend Docker (`docker run postgres:15`) or a free Neon branch.
2. **Single timezone**. `APP_TIMEZONE` env var (default `Europe/Moscow`).
   Streaks, weekly buckets, and recurring generation all use this zone. No
   per-user timezone.
3. **Child PIN rate limiting** uses a small in-process LRU + a DB-backed
   fallback that records recent failed attempts on the `ActivityLog`. This
   is sufficient for family-scale traffic; it is not a replacement for
   Cloudflare-grade throttling.
4. **Bootstrap**. First parent is created via `/setup` using a one-time
   `BOOTSTRAP_TOKEN` from env. Second parent and children are created by
   any authenticated parent from `/parent/settings`.
5. **Child session duration**. Child sessions last 30 days on trusted devices
   (configurable via `CHILD_SESSION_DAYS`). Parent sessions last 7 days.
6. **Recurring tasks** are materialized lazily: the parent dashboard and the
   child dashboard call `generateRecurringTasksIfNeeded(childId, today)` which
   idempotently creates the day's `AssignedTask` rows from active recurring
   `TaskDefinition` rows. No cron is required.
7. **Reset**. "Reset cycle" does **not** destroy historical rows. It simply
   records a `CYCLE_RESET` event in `ActivityLog`; reporting respects the
   latest cycle as its default window. Historical exports remain complete.
8. **Russian only**. All strings go through `t(key)` from `lib/i18n/ru.ts`.
   A future locale swap means providing a second dictionary and plumbing
   locale into `getSession()`.
9. **No notifications, badges, avatars, images, multi-language, offline,
   leaderboards, or animations** — per spec.

---

## 7. Deliverables

After all phases ship, the workspace folder contains:

- Full Next.js codebase (`app/`, `components/`, `lib/`, `prisma/`, …)
- `prisma/schema.prisma` and `prisma/seed.ts`
- `.env.example`
- `README.md` with setup, env, DB, seed, local dev, tests, deploy, and
  "how to create the first parent" instructions
- `tests/` with unit + integration suites
- This `DESIGN.md`

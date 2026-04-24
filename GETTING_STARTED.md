# Getting started — step by step

What to do, in order, to go from "just-generated code" to "working app you can use every day".

## Part 1 — Local setup (≈15 min)

### 1. Confirm Node 20

```bash
node -v
```

Expect `v20.x` or newer. If not, install from [nodejs.org](https://nodejs.org/) or via `nvm install 20 && nvm use 20`.

### 2. Get Postgres running

Pick one:

**Option A — Homebrew (macOS):**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb chores
```

**Option B — Docker (any OS):**
```bash
docker run --name chores-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
docker exec -u postgres chores-pg createdb chores
```

### 3. Install dependencies

From the project root:

```bash
npm install
```

If this is your first run, it will also generate the Prisma client.

### 4. Create your `.env`

```bash
cp .env.example .env
```

### 5. Generate real secrets

Run both commands and paste the outputs into `.env`:

```bash
# AUTH_SECRET — signs session cookies. Keep it stable; rotating logs everyone out.
openssl rand -base64 48

# BOOTSTRAP_TOKEN — one-off, used only for creating the first parent via /setup.
openssl rand -hex 24
```

Open `.env` and replace the placeholder values.

### 6. Set the database URL

In `.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chores?schema=public"
```

If you used Homebrew Postgres, the default user is usually your macOS username with no password:

```
DATABASE_URL="postgresql://YOUR_MAC_USERNAME@localhost:5432/chores?schema=public"
```

### 7. Apply the schema

```bash
npx prisma migrate dev --name init
```

This creates all tables and indexes. Prisma will also generate the client.

### 8. (Optional) Seed defaults

Creates default categories, a few sample tasks, sample rewards, one parent, and one child. Useful for poking around; skip if you want an empty slate.

```bash
# Set seed credentials in .env first, or accept the defaults:
# SEED_PARENT_EMAIL="you@example.com"
# SEED_PARENT_PASSWORD="seedpass123"
# SEED_PARENT_NAME="Dima"
# SEED_CHILD_NAME="Саша"
# SEED_CHILD_PIN="123456"

npm run db:seed
```

If you seeded, skip to step 11.

## Part 2 — First run (≈5 min)

### 9. Start the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

### 10. Create the first parent via `/setup`

You'll be auto-redirected to `/setup` if no parent exists. Enter:

- Bootstrap token: the `BOOTSTRAP_TOKEN` value from `.env`
- Your name, email, password (≥ 8 chars)

Hit submit. You'll be redirected to the parent login — sign in.

### 11. Verify the parent flow

On the parent dashboard:

- Click **Настройки** → **Добавить ребёнка** → create a child with a 6-digit PIN.
- Click **Задания** → **Новое задание** → create a one-off task (e.g. "Убрать комнату", 25 очков, **Без повтора**).
- Click **Задания** → open the task → in the assign panel, assign it to your child.

### 12. Verify the child flow

- Click the avatar / **Выйти**.
- Go to `/child-login`, pick the child, enter the 6-digit PIN.
- You should see today's tasks. Tap **Готово!** on the task you just assigned.

### 13. Verify the approval loop

- Sign out, log back in as the parent.
- **Одобрения** should show the pending task. Approve it.
- The child's balance on the dashboard should update, their streak should be 1, and the activity feed should show "Задание одобрено".

### 14. Verify rewards

- Create a reward: **Награды** → **Новая награда** (e.g. "Пицца", cost = current child balance or less).
- Log in as the child, go to **Награды**, request it.
- Log back in as the parent, approve it from **Одобрения**. The child's balance should drop.

If all four loops worked, the app is correctly wired end-to-end.

## Part 3 — Quality gates (≈5 min)

### 15. Typecheck and lint

```bash
npm run typecheck
npm run lint
```

Fix anything that comes up. These weren't runnable in the sandbox where the code was written, so there may be a few strict-mode nits.

### 16. Run tests

```bash
npm run test:unit            # pure, always runs
npm run test:integration     # runs against DATABASE_URL; skips if unset
```

## Part 4 — Customize (≈30 min, optional)

Each of these is a single-file edit:

### 17. Tune the leveling curve

`config/levels.ts` — each index is the minimum points to reach that level.

### 18. Customize default categories, tasks, rewards

`config/defaults.ts` — what the seed script inserts. Only used if the tables are empty, so re-running the seed on a non-empty DB won't overwrite anything.

### 19. Polish copy

`lib/i18n/ru.ts` — single source of every Russian string. Change freely; the keys are stable.

## Part 5 — Deploy (≈30 min, when you're ready)

Any Node 20 host with Postgres works. A minimal flow:

### 20. Provision

- Create a managed Postgres (Supabase, Neon, Railway, RDS — anything).
- Create a Node hosting app (Vercel, Fly, Railway, Render).

### 21. Set production env vars

On the host, set:

- `DATABASE_URL` — production Postgres URL, with `sslmode=require` if the provider asks for it.
- `AUTH_SECRET` — a **new** value generated with `openssl rand -base64 48`. Do not reuse the local one.
- `BOOTSTRAP_TOKEN` — a **new** value generated with `openssl rand -hex 24`.
- `APP_TIMEZONE` — `Europe/Moscow` (or wherever your family lives).
- `NEXT_PUBLIC_APP_URL` — your production URL.

### 22. Push the schema

```bash
DATABASE_URL="your-prod-url" npx prisma migrate deploy
```

### 23. Deploy

Whatever your host's deploy command is. On Vercel this is `git push`; on Fly it's `fly deploy`; etc. Build command is `npm run build` (which runs `prisma generate` first).

### 24. Create the first production parent

Visit `https://your-app.example.com/setup`, enter the production `BOOTSTRAP_TOKEN`, create your account.

### 25. Lock down

Once the first parent exists, either:

- Unset `BOOTSTRAP_TOKEN` in the host's env (recommended), or
- Rotate it so the old value is invalid.

The `/setup` page is already disabled automatically once any parent exists — but removing the token is belt-and-suspenders.

### 26. Add the second parent

From **Настройки** → **Добавить родителя**.

You're live.

---

## If something goes wrong

- **`/setup` says "disabled"** — a parent already exists. Use `/parent-login` or run the CLI: `npm run bootstrap:parent -- --email you@example.com --password "strong" --name "You"`.
- **Child can't log in** — verify the PIN in Settings; use **Сбросить PIN** if needed.
- **Balance looks wrong** — the per-child page (`/parent/children/[id]`) shows a ⚠️ warning if the denormalized balance drifts from the ledger sum. If you see it, open an issue with the DB state; `calculateChildBalanceFromLedgerOrValidatedState` in `lib/services/points.ts` has the recompute logic.
- **Recurring tasks not appearing** — they materialize lazily when the child opens their dashboard. Verify the task's recurrence type and (for WEEKDAYS) that today's weekday is selected.
- **"Too many attempts"** — the in-process rate limiter triggered (5 failures / 15 min). Wait it out, or restart the server in dev.

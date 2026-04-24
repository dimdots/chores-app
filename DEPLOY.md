# Deploying to Vercel + Neon

One-time setup to put the app online at a default `*.vercel.app` subdomain,
backed by a Neon Postgres database. Total time: ~20 minutes.

The code-level pre-flight changes have already been made:
- `prisma/schema.prisma` has `binaryTargets = ["native", "rhel-openssl-3.0.x"]` so the Prisma engine that ships in the Vercel build matches Vercel's Linux runtime.
- `package.json` has a `postinstall` that runs `prisma generate`, and the `build` script now runs `prisma migrate deploy` before `next build` so every deploy applies pending migrations automatically.

---

## 1. Push the repo to GitHub

Vercel deploys from a Git repo. If this isn't on GitHub yet:

```bash
cd "/Users/dima/Documents/Claude/Projects/Chores app"
git init -b main            # skip if already a repo
git add -A
git commit -m "Prep for Vercel deploy"
# create a new private repo on github.com, then:
git remote add origin git@github.com:<your-user>/chores-app.git
git push -u origin main
```

Double-check `.gitignore` lists `.env` and `node_modules` before pushing — you
don't want to leak your local `AUTH_SECRET`.

## 2. Create a Neon Postgres database

1. Sign up at https://neon.tech (GitHub login works). Free tier is enough.
2. Create a new project. Region: pick the one closest to you (likely Frankfurt
   for Europe/Moscow).
3. On the project dashboard, open **Connection Details** and copy both:
   - **Pooled connection string** — this is what the app uses at runtime.
     Contains `-pooler` in the hostname.
   - **Direct connection string** — no `-pooler`. Prisma migrations must use
     this one; the pooler rejects the migration advisory lock.
4. Add `?sslmode=require` to both if Neon didn't already append it.

You'll paste both into Vercel in step 4.

## 3. Import the repo into Vercel

1. Go to https://vercel.com/new and import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. Build command: leave as-is — our `package.json` already does `prisma generate && prisma migrate deploy && next build`.
4. Before clicking **Deploy**, expand **Environment Variables** and add the ones below.

## 4. Environment variables

Set all of these in Vercel → Project → Settings → Environment Variables.
Use the **Production** scope (you can mirror them into Preview later).

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** string + `?pgbouncer=true&connection_limit=1&sslmode=require` |
| `DIRECT_URL` | Neon **direct** string + `?sslmode=require` (used by `prisma migrate deploy`) |
| `AUTH_SECRET` | Generate fresh: `openssl rand -base64 48`. Don't reuse the local one. |
| `BOOTSTRAP_TOKEN` | Generate fresh: `openssl rand -hex 24`. You'll use this exactly once. |
| `APP_TIMEZONE` | `Europe/Moscow` (or whatever matches you) |
| `NEXT_PUBLIC_APP_URL` | Leave blank for now; fill in after you know the Vercel URL |

To wire Prisma's migration step at `DIRECT_URL`, update the datasource block
in `prisma/schema.prisma` to:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Commit + push that one-line change before deploying, otherwise migrations will
try to run through the pooler and hang.

## 5. First deploy

Click **Deploy**. Vercel will:

1. Install deps → `postinstall` runs `prisma generate` with the new Linux engine.
2. `prisma migrate deploy` applies all three migrations (`init`, `add_reactions_auto_approve`, `add_lifetime_points`) against your empty Neon DB.
3. `next build` compiles the app.

If the build fails at the migrate step, it's almost always `DATABASE_URL` /
`DIRECT_URL` pointing at the wrong Neon connection (pooled vs. direct swapped).

Once green, note the deployment URL (something like
`chores-app-<hash>.vercel.app`). Go back to env vars, set `NEXT_PUBLIC_APP_URL`
to that URL, and redeploy (or push any commit).

## 6. Bootstrap your parent account

1. Visit `https://<your-vercel-url>/setup`.
2. Enter the `BOOTSTRAP_TOKEN` you set in step 4, plus your parent name and
   6-digit PIN.
3. Submit. You now have a parent profile.
4. **Rotate the token:** back in Vercel env vars, either delete
   `BOOTSTRAP_TOKEN` or replace it with a new value. This disables `/setup`
   so no one else can create a second parent through it.
5. Log in at `/login`, then go to **Settings → Children** and add your kid's
   profile + PIN.

## 7. Seed the starter data (optional)

The app ships a small seed (a couple of categories, a sample reward). It's
not automatic in production. If you want it:

```bash
# locally, pointing at the Neon DB:
DATABASE_URL="<your-neon-pooled-url>" npm run db:seed
```

You can equally well create categories/tasks/rewards through the UI — the
seed is a convenience, not required.

---

## After it's live

- **Redeploying:** just `git push`. Vercel builds, runs migrations, ships.
- **Adding a custom domain:** Vercel → Project → Settings → Domains. Add the
  domain, follow the DNS instructions. No code changes needed.
- **Viewing the DB:** `npx prisma studio` locally with `DATABASE_URL` pointing
  at Neon gives you a GUI.
- **If you rotate `AUTH_SECRET`:** everyone gets logged out. Not a problem,
  just means re-entering PINs.

## Known gotchas

- **argon2 native binding.** The app uses `argon2` for PIN hashing. Version
  0.41.x ships prebuilt binaries that work on Vercel's Lambda runtime, but
  if the first deploy errors with "argon2 binding not found", the fix is
  adding `"argon2"` to `serverComponentsExternalPackages` in `next.config.mjs`
  and redeploying.
- **Neon free-tier cold starts.** The DB sleeps after ~5 min of no traffic.
  First request after idle takes ~1s longer while Neon spins up. Harmless
  for a family app; upgrade to Launch tier ($19/mo) if it annoys you.
- **Timezone.** `APP_TIMEZONE` drives "today" for streaks and recurring task
  generation. If you set it wrong, tasks will roll over at an awkward hour.

# P0 + P1 implementation plan

Companion to `UX_AUDIT.md`. Ordered for minimum file thrash: each commit batches fixes that touch the same files. The new chat can work top-to-bottom without re-investigating.

**Before starting:** make sure local dev DB is in sync (`npx prisma migrate deploy`) and `npm run typecheck` passes on `main`.

---

## Commit 1 — i18n cleanup (P0 #4 + #5)

Touches `lib/i18n/ru.ts`, `lib/i18n/fr.ts`, `lib/utils/dates.ts`, and 10+ consumer files. Done together because both fixes mutate the dict files.

### 1a. Extend the `Dict` type

In `lib/i18n/ru.ts` (Dict definition) and apply to both `ru.ts` and `fr.ts`:

```ts
app: {
  // …existing…
  weekdaysShort: string[];   // ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"] / ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"]
}
login: {
  // …existing…
  fallbackEmailWithPin: string;     // "Войдите по email и задайте PIN в настройках." / FR
  fallbackEmailOrInvite: string;    // "Войдите по email или используйте ссылку-приглашение." / FR
  childNoChildrenYet: string;       // "Родитель сначала должен создать профиль ребёнка." / FR
}
childDashboard: {
  // …existing…
  maxLevel: string;                 // "Макс. уровень" / "Niveau max"
}
rewards: {
  // …existing…
  expiresUntilPrefix: string;       // "до" / "jusqu'au"
}
settings: {
  // …existing…
  parentName: string;               // "Имя" / "Prénom"
  childName: string;                // "Имя" / "Prénom"
  childDisplayName: string;         // "Отображаемое имя" / "Nom affiché"
}
```

### 1b. Replace hardcoded RU strings

| File | Line(s) | Replace with |
|------|---------|--------------|
| `app/(public)/login/page.tsx` | 58-59 | `hasAnyParent ? t.login.fallbackEmailWithPin : t.login.fallbackEmailOrInvite` |
| `app/(public)/child-login/page.tsx` | 40 | `t.login.childNoChildrenYet` |
| `app/(public)/child-login/child-login-form.tsx` | 51 | `t.settings.childName` (or new `t.login.childNameLabel`) |
| `app/(app)/parent/rewards/page.tsx` | 44 | `${t.rewards.expiresUntilPrefix} ${formatDate(r.expiresAt, locale)} · ` |
| `app/(app)/parent/settings/add-parent-form.tsx` | 38 | `t.settings.parentName` |
| `app/(app)/parent/settings/add-child-form.tsx` | 42, 53 | `t.settings.childName`, `t.settings.childDisplayName` |
| `components/child/level-progress.tsx` | 19 | `t.childDashboard.maxLevel` |

### 1c. Day-label constants — move to dict

Delete `const DAY_LABELS_RU = …` from each of these and read from `t.app.weekdaysShort` instead:
- `app/(app)/parent/dashboard/page.tsx:19`
- `app/(app)/parent/reports/page.tsx:26`
- `app/(app)/parent/children/[id]/page.tsx:21`

Same access pattern: `DAY_LABELS_RU[dow]` becomes `t.app.weekdaysShort[dow]`.

### 1d. Locale-aware date helpers

In `lib/utils/dates.ts`, add (keep the `Ru` ones for now to avoid breaking anything in-flight, just don't add new callers):

```ts
import type { Locale } from "@/lib/i18n";

// Maps our locale → BCP 47 tag for Intl.
const localeMap: Record<Locale, string> = { ru: "ru-RU", fr: "fr-FR" };

export function formatDateTime(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(localeMap[locale], {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    timeZone: appConfig.timezone,
  }).format(d);
}

export function formatDate(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(localeMap[locale], {
    day: "numeric", month: "short", year: "numeric",
    timeZone: appConfig.timezone,
  }).format(d);
}
```

Then swap every call site (grep found 8 files):

- `components/parent/approval-card.tsx` — uses `formatDateTimeRu(row.requestedAt)` ×2. Component already calls `useLocale()`; pass it through.
- `app/(app)/child/history/page.tsx` — `getLocale()` already in scope.
- `app/(app)/child/dashboard/page.tsx` — same.
- `app/(app)/parent/reports/page.tsx` — needs `getLocale()` added.
- `app/(app)/parent/children/[id]/page.tsx` — same.
- `app/(app)/parent/dashboard/page.tsx` — `getLocale()` already in scope.
- `app/(app)/parent/rewards/page.tsx` — `getLocale()` already in scope.

After all callers migrated, delete `formatDateTimeRu` and `formatDateRu` from `dates.ts`.

### 1e. Verify

```bash
npm run typecheck
grep -rn "formatDate\(Time\)\?Ru\|DAY_LABELS_RU\|[А-Яа-я]" app components --include="*.tsx" --include="*.ts" | grep -v "// "
```
Second command should print nothing user-facing (only comments, if any).

**Commit message:** `i18n: extract remaining RU strings + locale-aware date formatting`

---

## Commit 2 — Mobile nav + Approvals visibility (P0 #2 + #3)

### 2a. Add Approvals to parent nav

`app/(app)/parent/layout.tsx`:
```ts
const nav = [
  { href: "/parent/dashboard", label: t.nav.dashboard },
  { href: "/parent/tasks", label: t.nav.tasks },
  { href: "/parent/approvals", label: t.nav.approvals },  // NEW
  { href: "/parent/rewards", label: t.nav.rewards },
  { href: "/parent/reports", label: t.nav.reports },
  { href: "/parent/settings", label: t.nav.settings },
];
```

Parent nav is now 6 items. `t.nav.approvals` already exists in dict — verified.

### 2b. Fix `MobileNav` to handle 5–6 items

`components/layout/mobile-nav.tsx`:
- Remove `const items = nav.slice(0, 4)`.
- Replace `grid grid-cols-4` with `flex` and `flex-1` on each `<li>` so columns auto-distribute. Smaller text (`text-[10px]` on >=5 items) keeps it from wrapping on 360px screens.

Reference snippet:
```tsx
<ul className={cn("flex gap-1", nav.length >= 5 && "text-[10px]")}>
  {nav.map((n) => (
    <li key={n.href} className="flex-1">
      <Link ... className="flex items-center justify-center py-3 ...">{n.label}</Link>
    </li>
  ))}
</ul>
```

### 2c. (Optional, recommended) Pending-count badge on Approvals

In `app/(app)/parent/layout.tsx`, count pending tasks + rewards once per request and pass to Header/MobileNav via a small wrapper, OR render the count inside the link label like `${t.nav.approvals} · ${count}` when `count > 0`. Skip if it complicates layout; the audit's intent is just to make the page reachable.

### 2d. Verify

Open Chrome DevTools, 375px viewport, confirm all 6 tabs visible and tappable. Tap Approvals → renders page.

**Commit message:** `nav: surface Approvals + show all tabs on mobile`

---

## Commit 3 — Kill `alert()` calls (P0 #1)

Pure mechanical. Mirror the pattern already in `components/child/reward-tile.tsx` (`useState<string | null>` + `<p className="text-xs text-danger-700">`).

### 3a. `components/parent/approval-card.tsx`

Both `TaskApprovalCard` and `RewardApprovalCard`:
- Add `const [error, setError] = useState<string | null>(null);`
- Replace `if (!res.ok) alert(res.error);` with `if (!res.ok) { setError(res.error); return; }`
- Add `{error ? <p className="mt-2 text-xs text-danger-700">{error}</p> : null}` near the buttons.

### 3b. `components/child/task-tile.tsx:30`

Same pattern. Add error state + inline render.

### 3c. `components/parent/delete-task-button.tsx:56`

Same pattern. Read the file first — the surrounding two-step confirm logic exists, just thread the error through it.

### 3d. Verify

```bash
grep -rn "alert(" components --include="*.tsx"
```
Should print nothing.

**Commit message:** `ux: replace window.alert with inline error rendering`

---

## Commit 4 — French child task list (P0 #6)

### 4a. New server action

`app/(app)/child/tasks/actions.ts` — add:
```ts
export async function creditExistingTaskAsChildAction(
  taskDefinitionId: string,
): Promise<{ ok: true; pointsAwarded: number } | { ok: false; error: string }> {
  const t = getT();
  try {
    const s = await assertChild();
    const r = await creditExistingTask(s.familyId, taskDefinitionId, s.childId, s.userId);
    revalidate();
    return { ok: true, pointsAwarded: r.pointsAwarded };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t.errors.unknown };
  }
}
```

(`creditExistingTask` already exists in `lib/services/tasks.ts`; `assertChild` already gives `familyId`, `childId`, `userId`.)

### 4b. Update child tasks page

`app/(app)/child/tasks/page.tsx` — for non-RU, fetch `TaskDefinition`s and render a child-flavored picker. Simplest: reuse `UserTasksPicker` but the child shouldn't see delete/bulk-assign, so build a slimmer variant OR add a `readOnly?: boolean` prop to `UserTasksPicker` that hides the checkboxes/bottom bar.

Recommended: add a `mode: "parent" | "child"` prop to `UserTasksPicker`. In `"child"` mode:
- hide the checkbox column
- hide the sticky bottom bar entirely
- per-row "Done" button is the only action, calls the child action

Acceptance: a French child sees the same card layout as the parent's user-tasks-picker, but each row only has the credit button.

### 4c. Verify

Log in as a child in the French family. Tasks tab shows existing TaskDefinitions grouped by category. Tap "Done" → points awarded, row goes "+N", activity feed updates.

**Commit message:** `child: render existing tasks list for non-RU families`

---

## Commit 5 — Login-screen language picker (P1 #7)

### 5a. Public locale action

New file `app/(public)/actions.ts`:
```ts
"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n";

export async function setPublicLocaleAction(locale: string) {
  if (!isLocale(locale)) return { ok: false as const, error: "invalid" };
  cookies().set({
    name: LOCALE_COOKIE_NAME, value: locale, httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
```

### 5b. Public locale toggle component

New file `components/public/locale-toggle.tsx` — small two-button RU/FR control. Use the segmented styling from `app/(app)/parent/settings/language-picker.tsx`. Calls `setPublicLocaleAction`.

### 5c. Wire to 3 public pages

Add `<LocaleToggle />` to the top-right of the Card on:
- `app/(public)/login/page.tsx`
- `app/(public)/child-login/page.tsx`
- `app/(public)/signup/page.tsx`

Visual: floating top-right of the Card, small (h-8, text-xs).

### 5d. Verify

Open `/login` in incognito → toggle to FR → page re-renders in French.

**Commit message:** `i18n: language picker on login/signup screens`

---

## Commit 6 — Undo toast on "Done" (P1 #8)

The biggest single fix. Half-day-ish. Skip this commit if budget is tight — everything above is more important.

### 6a. Server: uncredit

`lib/services/tasks.ts` — add `uncreditAssignedTask(familyId, assignedTaskId, actorUserId)`:
1. Look up the AssignedTask, verify it belongs to `familyId`.
2. If status is APPROVED, run the inverse of `applyPointsDelta` (subtract `pointsAwarded`).
3. Reset the AssignedTask: set status back to `ASSIGNED`, clear `approvedAt`, `pointsAwarded = 0`. (Or delete entirely if it was created ad-hoc; check the `creditExistingTask` shape.)
4. Reverse the streak update if applicable.
5. Write an activity log entry of type `TASK_UNCREDITED` (new event type — add to ActivityLog enum and `t.activity.TASK_UNCREDITED`).

### 6b. Server actions

In both `app/(app)/child/tasks/actions.ts` and `app/(app)/parent/tasks/actions.ts`, add `uncreditTaskAction(assignedTaskId)` calling the service above.

### 6c. UI: toast

New `components/ui/toast.tsx` — lightweight (no library). Single in-memory queue, exposed via `useToast()` from a context provider. Mount the provider once in `app/(app)/layout.tsx`.

After a successful "Done" tap (in `task-tile.tsx`, `child-today-tasks.tsx`, `user-tasks-picker.tsx`, `preset-picker.tsx`), call:
```ts
toast({
  message: `+${pointsAwarded} ${t.app.pointsShort}`,
  action: { label: t.app.undo, run: () => uncreditTaskAction(assignedTaskId) },
  duration: 5000,
});
```

Auto-dismiss at 5s. If Undo tapped: optimistic UI revert, call action, refresh.

### 6d. Verify

Mark a task done → toast appears with Undo. Tap Undo within 5s → points roll back, task is ASSIGNED again. Wait >5s → toast fades, action permanent.

**Commit message:** `tasks: undo toast after completion (5s window)`

---

## Commit 7 — Quick wins bundle (P1 #9, #11, #15, #16)

Small, isolated fixes — batched because each is <30 lines.

### 7a. Adjustment quick-link (P1 #9)

- `app/(app)/parent/settings/page.tsx` — add `id="adjustment"` to the adjustment `<Card>`.
- `components/parent/quick-actions.tsx:26` — change href to `/parent/settings#adjustment`.

### 7b. Role pill in picker (P1 #11)

`app/(public)/login/login-form.tsx` — under the `{p.name}` line in the picker grid, add a colored pill:
```tsx
<span className={cn(
  "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
  p.role === "PARENT" ? "bg-brand-100 text-brand-800" : "bg-success-50 text-success-700"
)}>
  {p.role === "PARENT" ? t.login.roleParent : t.login.roleChild}
</span>
```

### 7c. Streak tooltip (P1 #15)

Add a new dict key `t.childDashboard.streakHelp` = "Завершите хотя бы одно задание каждый день, чтобы поддерживать серию." / FR equivalent.

In `components/child/points-hero.tsx` and `components/parent/child-summary-card.tsx`, wrap the "🔥 N days" span in a `<button title={t.childDashboard.streakHelp} ...>` with a tiny `(i)` glyph after the number. Or use the native HTML `title` attribute — simplest, works on hover.

### 7d. Credit button icon (P1 #16)

In `components/parent/preset-picker.tsx`, `components/parent/user-tasks-picker.tsx`, and `components/parent/child-today-tasks.tsx`:
- Prefix the button label with a checkmark: `✓ ${t.tasks.presetsCreditNow}` (or use lucide-react `Check` icon if already imported elsewhere — check first).

**Commit message:** `polish: streak tooltip, role pill, credit-icon, adjustment link`

---

## Commit 8 — PIN 6-box input (P1 #10)

Optional within the P1 batch. Cosmetic; skip if running short on time.

`app/(public)/login/login-form.tsx` — replace the single `<Input>` PIN field with 6 individual `<input>` elements in a horizontal row. Each accepts one digit, focus auto-advances. Backspace moves to previous.

Keep `autoComplete="one-time-code"` on the first input. Track value in a single `string` state; render dot-style boxes.

Reference pattern (sketch):
```tsx
const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
// onChange of each: clamp to single digit, advance focus
// onKeyDown Backspace: if empty, go back
// joined pin = digits.join("")
```

**Commit message:** `ui: PIN entry as 6-segment input`

---

## Commit 9 — Activity feed reflow + filter (P1 #12, #13)

### 9a. Reflow rows

`app/(app)/parent/dashboard/page.tsx` and `app/(app)/child/dashboard/page.tsx`. Change the activity row JSX from one cramped line to:
- Line 1: title + reference label (bold)
- Line 2 (muted, text-xs): `{child?.displayName ? `${child.displayName} · ` : ""}{date}{delta ? ` · ${signedPoints}` : ""}`

### 9b. Filter tabs

Extract recent activity to a client component `components/shared/recent-activity.tsx` that takes the full list and exposes filter pills ("All / Tasks / Rewards / Adjustments"). Filter client-side by `eventType` prefix.

**Commit message:** `dashboards: cleaner activity rows + type filter`

---

## Defer (will not ship in this batch)

- **P1 #14 (first-run onboarding)** — half-day to a full day on its own; better as its own spec. The other fixes don't depend on it.

---

## Final QA checklist before push

After all commits:

```bash
npm run typecheck
npm run lint   # if configured
npm run build  # catches "use server" + RSC issues that typecheck misses
```

Manual smoke (local, both families):
- [ ] Russian family: dashboard loads, all dates show Russian month abbreviations, preset picker still works.
- [ ] French family: dashboard fully in French, no Cyrillic anywhere on the page (DevTools find: `[А-Яа-я]`).
- [ ] French child: tasks tab shows the list.
- [ ] Mobile viewport (375px): all 6 parent tabs visible, Approvals tappable, Settings reachable.
- [ ] Login: locale toggle present, switching works without auth.
- [ ] Mark a task Done → see "+N" toast with Undo (if Commit 6 shipped).
- [ ] Reject a task (Approvals page) → inline error if invalid, no `alert()`.

Then `git push` and watch Vercel.

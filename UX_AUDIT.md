# Chores app — UX/UI audit

Scope: every page + reusable component under `app/` and `components/`. Looked at parent flows, child flows, login/signup, and shared chrome. Findings are grouped by severity. Each one points to the file(s) involved so it's trivial to act on.

---

## P0 — bugs that ship today

These break or degrade the experience for real users right now.

**1. `alert()` / `window.alert()` is used in 4 places.** Your own memory says don't do this — Chrome desktop suppresses these in some tabs, and they're ugly. Findings:

- `components/parent/approval-card.tsx:51` and `:126`
- `components/child/task-tile.tsx:30`
- `components/parent/delete-task-button.tsx:56`

Replace with the inline-error pattern you already use in `reward-tile.tsx` / `user-tasks-picker.tsx` (`setError(res.error)` + a small red line under the row).

**2. Settings is unreachable on mobile.** Parent nav has 5 entries; `MobileNav` does `nav.slice(0, 4)` so `/parent/settings` is invisible on phones. That's where the PIN form, language picker, adjustments, and child/parent management live. Either show 5 tabs on mobile, add an overflow menu, or surface a settings gear in the header.

**3. Approvals page has no nav entry.** It's not in either parent or child nav arrays — only reachable by direct URL. Since the pivot moved you to auto-approve + auto-fulfill, this might be intentional, but legacy `PENDING_APPROVAL` rows then become invisible to the parent. Decide: either retire the page, or add a numbered badge ("Approvals · 2") that only appears when `tasks.length + rewards.length > 0`.

**4. Hardcoded Russian leaks into the French UI.** Real strings that French families will see in RU:

- `app/(public)/login/page.tsx:58-59` — "Войдите по email и задайте PIN…"
- `app/(public)/child-login/page.tsx:40` — "Родитель сначала должен создать профиль ребёнка."
- `app/(public)/child-login/child-login-form.tsx:51` — `Label = "Имя"`
- `app/(app)/parent/rewards/page.tsx:44` — `до ${date}`
- `app/(app)/parent/settings/add-parent-form.tsx:38` — `Label = "Имя"`
- `app/(app)/parent/settings/add-child-form.tsx:42, :53` — "Имя", "Отображаемое имя"
- `components/child/level-progress.tsx:19` — "Макс. уровень"
- `DAY_LABELS_RU` in `parent/dashboard/page.tsx`, `parent/reports/page.tsx`, `parent/children/[id]/page.tsx`

Move every one of these into `Dict`. Day labels should live in `t.app.weekdaysShort` keyed off `useLocale()`.

**5. Dates are formatted Russian-style for everyone.** `formatDateTimeRu` / `formatDateRu` are called from at least 8 components (dashboards, approval cards, history, rewards list, etc.). French families see Russian date conventions. Replace with a locale-aware `formatDateTime(date, locale)` that delegates to `Intl.DateTimeFormat(locale)`.

**6. Child has no task list in non-Russian families.** `app/(app)/child/tasks/page.tsx` shows only an `EmptyState` for non-RU. The parent got the new `UserTasksPicker` with per-row "Done" and bulk-add; the kid sees nothing. Either render the same `UserTasksPicker` (read-only delete, completion enabled) or, simpler, show the family's `TaskDefinition` list as tiles so the child can mark them done.

---

## P1 — high impact, low cost

**7. No language picker on the login screen.** New families land on `/login` and `/signup` with no way to pick a locale until they're authenticated. Add a tiny language dropdown (top-right corner of the login card) writing to `fcr_locale` cookie. Today French users see a Russian-flavored landing.

**8. "Done" is irreversible from the child's view.** Tapping the green Done button credits points permanently. An accidental tap can't be undone without a parent visiting approvals (which doesn't exist in nav, see #3). Add a 5-second "Undo" toast after completion — same shape as Gmail's send-undo. Cheap to build with `setTimeout` + a server "uncomplete" action.

**9. Quick Actions → "Add bonus" routes to `/parent/settings` (the whole settings page).** That's a lot of scrolling to reach the adjustment form. Either jump directly to `#adjustment` anchor or put the AdjustmentForm in a dialog.

**10. PIN entry is a single wide input.** Works, but a 6-box grouped input (like SMS verification) gives clearer feedback as digits land, and signals visually that this is a code, not a password. Especially useful for kids who can't read yet.

**11. Profile picker doesn't distinguish kids from parents at a glance.** Color (brand vs. success) is the only signal, and color-blind users will miss it. Add a small icon overlay (adult silhouette / child silhouette) or a "Parent" / "Kid" pill under the name — you already render the role label, but it's the same text size as the name and gets visually lost.

**12. Activity feed rows are crammed.** On the parent dashboard, each row tries to fit `eventType · referenceLabel · childName | timestamp · ±N pts` on one line. Long task titles wrap weirdly between segments. Reflow as two-line: title row, then a muted secondary row with `child · date · delta`.

**13. Recent activity has no filtering.** A family with daily activity will have hundreds of rows after a month. Even a simple "Tasks / Rewards / Adjustments" tab strip would help. The data is already typed (`r.eventType`), so client-side filtering is trivial.

**14. No empty-state nudge after first signup.** A French family logs in to a dashboard with zero kids, zero tasks, zero rewards — three empty cards. There's no "Get started: add your first child" hero. Build a guided first-run that walks: add child → set PIN → create one task → create one reward. This is the moment new families decide whether the app is worth using.

**15. Streak fire emoji has no explanation.** "🔥 5 days" — but what counts as a streak day? Children won't know. Tooltip or info icon explaining the rule ("Complete at least one task per day").

**16. "Quick credit" button label is unclear.** `t.tasks.presetsCreditNow` becomes "Готово" / something in French — but on the task tile it sits next to "+N points" with no visual hint that pressing it = "I did this, give me points". Consider an icon (✓ Done) instead of text-only, especially because the same color (green) appears elsewhere with different meaning (approve in approvals page).

---

## P2 — polish & medium-term

**17. Delete-confirm is too generic.** Two-step confirm in `user-tasks-picker.tsx` shows "Confirm: Delete" — doesn't mention what's being deleted or how many. Change to "Delete N tasks?" with the count rendered. Same applies to `reward-tile.tsx` confirm.

**18. Task form's Cancel does `router.back()`.** Fragile — if the user landed via a deep link, this goes nowhere useful. Hard-code `router.push("/parent/tasks")`.

**19. Points field accepts 0 silently.** Saving a task with `0pts` is allowed without warning; the kid sees a no-reward task. Add a soft warning ("0 points means no reward — sure?") when the value is 0 but allow proceed.

**20. No keyboard focus on task/reward form fields.** Login PIN has `autoFocus` (great). The task and reward forms don't. Add `autoFocus` to title.

**21. Long lists have no search.** Tasks list, rewards list, history — once a family is 3 months in, scrolling is the only way to find anything. Add a search input above each list.

**22. Bottom nav is fixed but main content has `pb-24` only on mobile.** Looks fine on small phones; on tablets in portrait, the nav is fixed but spacing is tight. Make sure CSS safe-area-inset-bottom is respected (`pb-[max(env(safe-area-inset-bottom),6rem)]`).

**23. Header doesn't show who's logged in.** Just the app name + logout. Add the picked profile's name (or initials avatar) near logout — useful when the family shares the iPad.

**24. PointsHero is the same blue gradient for every kid.** With one kid that's fine; with multiple kids it'd be nice for each to have a color or accent so they recognize "their" view at a glance.

**25. Reward "Claim" → confirm Yes/No has no explanation.** "Are you sure?" is implicit. Show "Spend N points on '<reward title>'?" — kids will appreciate the explicit math.

**26. Reaction bar has no aria-label per emoji.** Screen readers announce `<button>👍 3</button>` with no semantic meaning. Add `aria-label={t.reactions.thumbsUp}` etc.

**27. `recurrenceWeekdays` toggles are 10×12 unlabeled boxes.** Works once you know what they mean. Tooltip on first hover or a small "Mon Tue Wed…" caption above clarifies.

**28. No skeleton loading.** Server components render full HTML, but `router.refresh()` after actions causes a flash. A subtle skeleton on cards during transitions would feel more polished.

---

## P3 — strategic / next quarter

**29. The preset catalog is Russian-only.** Non-Russian families have an empty "Tasks" tab. A localized preset catalog ("Brush teeth · Make bed · Tidy room · Homework done · Walked the dog") would dramatically improve first-run for French (and future) families. Today the user is expected to write 20+ task definitions from scratch.

**30. No notification surface.** Family members don't know when the other side did something — kid completes a task, parent has no idea unless they refresh. Push notifications are heavy; even an in-app "1 new event" pill on the dashboard tab would help.

**31. No celebration moments.** A reward-based app needs micro-celebrations: confetti on level-up, sparkle on streak milestone, sound effect on "Done". The current UI is correct but emotionally flat for kids.

**32. No "household" calendar view.** Parents juggling weekly recurring tasks can't see the week at a glance. A simple 7-day grid (rows = kids, cols = days, cells = task counts) would unlock real planning.

**33. Mobile-first but no PWA install hint.** This app is begging to live on the home screen. Add a manifest + "Add to Home Screen" prompt on first parent login.

---

## Recommended order of operations

If I were prioritizing for a 1-week sprint:

1. Fix the 4 `alert()` calls (P0 #1) — 30 min.
2. Make Settings reachable on mobile (P0 #2) — 1 hour.
3. Move the 9 hardcoded Russian strings into `Dict` (P0 #4) — 2 hours.
4. Locale-aware date formatting (P0 #5) — 2 hours.
5. Build the child-side task list for non-RU (P0 #6) — half day. Reuses `UserTasksPicker` shape.
6. Login-screen language picker (P1 #7) — 1 hour.
7. Undo toast on "Done" (P1 #8) — half day, includes server-side `uncomplete` action.

That clears every P0 and the most painful P1s before touching anything strategic.

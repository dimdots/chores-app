-- AlterTable: add monotonic lifetime-earned counter to ChildProfile.
-- Used to drive level progress so claiming a reward doesn't drop level.
ALTER TABLE "ChildProfile"
  ADD COLUMN "lifetimePoints" INTEGER NOT NULL DEFAULT 0;

-- Backfill: lifetime = sum of all positive point deltas ever credited,
-- which is every approved task award + every positive manual adjustment.
-- Negative deltas (rewards claimed, penalties) are deliberately excluded
-- so existing profiles don't under-report.
UPDATE "ChildProfile" cp
SET "lifetimePoints" = COALESCE(x.total, 0)
FROM (
  SELECT "childId", SUM("pointsAwarded")::int AS total
  FROM "AssignedTask"
  WHERE "status" = 'APPROVED' AND "childId" IS NOT NULL
  GROUP BY "childId"
) x
WHERE cp.id = x."childId";

-- Fold in positive manual adjustments on top of task awards.
UPDATE "ChildProfile" cp
SET "lifetimePoints" = cp."lifetimePoints" + COALESCE(y.total, 0)
FROM (
  SELECT "childId", SUM("value")::int AS total
  FROM "PointAdjustment"
  WHERE "value" > 0
  GROUP BY "childId"
) y
WHERE cp.id = y."childId";

-- Recompute currentLevel from the fresh lifetimePoints so any existing
-- profile whose currentLevel was derived from the spendable balance gets
-- bumped back up to the level they actually earned. Thresholds mirror
-- config/levels.ts — keep these in sync if you edit the curve.
UPDATE "ChildProfile"
SET "currentLevel" = CASE
  WHEN "lifetimePoints" >= 4000 THEN 10
  WHEN "lifetimePoints" >= 3000 THEN 9
  WHEN "lifetimePoints" >= 2300 THEN 8
  WHEN "lifetimePoints" >= 1700 THEN 7
  WHEN "lifetimePoints" >= 1200 THEN 6
  WHEN "lifetimePoints" >= 800  THEN 5
  WHEN "lifetimePoints" >= 500  THEN 4
  WHEN "lifetimePoints" >= 250  THEN 3
  WHEN "lifetimePoints" >= 100  THEN 2
  ELSE 1
END;

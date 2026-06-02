-- Multi-tenant pivot: introduces the Family table and adds familyId scoping
-- to User, TaskCategory, TaskDefinition, Reward, ActivityLog, and InviteToken.
--
-- Strategy:
--   1. CREATE Family.
--   2. Add familyId columns as NULLABLE so existing rows keep validating.
--   3. Seed a "Dima" family row with a stable id and backfill every existing
--      row to point at it.
--   4. Flip the NOT NULL constraints on the tables that always require a
--      family (everything except InviteToken — FAMILY_SIGNUP tokens predate
--      the family they create).
--   5. Swap TaskCategory's global-unique name for (familyId, name).
--   6. Wire foreign keys + indexes.
--
-- Wrapped in a transaction so a half-applied state is impossible if any
-- step fails on production.
BEGIN;

-- 1. Family table.
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ru',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- 2. Add nullable familyId columns.
ALTER TABLE "User"           ADD COLUMN "familyId" TEXT;
ALTER TABLE "TaskCategory"   ADD COLUMN "familyId" TEXT;
ALTER TABLE "TaskDefinition" ADD COLUMN "familyId" TEXT;
ALTER TABLE "Reward"         ADD COLUMN "familyId" TEXT;
ALTER TABLE "ActivityLog"    ADD COLUMN "familyId" TEXT;
ALTER TABLE "InviteToken"    ADD COLUMN "familyId" TEXT;

-- 3. Seed the legacy family + backfill all existing rows.
--    The id is fixed so re-running the migration on a wiped DB stays
--    deterministic, and so scripts that need to reference "the original
--    family" can hard-code it.
INSERT INTO "Family" ("id", "name", "locale", "createdAt", "updatedAt")
VALUES ('family_dima_legacy', 'Dima', 'ru', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "User"           SET "familyId" = 'family_dima_legacy' WHERE "familyId" IS NULL;
UPDATE "TaskCategory"   SET "familyId" = 'family_dima_legacy' WHERE "familyId" IS NULL;
UPDATE "TaskDefinition" SET "familyId" = 'family_dima_legacy' WHERE "familyId" IS NULL;
UPDATE "Reward"         SET "familyId" = 'family_dima_legacy' WHERE "familyId" IS NULL;
UPDATE "ActivityLog"    SET "familyId" = 'family_dima_legacy' WHERE "familyId" IS NULL;
-- InviteToken intentionally left null — open FAMILY_SIGNUP tokens have no
-- family yet, and there are no pre-existing PARENT_INVITE-style tokens.

-- 4. Flip NOT NULL on the always-scoped tables.
ALTER TABLE "User"           ALTER COLUMN "familyId" SET NOT NULL;
ALTER TABLE "TaskCategory"   ALTER COLUMN "familyId" SET NOT NULL;
ALTER TABLE "TaskDefinition" ALTER COLUMN "familyId" SET NOT NULL;
ALTER TABLE "Reward"         ALTER COLUMN "familyId" SET NOT NULL;
ALTER TABLE "ActivityLog"    ALTER COLUMN "familyId" SET NOT NULL;

-- 5. TaskCategory: drop the global-unique name, replace with (familyId, name).
DROP INDEX "TaskCategory_name_key";
CREATE UNIQUE INDEX "TaskCategory_familyId_name_key" ON "TaskCategory"("familyId", "name");

-- 6. Foreign keys.
ALTER TABLE "User"
    ADD CONSTRAINT "User_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "Family"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskCategory"
    ADD CONSTRAINT "TaskCategory_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "Family"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskDefinition"
    ADD CONSTRAINT "TaskDefinition_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "Family"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Reward"
    ADD CONSTRAINT "Reward_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "Family"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityLog"
    ADD CONSTRAINT "ActivityLog_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "Family"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InviteToken"
    ADD CONSTRAINT "InviteToken_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "Family"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Indexes that match the new schema's @@index decorators.
--    Drop the now-redundant single-column indexes that were superseded by
--    family-scoped composites.
DROP INDEX "TaskCategory_isActive_sortOrder_idx";
DROP INDEX "TaskDefinition_isActive_idx";
DROP INDEX "Reward_isActive_idx";

CREATE INDEX "User_familyId_role_isActive_idx" ON "User"("familyId", "role", "isActive");
CREATE INDEX "TaskCategory_familyId_isActive_sortOrder_idx" ON "TaskCategory"("familyId", "isActive", "sortOrder");
CREATE INDEX "TaskDefinition_familyId_isActive_idx" ON "TaskDefinition"("familyId", "isActive");
CREATE INDEX "Reward_familyId_isActive_idx" ON "Reward"("familyId", "isActive");
CREATE INDEX "ActivityLog_familyId_createdAt_idx" ON "ActivityLog"("familyId", "createdAt");
CREATE INDEX "InviteToken_familyId_idx" ON "InviteToken"("familyId");

COMMIT;

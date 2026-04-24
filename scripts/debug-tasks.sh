#!/usr/bin/env bash
# Debug helper: shows task definitions, assignments, and current server time.
# Run from the project root:
#   bash scripts/debug-tasks.sh

set -euo pipefail

DB_URL="postgresql://dima@localhost:5432/chores"

echo "--- Is Postgres up? ---"
if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  echo "Postgres is running."
else
  echo "Postgres is NOT reachable on localhost:5432. Start it and rerun."
  exit 1
fi
echo

echo "--- Task definitions (how many assignments each one has) ---"
psql "$DB_URL" -c '
SELECT td.title,
       td."recurrenceType",
       td."isActive",
       COUNT(at.id) AS assigned_rows
FROM "TaskDefinition" td
LEFT JOIN "AssignedTask" at ON at."taskDefinitionId" = td.id
GROUP BY td.id
ORDER BY td."createdAt" DESC;'
echo

echo "--- Assigned tasks (what the kid actually sees) ---"
psql "$DB_URL" -c '
SELECT td.title,
       at.status,
       at."scheduledDate"::date AS scheduled_date,
       cp."displayName" AS child
FROM "AssignedTask" at
JOIN "TaskDefinition" td ON td.id = at."taskDefinitionId"
JOIN "ChildProfile" cp ON cp.id = at."childId"
ORDER BY at."createdAt" DESC;'
echo

echo "--- Server time vs local-day boundary ---"
psql "$DB_URL" -c "
SELECT now()                                         AS server_now,
       (now() AT TIME ZONE 'Europe/Moscow')::date   AS today_moscow;"

// Vitest setup file.
//
// For unit tests we rely on pure functions (no DB). For integration tests
// we assume DATABASE_URL points at a disposable database and the schema
// has been migrated: `pnpm prisma migrate deploy`.
//
// We DO NOT reset the DB automatically here — each integration test is
// responsible for creating its own fixtures inside a transaction that is
// rolled back, or inside a uniquely-scoped user/child so tests cannot
// interfere with each other.

process.env.AUTH_SECRET ??= "test-secret-please-do-not-use-outside-tests-32chars";
process.env.BOOTSTRAP_TOKEN ??= "test-bootstrap-token";
process.env.APP_TIMEZONE ??= "Europe/Moscow";
process.env.PARENT_SESSION_DAYS ??= "7";
process.env.CHILD_SESSION_DAYS ??= "30";

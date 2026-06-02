/**
 * Generate a single-use invite link for a new family to sign up.
 *
 * Usage:
 *   tsx scripts/create-family-invite.ts
 *   tsx scripts/create-family-invite.ts --base-url https://chores-app-ochre.vercel.app
 *
 * Prints a URL like:
 *   https://chores-app-ochre.vercel.app/signup?token=XXXXXX
 *
 * Send the URL to the recipient. They redeem it by visiting the link and
 * filling in family name + their parent account (name, email, password).
 * The token is single-use and expires in 7 days.
 *
 * Storage: only the SHA-256 hash of the token is persisted (see
 * lib/services/family-signup.ts). If the printed URL is lost it can't be
 * recovered — just generate another one.
 */

import { createFamilySignupInvite } from "../lib/services/family-signup";

function parseArgs() {
  const out: { baseUrl?: string } = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base-url") out.baseUrl = argv[++i];
  }
  return out;
}

async function main() {
  const { baseUrl } = parseArgs();
  const inferred =
    baseUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const { token, expiresAt } = await createFamilySignupInvite();
  const url = `${inferred.replace(/\/$/, "")}/signup?token=${token}`;

  console.log("\n✓ Invite created.");
  console.log("  URL:    ", url);
  console.log("  Expires:", expiresAt.toISOString());
  console.log(
    "\n  Send this URL to the recipient. It's single-use and can't be regenerated\n  — if lost, run the script again to create a fresh one.\n",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    // The Prisma client in the service module manages its own connection
    // pool; node will exit on its own once the promise resolves.
  });

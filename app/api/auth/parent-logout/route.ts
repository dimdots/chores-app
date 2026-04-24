import { NextResponse } from "next/server";
import { logoutParent } from "@/lib/auth/parent-auth";

export async function POST() {
  await logoutParent();
  return NextResponse.json({ ok: true });
}

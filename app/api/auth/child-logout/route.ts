import { NextResponse } from "next/server";
import { logoutChild } from "@/lib/auth/child-pin-auth";

export async function POST() {
  await logoutChild();
  return NextResponse.json({ ok: true });
}

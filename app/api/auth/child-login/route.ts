import { NextResponse } from "next/server";
import { loginChild } from "@/lib/auth/child-pin-auth";
import { LoginError } from "@/lib/auth/parent-auth";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  try {
    const res = await loginChild(body);
    return NextResponse.json({ ok: true, childId: res.childId, name: res.name });
  } catch (err) {
    if (err instanceof LoginError) {
      return NextResponse.json(
        { error: err.code.toLowerCase() },
        { status: err.code === "BLOCKED" ? 429 : 401 },
      );
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

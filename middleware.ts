import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = [
  "/login",
  "/parent-login",
  "/child-login",
  "/setup",
  "/api/auth",
  "/api/health",
  "/favicon.ico",
];

const SESSION_COOKIE = "fcr_session";

function isPublic(pathname: string): boolean {
  if (pathname === "/") return false;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/static/")) return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

async function verifyToken(
  token: string,
  secret: string,
): Promise<{ role: "PARENT" | "CHILD"; userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (
      (payload.role === "PARENT" || payload.role === "CHILD") &&
      typeof payload.userId === "string"
    ) {
      return { role: payload.role, userId: payload.userId };
    }
    return null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    // Fail closed.
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyToken(token, secret) : null;

  if (pathname === "/") {
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
    return NextResponse.redirect(
      new URL(session.role === "PARENT" ? "/parent/dashboard" : "/child/dashboard", req.url),
    );
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/parent") && session.role !== "PARENT") {
    return NextResponse.redirect(new URL("/child/dashboard", req.url));
  }
  if (pathname.startsWith("/child") && session.role !== "CHILD") {
    return NextResponse.redirect(new URL("/parent/dashboard", req.url));
  }

  return NextResponse.next();
}

// Match everything except public static assets and the auth endpoints
// (auth endpoints handle their own verification because they issue cookies).
export const config = {
  matcher: ["/((?!_next/static|_next/image|public/|assets/|.*\\..*).*)"],
};

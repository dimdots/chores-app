import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { startOfLocalDay } from "@/lib/utils/dates";
import { t } from "@/lib/i18n/ru";

export async function requireParentForExport() {
  const s = await getSession();
  if (!s) {
    return NextResponse.json({ error: t.errors.notAuthenticated }, { status: 401 });
  }
  if (s.role !== "PARENT") {
    return NextResponse.json({ error: t.errors.notAuthorized }, { status: 403 });
  }
  return null;
}

export function parseExportFilter(req: NextRequest) {
  const url = req.nextUrl;
  const childId = url.searchParams.get("childId")?.trim() || undefined;
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const from = fromStr ? safeDate(fromStr) : undefined;
  const to = toStr ? safeDate(toStr) : undefined;
  return { childId, from, to };
}

function safeDate(s: string): Date | undefined {
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  return startOfLocalDay(d);
}

export function csvResponse(body: string, filename: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

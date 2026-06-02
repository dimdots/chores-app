import { NextRequest } from "next/server";
import {
  csvResponse,
  parseExportFilter,
  requireParentSessionForExport,
} from "../_shared";
import { exportCsvPoints } from "@/lib/services/reports";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireParentSessionForExport();
  if (auth.response) return auth.response;
  const filter = parseExportFilter(req);
  const csv = await exportCsvPoints({ ...filter, familyId: auth.session.familyId });
  return csvResponse(csv, `points-${today()}.csv`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

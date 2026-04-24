import { NextRequest } from "next/server";
import {
  csvResponse,
  parseExportFilter,
  requireParentForExport,
} from "../_shared";
import { exportCsvTasks } from "@/lib/services/reports";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = await requireParentForExport();
  if (unauthorized) return unauthorized;
  const filter = parseExportFilter(req);
  const csv = await exportCsvTasks(filter);
  return csvResponse(csv, `tasks-${today()}.csv`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

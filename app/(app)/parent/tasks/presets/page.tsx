import { redirect } from "next/navigation";

// The preset picker has been promoted to the main /parent/tasks page (see
// pivot 2026-05-02 — Tasks tab now IS the preset picker). This route stays
// as a permanent redirect so any old links keep working.
export default function ParentTasksPresetsRedirect() {
  redirect("/parent/tasks");
}

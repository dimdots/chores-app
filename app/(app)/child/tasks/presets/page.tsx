import { redirect } from "next/navigation";

// Preset picker is now the main /child/tasks page (pivot 2026-05-02). This
// stub keeps any old links working with a permanent redirect.
export default function ChildTasksPresetsRedirect() {
  redirect("/child/tasks");
}

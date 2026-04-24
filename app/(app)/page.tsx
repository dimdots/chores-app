import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function AppIndex() {
  const s = await getSession();
  redirect(s?.role === "CHILD" ? "/child/dashboard" : "/parent/dashboard");
}

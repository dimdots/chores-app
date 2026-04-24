import { requireSession } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <>{children}</>;
}

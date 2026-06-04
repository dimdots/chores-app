import { requireSession } from "@/lib/auth/permissions";
import { ToastProvider } from "@/components/ui/toast";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <ToastProvider>{children}</ToastProvider>;
}

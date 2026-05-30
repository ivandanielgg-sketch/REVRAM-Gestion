import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { canAccessAdmin } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessAdmin(session.role)) redirect("/dashboard");

  return (
    <AppShell
      user={{
        username: session.username,
        name: session.name,
        role: session.role,
        companyName: session.companyName,
      }}
    >
      {children}
    </AppShell>
  );
}

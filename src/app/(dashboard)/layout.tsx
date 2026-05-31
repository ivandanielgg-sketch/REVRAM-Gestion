import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.mustChangePassword) redirect("/change-password");

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

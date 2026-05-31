import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.mustChangePassword) redirect("/change-password");

  let logoUrl: string | null = null;
  if (session.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: { logoUrl: true },
    });
    logoUrl = company?.logoUrl ?? null;
  }

  return (
    <AppShell
      user={{
        username: session.username,
        name: session.name,
        role: session.role,
        companyName: session.companyName,
        logoUrl,
      }}
    >
      {children}
    </AppShell>
  );
}

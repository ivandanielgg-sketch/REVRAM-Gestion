"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Flame,
  ClipboardList,
  History,
  AlertTriangle,
  Wrench,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  Shield,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ComplianceBanner } from "@/components/ui/Common";
import { useState } from "react";
import { BRAND_TITLE, ROLE_LABELS } from "@/lib/constants";

export interface AppShellUser {
  username: string;
  name: string;
  role: string;
  companyName?: string | null;
}

const navItems: {
  href: string;
  label: string;
  icon: LucideIcon;
  superAdminOnly?: boolean;
  companyAdminOnly?: boolean;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/companies", label: "Empresas", icon: Building2, superAdminOnly: true },
  { href: "/admin/users", label: "Usuarios", icon: Shield, superAdminOnly: true },
  { href: "/boilers", label: "Mis equipos", icon: Flame },
  { href: "/logs/new", label: "Nueva bitácora", icon: ClipboardList },
  { href: "/logs", label: "Historial", icon: History },
  { href: "/alerts", label: "Alertas", icon: AlertTriangle },
  { href: "/maintenance", label: "Mantenimiento", icon: Wrench },
  { href: "/reports", label: "Reportes", icon: BarChart3 },
  { href: "/users", label: "Usuarios empresa", icon: Users, companyAdminOnly: true },
  { href: "/settings", label: "Configuración", icon: Settings, companyAdminOnly: true },
];

function GlobalHeader({ user, onLogout }: { user: AppShellUser; onLogout: () => void }) {
  return (
    <header className="border-b border-slate-700 bg-slate-900 px-4 py-3 text-white">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-slate-100">{BRAND_TITLE}</p>
          <p className="text-xs text-slate-400">Plataforma industrial de bitácoras</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <span className="inline-flex items-center gap-1">
            <UserCircle className="h-3.5 w-3.5" />
            {user.name || user.username}
          </span>
          {user.companyName && (
            <span className="rounded bg-slate-800 px-2 py-1">{user.companyName}</span>
          )}
          <span className="rounded bg-slate-800 px-2 py-1">
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 hover:bg-slate-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}

function NavContent({
  user,
  pathname,
  filteredNav,
  onNavigate,
}: {
  user: AppShellUser;
  pathname: string;
  filteredNav: typeof navItems;
  onNavigate: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 p-3">
      {filteredNav.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-slate-700 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: AppShellUser;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isCompanyAdmin = user.role === "COMPANY_ADMIN" || isSuperAdmin;

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  const filteredNav = navItems.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.companyAdminOnly && !isCompanyAdmin) return false;
    if (isSuperAdmin && item.href === "/users") return false;
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ComplianceBanner />
      <GlobalHeader user={user} onLogout={logout} />
      <div className="flex flex-1">
        <aside className="hidden w-60 flex-shrink-0 flex-col bg-slate-900 lg:flex">
          <NavContent
            user={user}
            pathname={pathname}
            filteredNav={filteredNav}
            onNavigate={() => setMobileOpen(false)}
          />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 flex h-full w-60 flex-col bg-slate-900 pt-16">
              <div className="absolute right-2 top-2">
                <button onClick={() => setMobileOpen(false)} className="text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavContent
                user={user}
                pathname={pathname}
                filteredNav={filteredNav}
                onNavigate={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        )}

        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <button onClick={() => setMobileOpen(true)} className="text-slate-700">
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-slate-800">Menú</span>
          </div>
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

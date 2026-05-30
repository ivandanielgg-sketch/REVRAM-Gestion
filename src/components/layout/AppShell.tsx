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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ComplianceBanner } from "@/components/ui/Common";
import { useState } from "react";
import { ROLE_LABELS } from "@/lib/constants";

const navItems: {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/boilers", label: "Calderas", icon: Flame },
  { href: "/logs/new", label: "Nueva bitácora", icon: ClipboardList },
  { href: "/logs", label: "Historial", icon: History },
  { href: "/alerts", label: "Alertas", icon: AlertTriangle },
  { href: "/maintenance", label: "Mantenimiento", icon: Wrench },
  { href: "/reports", label: "Reportes", icon: BarChart3 },
  { href: "/users", label: "Usuarios", icon: Users, adminOnly: true },
  { href: "/settings", label: "Configuración", icon: Settings, adminOnly: true },
];

function NavContent({
  user,
  pathname,
  filteredNav,
  onNavigate,
  onLogout,
}: {
  user: { username: string; role: string };
  pathname: string;
  filteredNav: typeof navItems;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="border-b border-slate-700 px-4 py-4">
        <p className="text-sm font-bold text-white">Bitácora de Calderas</p>
        <p className="text-xs text-slate-400">{ROLE_LABELS[user.role] ?? user.role}</p>
      </div>
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
      <div className="border-t border-slate-700 p-3">
        <p className="mb-2 truncate px-3 text-xs text-slate-400">{user.username}</p>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </>
  );
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { username: string; role: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  const filteredNav = navItems.filter(
    (item) => !item.adminOnly || user.role === "ADMINISTRADOR"
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ComplianceBanner />
      <div className="flex flex-1">
        <aside className="hidden w-60 flex-shrink-0 flex-col bg-slate-900 lg:flex">
          <NavContent
            user={user}
            pathname={pathname}
            filteredNav={filteredNav}
            onNavigate={() => setMobileOpen(false)}
            onLogout={logout}
          />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 flex h-full w-60 flex-col bg-slate-900">
              <div className="flex justify-end p-2">
                <button onClick={() => setMobileOpen(false)} className="text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavContent
                user={user}
                pathname={pathname}
                filteredNav={filteredNav}
                onNavigate={() => setMobileOpen(false)}
                onLogout={logout}
              />
            </aside>
          </div>
        )}

        <div className="flex flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <button onClick={() => setMobileOpen(true)} className="text-slate-700">
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-slate-800">Bitácora de Calderas</span>
          </header>
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

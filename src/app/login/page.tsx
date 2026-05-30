"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { BRAND_SUBTITLE, BRAND_TITLE, COMPLIANCE_DISCLAIMER } from "@/lib/constants";

function ResetSuccessMessage() {
  const searchParams = useSearchParams();
  if (searchParams.get("reset") !== "success") return null;
  return (
    <p className="text-sm text-green-400">
      Contraseña actualizada correctamente. Ya puedes iniciar sesión.
    </p>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "same-origin",
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setError(
          "No se pudo conectar con el servidor. Verifique que la aplicación y la base de datos estén en ejecución."
        );
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        return;
      }
      if (data.user.mustChangePassword) {
        router.push("/change-password");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      setError(
        "Error de conexión. Verifique que el servidor esté activo y DATABASE_URL configurada."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-900">
      <div className="border-b border-amber-900/40 bg-amber-950/30 px-4 py-2 text-center text-xs text-amber-100/90">
        {COMPLIANCE_DISCLAIMER}
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 rounded-lg border border-slate-700 bg-slate-800 p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border border-slate-600 bg-slate-900">
              <span className="text-lg font-bold tracking-wider text-slate-100">RV</span>
            </div>
            <h1 className="text-lg font-semibold text-white">{BRAND_SUBTITLE}</h1>
            <p className="mt-2 text-sm text-slate-400">{BRAND_TITLE}</p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-xl">
            <p className="mb-4 text-center text-sm text-slate-300">Inicie sesión para continuar</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-slate-300">
                  Usuario o correo
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="border-slate-600 bg-slate-900 text-white"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-slate-300">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="border-slate-600 bg-slate-900 text-white"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Suspense>
                <ResetSuccessMessage />
              </Suspense>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
            <div className="mt-4 space-y-2 text-center text-sm">
              <p>
                <Link href="/forgot-password" className="text-slate-400 hover:text-white">
                  ¿Olvidaste tu contraseña?
                </Link>
              </p>
              <p>
                <Link
                  href="/register"
                  className="font-medium text-slate-200 hover:text-white"
                >
                  Registrar usuario nuevo
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

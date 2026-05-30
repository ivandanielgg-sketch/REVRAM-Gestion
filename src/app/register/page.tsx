"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { BRAND_SUBTITLE, BRAND_TITLE, COMPLIANCE_DISCLAIMER } from "@/lib/constants";

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: "",
    name: "",
    companyName: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al registrar");
        return;
      }
      setSuccess(data.message);
      setForm({ email: "", name: "", companyName: "", password: "", confirmPassword: "" });
    } catch {
      setError("Error de conexión al registrar la cuenta.");
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
        <div className="w-full max-w-lg">
          <div className="mb-6 text-center">
            <h1 className="text-lg font-semibold text-white">{BRAND_SUBTITLE}</h1>
            <p className="mt-1 text-sm text-slate-400">{BRAND_TITLE}</p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-xl">
            <h2 className="mb-4 text-center text-sm font-medium text-slate-200">
              Registro de usuario nuevo
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-slate-300">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  required
                  className="border-slate-600 bg-slate-900 text-white"
                />
              </div>
              <div>
                <Label htmlFor="name" className="text-slate-300">
                  Nombre completo
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  required
                  className="border-slate-600 bg-slate-900 text-white"
                />
              </div>
              <div>
                <Label htmlFor="companyName" className="text-slate-300">
                  Nombre de empresa
                </Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) => update("companyName", e.target.value)}
                  required
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
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  required
                  minLength={8}
                  className="border-slate-600 bg-slate-900 text-white"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-slate-300">
                  Confirmar contraseña
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  required
                  minLength={8}
                  className="border-slate-600 bg-slate-900 text-white"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              {success && <p className="text-sm text-green-400">{success}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registrando..." : "Crear cuenta"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm">
              <Link href="/login" className="text-slate-400 hover:text-white">
                Volver al inicio de sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

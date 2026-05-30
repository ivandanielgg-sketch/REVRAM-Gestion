"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { COMPLIANCE_DISCLAIMER } from "@/lib/constants";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateClient(): string | null {
    if (!currentPassword.trim()) {
      return "La contraseña actual es requerida";
    }
    if (newPassword.length < 8) {
      return "La nueva contraseña debe tener al menos 8 caracteres";
    }
    if (newPassword !== confirmPassword) {
      return "Las contraseñas nuevas no coinciden";
    }
    if (newPassword === currentPassword) {
      return "La nueva contraseña no puede ser igual a la contraseña actual";
    }
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const clientError = validateClient();
    if (clientError) {
      setError(clientError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("No se pudo cambiar la contraseña. Intente nuevamente.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo cambiar la contraseña");
      }

      setSuccess(data.message || "Contraseña actualizada correctamente");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isFormInvalid =
    !currentPassword.trim() ||
    newPassword.length < 8 ||
    !confirmPassword.trim() ||
    newPassword !== confirmPassword;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
        {COMPLIANCE_DISCLAIMER}
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Cambiar contraseña</h1>
          <p className="mt-1 text-sm text-amber-700">
            Debe cambiar su contraseña temporal antes de continuar.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="current">Contraseña actual</Label>
              <Input
                id="current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="new">Nueva contraseña</Label>
              <Input
                id="new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </div>
            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {success}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isFormInvalid}
            >
              {isSubmitting ? "Cambiando..." : "Cambiar contraseña"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

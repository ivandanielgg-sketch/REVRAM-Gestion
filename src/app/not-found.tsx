import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <h1 className="text-2xl font-bold text-slate-900">Página no encontrada</h1>
      <p className="mt-2 text-sm text-slate-600">El recurso solicitado no existe.</p>
      <Link href="/dashboard" className="mt-4 text-sm text-slate-700 underline hover:text-slate-900">
        Volver al dashboard
      </Link>
    </div>
  );
}

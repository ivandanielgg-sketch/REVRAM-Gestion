import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "normal" | "warning" | "critical";
}) {
  const accents = {
    normal: "border-l-slate-600",
    warning: "border-l-amber-500",
    critical: "border-l-red-500",
  };
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 border-l-4 bg-white p-4 shadow-sm",
        accent ? accents[accent] : accents.normal
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

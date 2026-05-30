import { COMPLIANCE_DISCLAIMER } from "@/lib/constants";

export function ComplianceBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
      {COMPLIANCE_DISCLAIMER}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-slate-500">{message}</p>;
}

import { formatBRL } from "@/lib/budget";
import { categoryBadgeClasses } from "./categories";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/20 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`text-sm font-medium uppercase tracking-wider text-slate-400 ${className}`}
    >
      {children}
    </h2>
  );
}

export function Amount({
  value,
  className = "",
  colored = true,
}: {
  value: number;
  className?: string;
  colored?: boolean;
}) {
  const color = !colored
    ? ""
    : value < 0
      ? "text-rose-400"
      : "text-emerald-400";
  return (
    <span className={`font-mono tabular-nums ${color} ${className}`}>
      {formatBRL(value)}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${categoryBadgeClasses(category)}`}
    >
      {category}
    </span>
  );
}

export function ProgressBar({
  percent,
  colorClass,
  className = "",
}: {
  percent: number; // 0-100+ (será limitado a 100 visualmente)
  colorClass?: string;
  className?: string;
}) {
  const width = Math.max(0, Math.min(100, percent));
  const color =
    colorClass ??
    (percent < 70
      ? "bg-emerald-500"
      : percent <= 90
        ? "bg-amber-500"
        : "bg-rose-500");
  return (
    <div
      className={`h-2.5 w-full overflow-hidden rounded-full bg-slate-800 ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  children,
  icon = "📭",
}: {
  title: string;
  children?: React.ReactNode;
  icon?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-14 text-center">
      <span className="text-4xl" aria-hidden>
        {icon}
      </span>
      <p className="text-lg font-semibold text-slate-200">{title}</p>
      {children && (
        <div className="max-w-md text-sm leading-6 text-slate-400">
          {children}
        </div>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

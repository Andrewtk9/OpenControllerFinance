"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/local/db";

const LINKS = [
  { href: "/", label: "Dashboard", icon: "◧" },
  { href: "/transacoes", label: "Transações", icon: "⇄" },
  { href: "/faturas", label: "Faturas", icon: "▤" },
  { href: "/analise", label: "Análise", icon: "◔" },
  { href: "/aprenda", label: "Aprenda", icon: "✦" },
  { href: "/config", label: "Configurações", icon: "⚙" },
];

const PLAN_LABELS: Record<string, string> = {
  free: "Grátis",
  pro: "Pro",
  business: "Empresa",
};

export function Nav() {
  const pathname = usePathname();

  const unreadCount =
    useLiveQuery(
      () => db.notifications.filter((n) => !n.read).count(),
      [],
      0,
    ) ?? 0;

  const plan =
    useLiveQuery(
      async () => (await db.settings.get(1))?.plan ?? "free",
      [],
      "free" as const,
    ) ?? "free";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-4">
        <Link
          href="/"
          className="mr-2 flex items-center gap-2 text-base font-bold tracking-tight text-slate-50 sm:mr-4"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-sm text-emerald-400">
            ₪
          </span>
          <span className="hidden sm:inline">
            OpenController<span className="text-emerald-400">Finance</span>
          </span>
          <span className="sm:hidden">
            OC<span className="text-emerald-400">F</span>
          </span>
        </Link>

        <span
          title="Seu plano"
          className={`mr-1 hidden whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold md:inline-block ${
            plan === "free"
              ? "border-slate-700 text-slate-400"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          }`}
        >
          {PLAN_LABELS[plan] ?? plan}
        </span>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <span aria-hidden className="text-xs opacity-70">
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/notificacoes"
          title="Notificações"
          className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
            pathname.startsWith("/notificacoes")
              ? "bg-slate-800 text-slate-50"
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          }`}
        >
          <span aria-hidden>🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}

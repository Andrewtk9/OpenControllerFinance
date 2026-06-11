"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard", icon: "◧" },
  { href: "/transacoes", label: "Transações", icon: "⇄" },
  { href: "/faturas", label: "Faturas", icon: "▤" },
  { href: "/analise", label: "Análise", icon: "◔" },
  { href: "/config", label: "Configurações", icon: "⚙" },
];

export function Nav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

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

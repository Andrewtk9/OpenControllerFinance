"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/local/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/components/format";

const TYPE_ICONS: Record<string, string> = {
  budget_alert: "⚠️",
  budget_exceeded: "🚨",
  bill_due: "💳",
};

async function markRead(id: number) {
  await db.notifications.update(id, { read: true });
}

async function markAllRead() {
  await db.notifications.filter((n) => !n.read).modify({ read: true });
}

export default function NotificacoesPage() {
  const notifications = useLiveQuery(
    () => db.notifications.orderBy("createdAt").reverse().toArray(),
    []
  );

  if (!notifications) return null;

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Notificações"
        subtitle={
          unread > 0
            ? `${unread} não ${unread === 1 ? "lida" : "lidas"}`
            : "Tudo em dia"
        }
      >
        {unread > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
          >
            Marcar todas como lidas
          </button>
        )}
      </PageHeader>

      {notifications.length === 0 ? (
        <EmptyState title="Nenhuma notificação" icon="🔔">
          Quando o orçamento estiver perto do limite ou uma fatura estiver
          próxima do vencimento, você verá os alertas aqui.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-4 rounded-2xl border p-4 transition-colors ${
                n.read
                  ? "border-slate-800 bg-slate-900/40 opacity-70"
                  : "border-amber-500/30 bg-amber-500/5"
              }`}
            >
              <span className="mt-0.5 text-xl" aria-hidden>
                {TYPE_ICONS[n.type] ?? "🔔"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-100">{n.title}</p>
                  {!n.read && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                      nova
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {n.body}
                </p>
                <p className="mt-1.5 text-xs text-slate-500">
                  {formatDateTime(new Date(n.createdAt))}
                </p>
              </div>
              {!n.read && (
                <button
                  type="button"
                  onClick={() => void markRead(n.id!)}
                  title="Marcar como lida"
                  className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800"
                >
                  lida ✓
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

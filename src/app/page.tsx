"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS, type Settings } from "@/lib/local/db";
import {
  formatBRL,
  getMonthlySummary,
  monthRange,
} from "@/lib/local/budget";
import { runSync, MissingPluggyCredentialsError } from "@/lib/local/sync";
import {
  Amount,
  Card,
  CardTitle,
  CategoryBadge,
  EmptyState,
  PageHeader,
  ProgressBar,
} from "@/components/ui";
import { categoryBarClass } from "@/components/categories";
import { formatDate, formatDateTime, monthLabel } from "@/components/format";

const MODE_LABELS: Record<string, string> = {
  goal: "Meta definida",
  avg_income: "Média dos últimos ganhos",
  fixed_income: "% da renda informada",
};

const AUTO_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 horas

function hasPluggyCredentials(s: Settings | undefined | null) {
  return Boolean(
    s?.pluggyClientId?.trim() &&
      s?.pluggyClientSecret?.trim() &&
      s?.pluggyItemIds?.trim(),
  );
}

type SyncState = "idle" | "running" | "ok" | "error" | "missing_credentials";

export default function DashboardPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // ===== Dados locais (liveQuery: recarregam sozinhos após o sync) =====
  const summary = useLiveQuery(
    () => getMonthlySummary(year, month),
    [year, month],
  );
  const settings = useLiveQuery(
    async () => (await db.settings.get(1)) ?? DEFAULT_SETTINGS,
    [],
  );
  const accounts = useLiveQuery(() => db.accounts.toArray(), []);
  const openBills = useLiveQuery(async () => {
    const { start } = monthRange(year, month);
    const bills = await db.bills
      .where("dueDate")
      .aboveOrEqual(start)
      .sortBy("dueDate");
    return bills.filter((b) => !b.paid);
  }, [year, month]);
  const lastTransactions = useLiveQuery(
    () => db.transactions.orderBy("date").reverse().limit(10).toArray(),
    [],
  );
  const lastSync = useLiveQuery(
    () => db.synclogs.orderBy("ranAt").last(),
    [],
  );

  // ===== Sincronização =====
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncMessages, setSyncMessages] = useState<string[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResultMsg, setSyncResultMsg] = useState<string | null>(null);
  const syncingRef = useRef(false);

  async function handleSync() {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncState("running");
    setSyncMessages([]);
    setSyncError(null);
    setSyncResultMsg(null);
    try {
      const result = await runSync((msg) =>
        setSyncMessages((prev) => [...prev, msg]),
      );
      if (result.status === "error") {
        setSyncState("error");
        setSyncError(
          result.message ||
            (result.errors?.length ? String(result.errors[0]) : null) ||
            "Falha na sincronização.",
        );
      } else {
        setSyncState("ok");
        setSyncResultMsg(
          result.message ??
            `${result.newTransactions} ${
              result.newTransactions === 1
                ? "transação nova"
                : "transações novas"
            }`,
        );
      }
    } catch (err) {
      if (err instanceof MissingPluggyCredentialsError) {
        setSyncState("missing_credentials");
      } else {
        setSyncState("error");
        setSyncError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      syncingRef.current = false;
    }
  }

  // Auto-sync ao abrir, se o último sync tiver mais de 6h e houver credenciais
  const autoSyncTried = useRef(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (autoSyncTried.current) return;
      const s = await db.settings.get(1);
      if (!hasPluggyCredentials(s)) return;
      const last = await db.synclogs.orderBy("ranAt").last();
      if (
        last &&
        Date.now() - new Date(last.ranAt).getTime() < AUTO_SYNC_INTERVAL_MS
      ) {
        return;
      }
      if (cancelled || autoSyncTried.current) return;
      autoSyncTried.current = true;
      void handleSync();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Carregando =====
  const loading =
    summary === undefined ||
    settings === undefined ||
    accounts === undefined ||
    openBills === undefined ||
    lastTransactions === undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="animate-pulse text-sm text-slate-500">Carregando…</p>
      </div>
    );
  }

  const syncing = syncState === "running";

  const syncButton = (
    <button
      type="button"
      onClick={handleSync}
      disabled={syncing}
      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span aria-hidden className={syncing ? "animate-spin" : ""}>
        🔄
      </span>
      {syncing ? "Sincronizando…" : "Sincronizar"}
    </button>
  );

  const syncFeedback = (
    <>
      {syncing && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <span aria-hidden className="animate-spin text-lg">
              ⏳
            </span>
            <p className="text-sm font-medium text-slate-200">
              Sincronizando com seus bancos…
            </p>
          </div>
          {syncMessages.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-slate-400">
              {syncMessages.slice(-6).map((msg, i) => (
                <li key={`${i}-${msg}`} className="font-mono">
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {syncState === "missing_credentials" && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden>
                🔑
              </span>
              <div>
                <p className="text-sm font-semibold text-amber-200">
                  Credenciais da Pluggy não configuradas
                </p>
                <p className="mt-0.5 text-xs text-amber-200/70">
                  Preencha Client ID, Client Secret e os Item IDs na seção
                  “Conexão Pluggy” das Configurações para sincronizar.
                </p>
              </div>
            </div>
            <Link
              href="/config"
              className="rounded-lg bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/30"
            >
              Abrir Configurações →
            </Link>
          </div>
        </Card>
      )}

      {syncState === "error" && (
        <Card className="border-rose-500/40 bg-rose-500/10">
          <div className="flex items-center gap-3">
            <span className="text-xl" aria-hidden>
              ⚠️
            </span>
            <p className="text-sm text-rose-200">
              Erro na sincronização
              {syncError ? (
                <>
                  : <span className="font-medium">{syncError}</span>
                </>
              ) : (
                "."
              )}
            </p>
          </div>
        </Card>
      )}

      {syncState === "ok" && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 py-3">
          <p className="text-sm text-emerald-300">
            ✓ Sincronização concluída
            {syncResultMsg ? ` — ${syncResultMsg}` : "."}
          </p>
        </Card>
      )}
    </>
  );

  // ===== Estado totalmente vazio: nunca sincronizou nada =====
  if (accounts.length === 0 && lastTransactions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Bem-vindo ao OpenControllerFinance"
          subtitle="Suas finanças pessoais, sincronizadas direto dos seus bancos."
        >
          {syncButton}
        </PageHeader>
        {syncFeedback}
        <EmptyState title="Nenhum dado por aqui ainda" icon="🚀">
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-left">
            <li>
              Preencha suas credenciais da Pluggy em{" "}
              <Link href="/config" className="text-emerald-400 underline">
                Configurações → Conexão Pluggy
              </Link>
            </li>
            <li>
              Conecte suas contas (Mercado Pago, Nubank, Inter, BB, Itaú) via
              Open Finance e informe os Item IDs
            </li>
            <li>
              Toque em <strong>🔄 Sincronizar</strong> para importar contas,
              transações e faturas
            </li>
            <li>
              Defina seu orçamento mensal em{" "}
              <Link href="/config" className="text-emerald-400 underline">
                Configurações
              </Link>
            </li>
          </ol>
        </EmptyState>
      </div>
    );
  }

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const bankAccounts = accounts.filter((a) => a.type === "BANK");
  const totalBankBalance = bankAccounts.reduce((s, a) => s + a.balance, 0);
  const totalOpenBills = openBills.reduce((s, b) => s + b.totalAmount, 0);
  const nextBills = openBills.slice(0, 5);
  const top5 = summary.byCategory.slice(0, 5);
  const maxCategoryTotal = top5[0]?.total ?? 0;

  const showAlert =
    summary.percentUsed !== null &&
    summary.percentUsed >= settings.alertThreshold;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Resumo de ${monthLabel(year, month)}`}
      >
        {syncButton}
      </PageHeader>

      {syncFeedback}

      {showAlert && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-rose-200">
          <span className="text-xl" aria-hidden>
            ⚠️
          </span>
          <p className="text-sm font-medium">
            Atenção: você já usou{" "}
            <strong>{Math.round(summary.percentUsed!)}%</strong> do seu
            orçamento deste mês
            {summary.remaining !== null && summary.remaining < 0
              ? " — orçamento estourado!"
              : "."}
          </p>
        </div>
      )}

      {/* Widget de orçamento */}
      {summary.budget !== null ? (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-900/40 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <CardTitle>Gasto no mês</CardTitle>
              <p className="mt-1 text-4xl font-bold tracking-tight text-slate-50">
                {formatBRL(summary.spent)}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                de {formatBRL(summary.budget)} —{" "}
                <span className="text-slate-300">
                  {MODE_LABELS[summary.mode] ?? summary.mode}
                </span>
              </p>
            </div>
            <div className="text-right">
              <CardTitle>Ainda pode gastar</CardTitle>
              <p
                className={`mt-1 text-3xl font-bold tracking-tight ${
                  (summary.remaining ?? 0) >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {formatBRL(summary.remaining ?? 0)}
              </p>
              {summary.upcomingRecurring > 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  já reservando {formatBRL(summary.upcomingRecurring)} de
                  gastos recorrentes
                </p>
              )}
            </div>
          </div>
          <div className="mt-6">
            <ProgressBar percent={summary.percentUsed ?? 0} className="h-3.5" />
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>{Math.round(summary.percentUsed ?? 0)}% usado</span>
              <span>alerta em {settings.alertThreshold}% do orçamento</span>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-emerald-500/30 bg-emerald-500/5 p-6 text-center sm:p-8">
          <p className="text-lg font-semibold text-slate-100">
            Você ainda não definiu um orçamento mensal
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Defina uma meta de gastos para acompanhar quanto ainda pode gastar
            neste mês.
          </p>
          <Link
            href="/config"
            className="mt-4 inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
          >
            Configurar orçamento
          </Link>
        </Card>
      )}

      {/* Cards menores */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardTitle>Ganhos do mês</CardTitle>
          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {formatBRL(summary.income)}
          </p>
        </Card>
        <Card>
          <CardTitle>Saldo em conta</CardTitle>
          <p className="mt-2 text-2xl font-bold text-slate-50">
            {formatBRL(totalBankBalance)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {bankAccounts.length}{" "}
            {bankAccounts.length === 1 ? "conta bancária" : "contas bancárias"}
          </p>
        </Card>
        <Card>
          <CardTitle>Faturas em aberto</CardTitle>
          <p className="mt-2 text-2xl font-bold text-rose-400">
            {formatBRL(totalOpenBills)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {openBills.length}{" "}
            {openBills.length === 1 ? "fatura não paga" : "faturas não pagas"}
          </p>
        </Card>
      </div>

      {/* Visão do negócio (apenas perfil Empresa) */}
      {settings.profileType === "business" && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle>Visão do negócio</CardTitle>
            <Link
              href="/aprenda"
              className="text-xs font-medium text-emerald-400 hover:underline"
            >
              Entenda a diferença entre faturamento e lucro →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardTitle>Faturamento do mês</CardTitle>
              <p className="mt-2 text-2xl font-bold text-emerald-400">
                {formatBRL(summary.income)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                tudo que entrou pela atividade
              </p>
            </Card>
            <Card>
              <CardTitle>Saídas do mês</CardTitle>
              <p className="mt-2 text-2xl font-bold text-rose-400">
                {formatBRL(summary.spent)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                custos, despesas, impostos e taxas
              </p>
            </Card>
            <Card>
              <CardTitle>Resultado do mês</CardTitle>
              <p
                className={`mt-2 text-2xl font-bold ${
                  summary.income - summary.spent >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {formatBRL(summary.income - summary.spent)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {summary.income > 0
                  ? `margem de ${(((summary.income - summary.spent) / summary.income) * 100).toFixed(1)}%`
                  : "sem ganhos registrados neste mês"}
              </p>
            </Card>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top 5 categorias */}
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Top 5 categorias do mês</CardTitle>
            <Link
              href="/analise"
              className="text-xs font-medium text-emerald-400 hover:underline"
            >
              ver análise →
            </Link>
          </div>
          {top5.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Nenhum gasto registrado neste mês.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {top5.map((c) => (
                <li key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-300">{c.category}</span>
                    <span className="font-mono tabular-nums text-slate-200">
                      {formatBRL(c.total)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${categoryBarClass(c.category)}`}
                      style={{
                        width: `${maxCategoryTotal > 0 ? (c.total / maxCategoryTotal) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Próximas faturas */}
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Próximas faturas</CardTitle>
            <Link
              href="/faturas"
              className="text-xs font-medium text-emerald-400 hover:underline"
            >
              ver todas →
            </Link>
          </div>
          {nextBills.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Nenhuma fatura em aberto. 🎉
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-800">
              {nextBills.map((bill) => {
                const account = accountById.get(bill.accountId);
                return (
                  <li
                    key={bill.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {account?.name ?? "Cartão"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {account?.bankName ?? "—"} · vence em{" "}
                        {formatDate(bill.dueDate)}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums text-rose-400">
                      {formatBRL(bill.totalAmount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Últimas transações */}
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Últimas transações</CardTitle>
          <Link
            href="/transacoes"
            className="text-xs font-medium text-emerald-400 hover:underline"
          >
            ver todas →
          </Link>
        </div>
        {lastTransactions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Nenhuma transação sincronizada ainda.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-800">
                {lastTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-slate-500">
                      {formatDate(tx.date)}
                    </td>
                    <td className="max-w-72 truncate py-2.5 pr-4 text-slate-200">
                      {tx.description}
                    </td>
                    <td className="hidden whitespace-nowrap py-2.5 pr-4 text-slate-500 sm:table-cell">
                      {accountById.get(tx.accountId)?.bankName ?? "—"}
                    </td>
                    <td className="hidden py-2.5 pr-4 md:table-cell">
                      <CategoryBadge category={tx.category} />
                    </td>
                    <td className="whitespace-nowrap py-2.5 text-right">
                      <Amount value={tx.amount} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Rodapé: sincronização */}
      <p className="text-center text-xs text-slate-600">
        {lastSync ? (
          <>
            Última sincronização: {formatDateTime(lastSync.ranAt)} —{" "}
            {lastSync.status === "ok" ? (
              <span className="text-emerald-500">
                ok, {lastSync.newTransactions}{" "}
                {lastSync.newTransactions === 1
                  ? "transação nova"
                  : "transações novas"}
              </span>
            ) : (
              <span className="text-rose-500">
                {lastSync.status === "partial" ? "parcial" : "erro"}
                {lastSync.message ? `: ${lastSync.message}` : ""}
              </span>
            )}
          </>
        ) : (
          <>Nunca sincronizado — toque em 🔄 Sincronizar para importar seus dados.</>
        )}
      </p>
    </div>
  );
}

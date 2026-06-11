import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  formatBRL,
  getMonthlySummary,
  getSettings,
  monthRange,
} from "@/lib/budget";
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
import {
  formatDate,
  formatDateTime,
  monthLabel,
} from "@/components/format";

export const dynamic = "force-dynamic";

const MODE_LABELS: Record<string, string> = {
  goal: "Meta definida",
  avg_income: "Média dos últimos ganhos",
  fixed_income: "% da renda informada",
};

export default async function DashboardPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { start } = monthRange(year, month);

  const [
    summary,
    settings,
    bankAccounts,
    openBills,
    lastTransactions,
    lastSync,
    accountCount,
  ] = await Promise.all([
    getMonthlySummary(year, month),
    getSettings(),
    prisma.account.findMany({ where: { type: "BANK" } }),
    prisma.creditCardBill.findMany({
      where: { paid: false, dueDate: { gte: start } },
      include: { account: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.transaction.findMany({
      include: { account: true },
      orderBy: { date: "desc" },
      take: 10,
    }),
    prisma.syncLog.findFirst({ orderBy: { ranAt: "desc" } }),
    prisma.account.count(),
  ]);

  // Estado totalmente vazio: nunca sincronizou nada
  if (accountCount === 0 && lastTransactions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Bem-vindo ao OpenControllerFinance"
          subtitle="Suas finanças pessoais, sincronizadas direto dos seus bancos."
        />
        <EmptyState title="Nenhum dado por aqui ainda" icon="🚀">
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-left">
            <li>
              Configure suas credenciais da Pluggy no arquivo{" "}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">
                .env
              </code>
            </li>
            <li>
              Conecte suas contas (Mercado Pago, Nubank, Inter, BB, Itaú) via
              Open Finance
            </li>
            <li>
              Rode{" "}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">
                npm run sync
              </code>{" "}
              para importar contas, transações e faturas
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
      />

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
              <span>
                alerta em {settings.alertThreshold}% do orçamento
              </span>
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
              {nextBills.map((bill) => (
                <li
                  key={bill.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {bill.account.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {bill.account.bankName} · vence em{" "}
                      {formatDate(bill.dueDate)}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums text-rose-400">
                    {formatBRL(bill.totalAmount)}
                  </span>
                </li>
              ))}
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
                      {tx.account.bankName}
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
                erro{lastSync.message ? `: ${lastSync.message}` : ""}
              </span>
            )}
          </>
        ) : (
          <>
            Nunca sincronizado — rode{" "}
            <code className="rounded bg-slate-900 px-1.5 py-0.5">
              npm run sync
            </code>{" "}
            para importar seus dados.
          </>
        )}
      </p>
    </div>
  );
}

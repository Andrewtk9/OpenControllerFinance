import Link from "next/link";
import { prisma } from "@/lib/db";
import { monthRange } from "@/lib/budget";
import { CATEGORIES } from "@/components/categories";
import { CategorySelect } from "@/components/category-select";
import { Amount, Card, EmptyState, PageHeader } from "@/components/ui";
import {
  formatDate,
  monthLabelCapitalized,
  monthParam,
  parseMonthParam,
  shiftMonth,
} from "@/components/format";
import { createRuleFromTransaction } from "@/app/actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function buildUrl(params: {
  mes?: string;
  categoria?: string;
  conta?: string;
  pagina?: number;
}) {
  const qs = new URLSearchParams();
  if (params.mes) qs.set("mes", params.mes);
  if (params.categoria) qs.set("categoria", params.categoria);
  if (params.conta) qs.set("conta", params.conta);
  if (params.pagina && params.pagina > 1)
    qs.set("pagina", String(params.pagina));
  const s = qs.toString();
  return `/transacoes${s ? `?${s}` : ""}`;
}

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { year, month } = parseMonthParam(asString(sp.mes));
  const categoria = asString(sp.categoria) || undefined;
  const conta = asString(sp.conta) || undefined;
  const pagina = Math.max(1, parseInt(asString(sp.pagina) ?? "1", 10) || 1);

  const { start, end } = monthRange(year, month);
  const mes = monthParam(year, month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  const where = {
    date: { gte: start, lt: end },
    ...(categoria ? { category: categoria } : {}),
    ...(conta ? { accountId: conta } : {}),
  };

  const [transactions, total, accounts, totalAll] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { account: true },
      orderBy: { date: "desc" },
      skip: (pagina - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.transaction.count({ where }),
    prisma.account.findMany({ orderBy: { bankName: "asc" } }),
    prisma.transaction.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (totalAll === 0) {
    return (
      <div>
        <PageHeader title="Transações" />
        <EmptyState title="Nenhuma transação ainda" icon="🧾">
          Rode{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">
            npm run sync
          </code>{" "}
          para importar as transações dos seus bancos.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transações"
        subtitle={`${total} ${total === 1 ? "transação" : "transações"} no período`}
      />

      {/* Navegação de mês + filtros */}
      <Card className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-2">
          <Link
            href={buildUrl({
              mes: monthParam(prev.year, prev.month),
              categoria,
              conta,
            })}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition-colors hover:bg-slate-800"
            title="Mês anterior"
          >
            ‹
          </Link>
          <span className="min-w-36 text-center text-sm font-semibold text-slate-100">
            {monthLabelCapitalized(year, month)}
          </span>
          <Link
            href={buildUrl({
              mes: monthParam(next.year, next.month),
              categoria,
              conta,
            })}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition-colors hover:bg-slate-800"
            title="Mês seguinte"
          >
            ›
          </Link>
        </div>

        <form method="GET" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="mes" value={mes} />
          <select
            name="categoria"
            defaultValue={categoria ?? ""}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200"
          >
            <option value="">Todas as categorias</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            name="conta"
            defaultValue={conta ?? ""}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200"
          >
            <option value="">Todas as contas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bankName} — {a.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-4 py-1.5 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-600"
          >
            Filtrar
          </button>
          {(categoria || conta) && (
            <Link
              href={buildUrl({ mes })}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              limpar
            </Link>
          )}
        </form>
      </Card>

      {/* Tabela */}
      {transactions.length === 0 ? (
        <EmptyState title="Nada encontrado" icon="🔍">
          Nenhuma transação para os filtros escolhidos neste mês.
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Conta
                </th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-900/50">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-400">
                    {formatDate(tx.date)}
                  </td>
                  <td className="max-w-64 px-4 py-2.5">
                    <span
                      className="block truncate text-slate-200"
                      title={tx.description}
                    >
                      {tx.description}
                    </span>
                    {tx.status === "PENDING" && (
                      <span className="text-[10px] uppercase text-amber-500">
                        pendente
                      </span>
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-2.5 text-slate-400 sm:table-cell">
                    {tx.account.bankName}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <CategorySelect
                        transactionId={tx.id}
                        category={tx.category}
                      />
                      <form action={createRuleFromTransaction}>
                        <input
                          type="hidden"
                          name="transactionId"
                          value={tx.id}
                        />
                        <button
                          type="submit"
                          title="Criar regra: aplicar esta categoria a estabelecimentos similares"
                          className="rounded-md border border-slate-700 px-1.5 py-1 text-[11px] text-slate-400 transition-colors hover:border-emerald-500 hover:text-emerald-400"
                        >
                          + regra
                        </button>
                      </form>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <Amount value={tx.amount} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          {pagina > 1 ? (
            <Link
              href={buildUrl({ mes, categoria, conta, pagina: pagina - 1 })}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 transition-colors hover:bg-slate-800"
            >
              ‹ Anterior
            </Link>
          ) : (
            <span className="rounded-lg border border-slate-800 px-3 py-1.5 text-slate-600">
              ‹ Anterior
            </span>
          )}
          <span className="text-slate-400">
            Página {pagina} de {totalPages}
          </span>
          {pagina < totalPages ? (
            <Link
              href={buildUrl({ mes, categoria, conta, pagina: pagina + 1 })}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 transition-colors hover:bg-slate-800"
            >
              Próxima ›
            </Link>
          ) : (
            <span className="rounded-lg border border-slate-800 px-3 py-1.5 text-slate-600">
              Próxima ›
            </span>
          )}
        </div>
      )}
    </div>
  );
}

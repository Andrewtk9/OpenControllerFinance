import { prisma } from "@/lib/db";
import { formatBRL } from "@/lib/budget";
import { Card, CardTitle, EmptyState, PageHeader } from "@/components/ui";
import { formatDate } from "@/components/format";

export const dynamic = "force-dynamic";

export default async function FaturasPage() {
  const cards = await prisma.account.findMany({
    where: { type: "CREDIT" },
    include: { bills: { orderBy: { dueDate: "desc" } } },
    orderBy: { bankName: "asc" },
  });

  if (cards.length === 0) {
    return (
      <div>
        <PageHeader title="Faturas" />
        <EmptyState title="Nenhum cartão de crédito conectado" icon="💳">
          Quando você conectar um cartão de crédito via Open Finance e rodar{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">
            npm run sync
          </code>
          , as faturas aparecerão aqui.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faturas"
        subtitle={`${cards.length} ${cards.length === 1 ? "cartão de crédito" : "cartões de crédito"}`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {cards.map((card) => {
          const currentBill = card.bills.find((b) => !b.paid) ?? null;
          const usedLimit =
            card.creditLimit !== null && card.availableLimit !== null
              ? card.creditLimit - card.availableLimit
              : null;
          const usagePercent =
            usedLimit !== null && card.creditLimit && card.creditLimit > 0
              ? (usedLimit / card.creditLimit) * 100
              : null;

          return (
            <Card key={card.id} className="space-y-5">
              {/* Cabeçalho do cartão */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-50">
                    {card.name}
                  </h2>
                  <p className="text-sm text-slate-400">{card.bankName}</p>
                </div>
                <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                  💳 crédito
                </span>
              </div>

              {/* Fatura atual */}
              {currentBill ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <CardTitle>Fatura atual</CardTitle>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-rose-400">
                    {formatBRL(currentBill.totalAmount)}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-500">Vencimento</p>
                      <p className="font-medium text-slate-200">
                        {formatDate(currentBill.dueDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Fechamento</p>
                      <p className="font-medium text-slate-200">
                        {currentBill.closeDate
                          ? formatDate(currentBill.closeDate)
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Pgto. mínimo</p>
                      <p className="font-medium text-slate-200">
                        {currentBill.minimumPayment !== null
                          ? formatBRL(currentBill.minimumPayment)
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
                  Nenhuma fatura em aberto. 🎉
                </div>
              )}

              {/* Uso do limite */}
              {usagePercent !== null && usedLimit !== null ? (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Uso do limite</span>
                    <span className="font-mono text-xs tabular-nums text-slate-300">
                      {formatBRL(usedLimit)} / {formatBRL(card.creditLimit!)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        usagePercent < 50
                          ? "bg-emerald-500"
                          : usagePercent < 80
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{
                        width: `${Math.max(0, Math.min(100, usagePercent))}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {Math.round(usagePercent)}% utilizado · disponível:{" "}
                    {formatBRL(card.availableLimit!)}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Limite do cartão não informado pelo banco.
                </p>
              )}

              {/* Histórico de faturas */}
              <div>
                <CardTitle>Histórico de faturas</CardTitle>
                {card.bills.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Nenhuma fatura sincronizada.
                  </p>
                ) : (
                  <table className="mt-2 w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="py-1.5 font-medium">Vencimento</th>
                        <th className="py-1.5 text-right font-medium">
                          Valor
                        </th>
                        <th className="py-1.5 text-right font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {card.bills.map((bill) => (
                        <tr key={bill.id}>
                          <td className="py-2 text-slate-300">
                            {formatDate(bill.dueDate)}
                          </td>
                          <td className="py-2 text-right font-mono tabular-nums text-slate-200">
                            {formatBRL(bill.totalAmount)}
                          </td>
                          <td className="py-2 text-right">
                            {bill.paid ? (
                              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                                paga
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                                em aberto
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

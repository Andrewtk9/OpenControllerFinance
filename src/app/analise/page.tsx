"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/local/db";
import { EXCLUDED_CATEGORIES, formatBRL } from "@/lib/local/budget";
import { categoryBarClass } from "@/components/categories";
import {
  Card,
  CardTitle,
  CategoryBadge,
  EmptyState,
  PageHeader,
} from "@/components/ui";

const PERIODS = [
  { key: "mes", label: "Este mês", months: 1 },
  { key: "3m", label: "3 meses", months: 3 },
  { key: "6m", label: "6 meses", months: 6 },
  { key: "12m", label: "12 meses", months: 12 },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

// Normaliza descrição de estabelecimento:
// lowercase, sem números/datas/asteriscos, espaços colapsados
// "IFOOD *RESTAURANTE 123" → "ifood"
function normalizeMerchant(description: string): string {
  const cleaned = description
    .toLowerCase()
    .replace(/\d+[\/\-.]\d+([\/\-.]\d+)?/g, " ") // datas
    .replace(/[\d*]+/g, " ") // números e asteriscos
    .replace(/[^\p{L}\s]/gu, " ") // pontuação
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "(sem descrição)";
  const tokens = cleaned.split(" ");
  // primeiro token significativo; se for curto, junta com o seguinte
  if (tokens[0].length >= 3) return tokens[0];
  return tokens.slice(0, 2).join(" ");
}

export default function AnalisePage() {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("mes");
  const period = PERIODS.find((p) => p.key === periodKey) ?? PERIODS[0];

  const now = new Date();
  const startDate = new Date(
    now.getFullYear(),
    now.getMonth() - (period.months - 1),
    1
  );
  const startIso = `${startDate.getFullYear()}-${String(
    startDate.getMonth() + 1
  ).padStart(2, "0")}-01`;

  const excluded = EXCLUDED_CATEGORIES as readonly string[];

  const expenses = useLiveQuery(
    () =>
      db.transactions
        .where("date")
        .aboveOrEqual(startIso)
        .filter((tx) => tx.amount < 0 && !excluded.includes(tx.category))
        .toArray(),
    [startIso]
  );

  if (!expenses) return null;

  // --- Por categoria ---
  const byCategory = new Map<string, { total: number; count: number }>();
  for (const tx of expenses) {
    const entry = byCategory.get(tx.category) ?? { total: 0, count: 0 };
    entry.total += -tx.amount;
    entry.count += 1;
    byCategory.set(tx.category, entry);
  }
  const categoryRanking = [...byCategory.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total);

  // --- Por estabelecimento ---
  const byMerchant = new Map<
    string,
    { total: number; count: number; categories: Map<string, number> }
  >();
  for (const tx of expenses) {
    const merchant = normalizeMerchant(tx.description);
    const entry =
      byMerchant.get(merchant) ??
      { total: 0, count: 0, categories: new Map<string, number>() };
    entry.total += -tx.amount;
    entry.count += 1;
    entry.categories.set(
      tx.category,
      (entry.categories.get(tx.category) ?? 0) + 1
    );
    byMerchant.set(merchant, entry);
  }
  const merchantRanking = [...byMerchant.entries()]
    .map(([merchant, v]) => {
      let topCategory = "Outros";
      let topCount = 0;
      for (const [cat, count] of v.categories) {
        if (count > topCount) {
          topCount = count;
          topCategory = cat;
        }
      }
      return { merchant, total: v.total, count: v.count, topCategory };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  const totalSpent = expenses.reduce((s, tx) => s + -tx.amount, 0);
  const maxCategory = categoryRanking[0]?.total ?? 0;
  const maxMerchant = merchantRanking[0]?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Análise" subtitle="Com o que você mais gasta">
        {/* Seletor de período */}
        <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriodKey(p.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                p.key === period.key
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {expenses.length === 0 ? (
        <EmptyState title="Nenhum gasto no período" icon="📊">
          Não há transações de gasto para analisar neste período. Tente um
          período maior ou sincronize seus bancos nas{" "}
          <span className="font-medium text-slate-300">Configurações</span>.
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-slate-400">
            Total gasto no período:{" "}
            <span className="font-semibold text-rose-400">
              {formatBRL(totalSpent)}
            </span>{" "}
            em {expenses.length}{" "}
            {expenses.length === 1 ? "transação" : "transações"}
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Por categoria */}
            <Card>
              <CardTitle>Por categoria</CardTitle>
              {categoryRanking.length > 0 && (
                <p className="mt-2 text-sm text-slate-300">
                  Seu maior gasto:{" "}
                  <span className="font-semibold text-slate-50">
                    {categoryRanking[0].category}
                  </span>{" "}
                  <span className="text-rose-400">
                    ({formatBRL(categoryRanking[0].total)})
                  </span>
                </p>
              )}
              <ul className="mt-4 space-y-3.5">
                {categoryRanking.map((c, i) => (
                  <li key={c.category}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 text-slate-300">
                        <span className="w-5 text-right font-mono text-xs text-slate-600">
                          {i + 1}.
                        </span>
                        {c.category}
                        <span className="text-xs text-slate-500">
                          ({c.count} {c.count === 1 ? "transação" : "transações"})
                        </span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-200">
                        {formatBRL(c.total)}
                      </span>
                    </div>
                    <div className="ml-7 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${categoryBarClass(c.category)}`}
                        style={{
                          width: `${maxCategory > 0 ? (c.total / maxCategory) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Por estabelecimento */}
            <Card>
              <CardTitle>Por estabelecimento (top 20)</CardTitle>
              {merchantRanking.length > 0 && (
                <p className="mt-2 text-sm text-slate-300">
                  Seu maior gasto:{" "}
                  <span className="font-semibold capitalize text-slate-50">
                    {merchantRanking[0].merchant}
                  </span>{" "}
                  <span className="text-rose-400">
                    ({formatBRL(merchantRanking[0].total)})
                  </span>
                </p>
              )}
              <ul className="mt-4 space-y-3.5">
                {merchantRanking.map((m, i) => (
                  <li key={m.merchant}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="w-5 shrink-0 text-right font-mono text-xs text-slate-600">
                          {i + 1}.
                        </span>
                        <span className="truncate capitalize text-slate-300">
                          {m.merchant}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">
                          ({m.count} {m.count === 1 ? "compra" : "compras"})
                        </span>
                      </span>
                      <span className="shrink-0 font-mono tabular-nums text-slate-200">
                        {formatBRL(m.total)}
                      </span>
                    </div>
                    <div className="ml-7 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-rose-500"
                          style={{
                            width: `${maxMerchant > 0 ? (m.total / maxMerchant) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <CategoryBadge category={m.topCategory} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

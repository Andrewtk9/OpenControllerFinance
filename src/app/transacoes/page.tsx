"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Transaction } from "@/lib/local/db";
import { monthRange } from "@/lib/local/budget";
import { CATEGORIES } from "@/components/categories";
import { Amount, Card, EmptyState, PageHeader } from "@/components/ui";
import {
  formatDate,
  monthLabelCapitalized,
  shiftMonth,
} from "@/components/format";

const PAGE_SIZE = 50;

// Extrai a primeira palavra significativa da descrição:
// >3 letras, lowercase, sem dígitos nem asteriscos.
function extractPattern(description: string): string | null {
  for (const raw of description.toLowerCase().split(/\s+/)) {
    if (/[\d*]/.test(raw)) continue;
    const word = raw.replace(/[^\p{L}]/gu, "");
    if (word.length > 3) return word;
  }
  return null;
}

async function updateCategory(id: string, category: string) {
  await db.transactions.update(id, {
    category,
    categorySource: "manual" as const,
  });
}

// Cria uma regra a partir da transação e recategoriza em lote as
// transações não-"manual" cuja descrição contenha o pattern.
async function createRuleFromTransaction(tx: Transaction) {
  const pattern = extractPattern(tx.description);
  if (!pattern) {
    alert(
      "Não foi possível extrair uma palavra significativa desta descrição."
    );
    return;
  }
  await db.rules.add({ pattern, category: tx.category, priority: 10 });
  const updated = await db.transactions
    .filter(
      (t) =>
        t.categorySource !== "manual" &&
        t.description.toLowerCase().includes(pattern)
    )
    .modify({ category: tx.category, categorySource: "rule" as const });
  alert(
    `Regra "${pattern}" → ${tx.category} criada. ${updated} ${
      updated === 1 ? "transação recategorizada" : "transações recategorizadas"
    }.`
  );
}

function RowCategorySelect({ tx }: { tx: Transaction }) {
  return (
    <select
      value={tx.category}
      onChange={(e) => void updateCategory(tx.id, e.target.value)}
      className="w-full max-w-44 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 outline-none focus:border-emerald-500"
      title="Alterar categoria desta transação"
    >
      {!(CATEGORIES as readonly string[]).includes(tx.category) && (
        <option value={tx.category}>{tx.category}</option>
      )}
      {CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

export default function TransacoesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [categoria, setCategoria] = useState("");
  const [conta, setConta] = useState("");
  const [pagina, setPagina] = useState(1);

  const accounts = useLiveQuery(() => db.accounts.toArray(), []);
  const totalAll = useLiveQuery(() => db.transactions.count(), []);
  const monthTx = useLiveQuery(() => {
    const { start, end } = monthRange(year, month);
    return db.transactions
      .where("date")
      .between(start, end, true, false)
      .toArray();
  }, [year, month]);

  if (!accounts || totalAll === undefined || !monthTx) return null;

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const sortedAccounts = [...accounts].sort((a, b) =>
    a.bankName.localeCompare(b.bankName, "pt-BR")
  );

  const filtered = monthTx
    .filter(
      (tx) =>
        (!categoria || tx.category === categoria) &&
        (!conta || tx.accountId === conta)
    )
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(pagina, totalPages);
  const pageTx = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const goToMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
    setPagina(1);
  };

  if (totalAll === 0) {
    return (
      <div>
        <PageHeader title="Transações" />
        <EmptyState title="Nenhuma transação ainda" icon="🧾">
          Conecte seus bancos nas{" "}
          <span className="font-medium text-slate-300">Configurações</span> e
          sincronize para importar suas transações.
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
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition-colors hover:bg-slate-800"
            title="Mês anterior"
          >
            ‹
          </button>
          <span className="min-w-36 text-center text-sm font-semibold text-slate-100">
            {monthLabelCapitalized(year, month)}
          </span>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition-colors hover:bg-slate-800"
            title="Mês seguinte"
          >
            ›
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value);
              setPagina(1);
            }}
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
            value={conta}
            onChange={(e) => {
              setConta(e.target.value);
              setPagina(1);
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200"
          >
            <option value="">Todas as contas</option>
            {sortedAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bankName} — {a.name}
              </option>
            ))}
          </select>
          {(categoria || conta) && (
            <button
              type="button"
              onClick={() => {
                setCategoria("");
                setConta("");
                setPagina(1);
              }}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              limpar
            </button>
          )}
        </div>
      </Card>

      {/* Tabela */}
      {pageTx.length === 0 ? (
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
              {pageTx.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-900/50">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-400">
                    {formatDate(new Date(tx.date))}
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
                    {accountById.get(tx.accountId)?.bankName ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <RowCategorySelect tx={tx} />
                      <button
                        type="button"
                        onClick={() => void createRuleFromTransaction(tx)}
                        title="Criar regra: aplicar esta categoria a estabelecimentos similares"
                        className="rounded-md border border-slate-700 px-1.5 py-1 text-[11px] text-slate-400 transition-colors hover:border-emerald-500 hover:text-emerald-400"
                      >
                        + regra
                      </button>
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
          {currentPage > 1 ? (
            <button
              type="button"
              onClick={() => setPagina(currentPage - 1)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 transition-colors hover:bg-slate-800"
            >
              ‹ Anterior
            </button>
          ) : (
            <span className="rounded-lg border border-slate-800 px-3 py-1.5 text-slate-600">
              ‹ Anterior
            </span>
          )}
          <span className="text-slate-400">
            Página {currentPage} de {totalPages}
          </span>
          {currentPage < totalPages ? (
            <button
              type="button"
              onClick={() => setPagina(currentPage + 1)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 transition-colors hover:bg-slate-800"
            >
              Próxima ›
            </button>
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

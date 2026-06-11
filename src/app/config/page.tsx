import { prisma } from "@/lib/db";
import { formatBRL, getSettings } from "@/lib/budget";
import { CATEGORIES } from "@/components/categories";
import { Card, CardTitle, CategoryBadge, PageHeader } from "@/components/ui";
import {
  addCategoryRule,
  addRecurringExpense,
  deleteCategoryRule,
  deleteRecurringExpense,
  saveSettings,
  toggleRecurringExpense,
} from "@/app/actions";

export const dynamic = "force-dynamic";

const inputClass =
  "rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500";

export default async function ConfigPage() {
  const [settings, recurring, rules, accounts] = await Promise.all([
    getSettings(),
    prisma.recurringExpense.findMany({ orderBy: { dayOfMonth: "asc" } }),
    prisma.categoryRule.findMany({
      orderBy: [{ priority: "desc" }, { pattern: "asc" }],
    }),
    prisma.account.findMany({ orderBy: [{ bankName: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        subtitle="Orçamento, gastos recorrentes, regras e contas conectadas"
      />

      {/* ===== Orçamento mensal ===== */}
      <Card>
        <CardTitle>Orçamento mensal</CardTitle>
        <form action={saveSettings} className="mt-4 space-y-4">
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 p-4 transition-colors hover:border-slate-700 has-checked:border-emerald-500/50 has-checked:bg-emerald-500/5">
              <input
                type="radio"
                name="budgetMode"
                value="goal"
                defaultChecked={settings.budgetMode === "goal"}
                className="mt-1 accent-emerald-500"
              />
              <div className="flex-1">
                <p className="font-medium text-slate-100">Meta fixa</p>
                <p className="mt-0.5 text-sm text-slate-400">
                  Você define quanto quer gastar por mês, independente da
                  renda.
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                  <span>Meta:</span>
                  <span className="text-slate-500">R$</span>
                  <input
                    type="number"
                    name="goalAmount"
                    step="0.01"
                    min="0"
                    defaultValue={settings.goalAmount ?? ""}
                    placeholder="3000,00"
                    className={`${inputClass} w-36`}
                  />
                  <span className="text-slate-500">por mês</span>
                </div>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 p-4 transition-colors hover:border-slate-700 has-checked:border-emerald-500/50 has-checked:bg-emerald-500/5">
              <input
                type="radio"
                name="budgetMode"
                value="avg_income"
                defaultChecked={settings.budgetMode === "avg_income"}
                className="mt-1 accent-emerald-500"
              />
              <div className="flex-1">
                <p className="font-medium text-slate-100">
                  Média dos meus ganhos (últimos 3 meses)
                </p>
                <p className="mt-0.5 text-sm text-slate-400">
                  O orçamento é calculado automaticamente: média dos ganhos dos
                  últimos 3 meses × (1 − % a guardar). Hoje:{" "}
                  <span className="text-slate-300">
                    guardar {settings.savingsPercent}%
                  </span>
                  .
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 p-4 transition-colors hover:border-slate-700 has-checked:border-emerald-500/50 has-checked:bg-emerald-500/5">
              <input
                type="radio"
                name="budgetMode"
                value="fixed_income"
                defaultChecked={settings.budgetMode === "fixed_income"}
                className="mt-1 accent-emerald-500"
              />
              <div className="flex-1">
                <p className="font-medium text-slate-100">
                  Renda fixa informada
                </p>
                <p className="mt-0.5 text-sm text-slate-400">
                  Você informa sua renda mensal; orçamento = renda × (1 − % a
                  guardar).
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                  <span>Renda mensal:</span>
                  <span className="text-slate-500">R$</span>
                  <input
                    type="number"
                    name="fixedIncome"
                    step="0.01"
                    min="0"
                    defaultValue={settings.fixedIncome ?? ""}
                    placeholder="5000,00"
                    className={`${inputClass} w-36`}
                  />
                </div>
              </div>
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-6 border-t border-slate-800 pt-4">
            <label className="text-sm">
              <span className="mb-1 block text-slate-400">
                Guardar (poupança) — usado nos modos de renda
              </span>
              <span className="flex items-center gap-2">
                <input
                  type="number"
                  name="savingsPercent"
                  step="1"
                  min="0"
                  max="100"
                  defaultValue={settings.savingsPercent}
                  className={`${inputClass} w-24`}
                />
                <span className="text-slate-500">% da renda</span>
              </span>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-400">
                Avisar quando atingir
              </span>
              <span className="flex items-center gap-2">
                <input
                  type="number"
                  name="alertThreshold"
                  step="1"
                  min="1"
                  max="200"
                  defaultValue={settings.alertThreshold}
                  className={`${inputClass} w-24`}
                />
                <span className="text-slate-500">% do orçamento</span>
              </span>
            </label>
            <button
              type="submit"
              className="ml-auto rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
            >
              Salvar orçamento
            </button>
          </div>
        </form>
      </Card>

      {/* ===== Gastos recorrentes ===== */}
      <Card>
        <CardTitle>Gastos recorrentes</CardTitle>
        <p className="mt-1 text-sm text-slate-400">
          Assinaturas, aluguel e contas fixas — são reservados no orçamento do
          mês antes de acontecerem.
        </p>

        {recurring.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Nenhum gasto recorrente cadastrado.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-4 font-medium">Nome</th>
                  <th className="py-2 pr-4 text-right font-medium">Valor</th>
                  <th className="py-2 pr-4 text-center font-medium">Dia</th>
                  <th className="py-2 pr-4 font-medium">Categoria</th>
                  <th className="py-2 pr-4 text-center font-medium">Status</th>
                  <th className="py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {recurring.map((r) => (
                  <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                    <td className="py-2.5 pr-4 text-slate-200">{r.name}</td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-slate-200">
                      {formatBRL(r.amount)}
                    </td>
                    <td className="py-2.5 pr-4 text-center text-slate-400">
                      dia {r.dayOfMonth}
                    </td>
                    <td className="py-2.5 pr-4">
                      <CategoryBadge category={r.category} />
                    </td>
                    <td className="py-2.5 pr-4 text-center">
                      {r.active ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                          ativo
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-700/40 px-2 py-0.5 text-xs font-medium text-slate-400">
                          inativo
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <form action={toggleRecurringExpense}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800"
                          >
                            {r.active ? "desativar" : "ativar"}
                          </button>
                        </form>
                        <form action={deleteRecurringExpense}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-rose-500/30 px-2 py-1 text-xs text-rose-400 transition-colors hover:bg-rose-500/10"
                          >
                            excluir
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form
          action={addRecurringExpense}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-800 pt-4"
        >
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-400">Nome</span>
            <input
              type="text"
              name="name"
              required
              placeholder="Netflix, aluguel..."
              className={`${inputClass} w-44`}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-400">
              Valor (R$)
            </span>
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0.01"
              required
              placeholder="39,90"
              className={`${inputClass} w-28`}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-400">
              Dia do mês
            </span>
            <input
              type="number"
              name="dayOfMonth"
              min="1"
              max="31"
              required
              placeholder="10"
              className={`${inputClass} w-20`}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-400">
              Categoria
            </span>
            <select name="category" className={inputClass}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-600"
          >
            + Adicionar
          </button>
        </form>
      </Card>

      {/* ===== Regras de categorização ===== */}
      <Card>
        <CardTitle>Regras de categorização</CardTitle>
        <p className="mt-1 text-sm text-slate-400">
          Transações cuja descrição contenha o padrão recebem a categoria
          automaticamente no sync.
        </p>

        {rules.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Nenhuma regra cadastrada. Dica: você também pode criar regras pelo
            botão “+ regra” na página de transações.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <code className="truncate rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">
                    {rule.pattern}
                  </code>
                  <span className="text-slate-600">→</span>
                  <CategoryBadge category={rule.category} />
                </div>
                <form action={deleteCategoryRule}>
                  <input type="hidden" name="id" value={rule.id} />
                  <button
                    type="submit"
                    title="Excluir regra"
                    className="rounded-md px-1.5 py-0.5 text-xs text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={addCategoryRule}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-800 pt-4"
        >
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-400">
              Padrão (contém na descrição)
            </span>
            <input
              type="text"
              name="pattern"
              required
              placeholder="ifood"
              className={`${inputClass} w-44`}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-400">
              Categoria
            </span>
            <select name="category" className={inputClass}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-600"
          >
            + Adicionar regra
          </button>
        </form>
      </Card>

      {/* ===== Contas conectadas ===== */}
      <Card>
        <CardTitle>Contas conectadas</CardTitle>
        {accounts.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Nenhuma conta sincronizada ainda. Rode{" "}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">
              npm run sync
            </code>{" "}
            após conectar seus bancos na Pluggy.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {account.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {account.bankName} ·{" "}
                    {account.type === "CREDIT"
                      ? "cartão de crédito"
                      : "conta bancária"}
                  </p>
                </div>
                <span
                  className={`font-mono text-sm font-semibold tabular-nums ${
                    account.type === "CREDIT"
                      ? "text-rose-400"
                      : "text-emerald-400"
                  }`}
                >
                  {formatBRL(account.balance)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

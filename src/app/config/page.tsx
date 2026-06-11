"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  DEFAULT_SETTINGS,
  getSettings,
  type Settings,
} from "@/lib/local/db";
import { formatBRL } from "@/lib/local/budget";
import { CATEGORIES } from "@/components/categories";
import { Card, CardTitle, CategoryBadge, PageHeader } from "@/components/ui";
import { ConnectBankButton } from "@/components/connect-bank-button";

const inputClass =
  "rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500";

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export default function ConfigPage() {
  // ===== Dados locais =====
  const settings = useLiveQuery(
    async () => (await db.settings.get(1)) ?? DEFAULT_SETTINGS,
    [],
  );
  const recurring = useLiveQuery(
    async () =>
      (await db.recurring.toArray()).sort((a, b) => a.dayOfMonth - b.dayOfMonth),
    [],
  );
  const rules = useLiveQuery(
    async () =>
      (await db.rules.toArray()).sort(
        (a, b) => b.priority - a.priority || a.pattern.localeCompare(b.pattern),
      ),
    [],
  );
  const accounts = useLiveQuery(
    async () =>
      (await db.accounts.toArray()).sort(
        (a, b) =>
          a.bankName.localeCompare(b.bankName) || a.name.localeCompare(b.name),
      ),
    [],
  );

  // ===== Form: orçamento =====
  const [budgetMode, setBudgetMode] =
    useState<Settings["budgetMode"]>("goal");
  const [goalAmount, setGoalAmount] = useState("");
  const [fixedIncome, setFixedIncome] = useState("");
  const [savingsPercent, setSavingsPercent] = useState("20");
  const [alertThreshold, setAlertThreshold] = useState("80");
  const [budgetSaved, setBudgetSaved] = useState(false);

  // ===== Form: conexão Pluggy + Telegram =====
  const [pluggyClientId, setPluggyClientId] = useState("");
  const [pluggyClientSecret, setPluggyClientSecret] = useState("");
  const [pluggyItemIds, setPluggyItemIds] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [connectionSaved, setConnectionSaved] = useState(false);

  // Preenche os forms uma única vez quando as settings carregam
  const formsInitialized = useRef(false);
  useEffect(() => {
    if (!settings || formsInitialized.current) return;
    formsInitialized.current = true;
    setBudgetMode(settings.budgetMode);
    setGoalAmount(settings.goalAmount != null ? String(settings.goalAmount) : "");
    setFixedIncome(
      settings.fixedIncome != null ? String(settings.fixedIncome) : "",
    );
    setSavingsPercent(String(settings.savingsPercent));
    setAlertThreshold(String(settings.alertThreshold));
    setPluggyClientId(settings.pluggyClientId ?? "");
    setPluggyClientSecret(settings.pluggyClientSecret ?? "");
    setPluggyItemIds(settings.pluggyItemIds ?? "");
    setTelegramBotToken(settings.telegramBotToken ?? "");
    setTelegramChatId(settings.telegramChatId ?? "");
  }, [settings]);

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault();
    const current = await getSettings();
    await db.settings.put({
      ...current,
      budgetMode,
      goalAmount: parseOptionalNumber(goalAmount),
      fixedIncome: parseOptionalNumber(fixedIncome),
      savingsPercent: Math.min(
        100,
        Math.max(0, parseOptionalNumber(savingsPercent) ?? 20),
      ),
      alertThreshold: Math.min(
        200,
        Math.max(1, parseOptionalNumber(alertThreshold) ?? 80),
      ),
    });
    setBudgetSaved(true);
    setTimeout(() => setBudgetSaved(false), 2500);
  }

  async function saveConnection(e: React.FormEvent) {
    e.preventDefault();
    const current = await getSettings();
    await db.settings.put({
      ...current,
      pluggyClientId: pluggyClientId.trim(),
      pluggyClientSecret: pluggyClientSecret.trim(),
      pluggyItemIds: pluggyItemIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(","),
      telegramBotToken: telegramBotToken.trim(),
      telegramChatId: telegramChatId.trim(),
    });
    setConnectionSaved(true);
    setTimeout(() => setConnectionSaved(false), 2500);
  }

  // ===== Form: gasto recorrente =====
  const [recName, setRecName] = useState("");
  const [recAmount, setRecAmount] = useState("");
  const [recDay, setRecDay] = useState("");
  const [recCategory, setRecCategory] = useState<string>(CATEGORIES[0]);

  async function addRecurring(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseOptionalNumber(recAmount);
    const dayOfMonth = parseInt(recDay, 10);
    if (!recName.trim() || !amount || amount <= 0) return;
    if (!Number.isFinite(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31)
      return;
    await db.recurring.add({
      name: recName.trim(),
      amount,
      dayOfMonth,
      category: recCategory,
      active: true,
      createdAt: new Date().toISOString(),
    });
    setRecName("");
    setRecAmount("");
    setRecDay("");
    setRecCategory(CATEGORIES[0]);
  }

  async function toggleRecurring(id: number, active: boolean) {
    await db.recurring.update(id, { active: !active });
  }

  async function deleteRecurring(id: number) {
    await db.recurring.delete(id);
  }

  // ===== Form: regra de categorização =====
  const [rulePattern, setRulePattern] = useState("");
  const [ruleCategory, setRuleCategory] = useState<string>(CATEGORIES[0]);

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    const pattern = rulePattern.trim();
    if (!pattern) return;
    await db.rules.add({ pattern, category: ruleCategory, priority: 10 });
    setRulePattern("");
    setRuleCategory(CATEGORIES[0]);
  }

  async function deleteRule(id: number) {
    await db.rules.delete(id);
  }

  if (
    settings === undefined ||
    recurring === undefined ||
    rules === undefined ||
    accounts === undefined
  ) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="animate-pulse text-sm text-slate-500">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        subtitle="Orçamento, gastos recorrentes, regras, conexão Pluggy e contas conectadas"
      />

      {/* ===== Orçamento mensal ===== */}
      <Card>
        <CardTitle>Orçamento mensal</CardTitle>
        <form onSubmit={saveBudget} className="mt-4 space-y-4">
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 p-4 transition-colors hover:border-slate-700 has-checked:border-emerald-500/50 has-checked:bg-emerald-500/5">
              <input
                type="radio"
                name="budgetMode"
                value="goal"
                checked={budgetMode === "goal"}
                onChange={() => setBudgetMode("goal")}
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
                    step="0.01"
                    min="0"
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(e.target.value)}
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
                checked={budgetMode === "avg_income"}
                onChange={() => setBudgetMode("avg_income")}
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
                checked={budgetMode === "fixed_income"}
                onChange={() => setBudgetMode("fixed_income")}
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
                    step="0.01"
                    min="0"
                    value={fixedIncome}
                    onChange={(e) => setFixedIncome(e.target.value)}
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
                  step="1"
                  min="0"
                  max="100"
                  value={savingsPercent}
                  onChange={(e) => setSavingsPercent(e.target.value)}
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
                  step="1"
                  min="1"
                  max="200"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className={`${inputClass} w-24`}
                />
                <span className="text-slate-500">% do orçamento</span>
              </span>
            </label>
            <div className="ml-auto flex items-center gap-3">
              {budgetSaved && (
                <span className="text-sm font-medium text-emerald-400">
                  ✓ Salvo
                </span>
              )}
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
              >
                Salvar orçamento
              </button>
            </div>
          </div>
        </form>
      </Card>

      {/* ===== Conexão Pluggy + Telegram ===== */}
      <Card>
        <CardTitle>Conexão Pluggy</CardTitle>
        <p className="mt-1 text-sm text-slate-400">
          Credenciais usadas para sincronizar contas, transações e faturas via
          Open Finance. Ficam salvas <strong>somente neste aparelho</strong>.
        </p>

        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <ConnectBankButton
            onConnected={async () => {
              const s = await getSettings();
              setPluggyItemIds(s.pluggyItemIds ?? "");
            }}
          />
        </div>

        <form onSubmit={saveConnection} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-400">
                Client ID
              </span>
              <input
                type="text"
                value={pluggyClientId}
                onChange={(e) => setPluggyClientId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                autoComplete="off"
                className={`${inputClass} w-full`}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-400">
                Client Secret
              </span>
              <input
                type="password"
                value={pluggyClientSecret}
                onChange={(e) => setPluggyClientSecret(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="off"
                className={`${inputClass} w-full`}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-400">
              Item IDs (um por conexão bancária, separados por vírgula)
            </span>
            <textarea
              value={pluggyItemIds}
              onChange={(e) => setPluggyItemIds(e.target.value)}
              rows={3}
              placeholder="11111111-1111-1111-1111-111111111111, 22222222-2222-2222-2222-222222222222"
              className={`${inputClass} w-full font-mono text-xs leading-5`}
            />
          </label>

          <div className="border-t border-slate-800 pt-4">
            <p className="text-sm font-medium text-slate-200">
              Telegram (opcional)
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Receba alertas de orçamento e faturas no Telegram.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs text-slate-400">
                  Bot Token
                </span>
                <input
                  type="password"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="123456:ABC-DEF..."
                  autoComplete="off"
                  className={`${inputClass} w-full`}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-slate-400">
                  Chat ID
                </span>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="123456789"
                  autoComplete="off"
                  className={`${inputClass} w-full`}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {connectionSaved && (
              <span className="text-sm font-medium text-emerald-400">
                ✓ Salvo
              </span>
            )}
            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
            >
              Salvar conexão
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
                        <button
                          type="button"
                          onClick={() => toggleRecurring(r.id!, r.active)}
                          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800"
                        >
                          {r.active ? "desativar" : "ativar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRecurring(r.id!)}
                          className="rounded-md border border-rose-500/30 px-2 py-1 text-xs text-rose-400 transition-colors hover:bg-rose-500/10"
                        >
                          excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form
          onSubmit={addRecurring}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-800 pt-4"
        >
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-400">Nome</span>
            <input
              type="text"
              required
              value={recName}
              onChange={(e) => setRecName(e.target.value)}
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
              step="0.01"
              min="0.01"
              required
              value={recAmount}
              onChange={(e) => setRecAmount(e.target.value)}
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
              min="1"
              max="31"
              required
              value={recDay}
              onChange={(e) => setRecDay(e.target.value)}
              placeholder="10"
              className={`${inputClass} w-20`}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-400">
              Categoria
            </span>
            <select
              value={recCategory}
              onChange={(e) => setRecCategory(e.target.value)}
              className={inputClass}
            >
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
                <button
                  type="button"
                  title="Excluir regra"
                  onClick={() => deleteRule(rule.id!)}
                  className="rounded-md px-1.5 py-0.5 text-xs text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={addRule}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-800 pt-4"
        >
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-400">
              Padrão (contém na descrição)
            </span>
            <input
              type="text"
              required
              value={rulePattern}
              onChange={(e) => setRulePattern(e.target.value)}
              placeholder="ifood"
              className={`${inputClass} w-44`}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-400">
              Categoria
            </span>
            <select
              value={ruleCategory}
              onChange={(e) => setRuleCategory(e.target.value)}
              className={inputClass}
            >
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
            Nenhuma conta sincronizada ainda. Preencha a Conexão Pluggy acima e
            toque em <strong>🔄 Sincronizar</strong> no Dashboard.
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

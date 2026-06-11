import { db, getSettings } from "./db";

// Categorias que não contam como gasto/ganho no orçamento
// (evita contar duas vezes: a compra no cartão já conta, o pagamento da fatura não)
export const EXCLUDED_CATEGORIES = [
  "Pagamento de cartão",
  "Transferência entre contas",
];

export type BudgetMode = "goal" | "avg_income" | "fixed_income";

export interface MonthlySummary {
  year: number;
  month: number; // 1-12
  budget: number | null; // null = sem orçamento configurado
  mode: BudgetMode;
  spent: number; // total gasto no mês (positivo)
  income: number; // total ganho no mês
  upcomingRecurring: number; // recorrentes ainda não ocorridos neste mês
  remaining: number | null; // budget - spent - upcomingRecurring
  percentUsed: number | null; // spent / budget * 100
  byCategory: { category: string; total: number }[];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Intervalo [start, end) do mês como strings ISO (yyyy-mm-dd).
 * Comparação lexicográfica funciona tanto para datas "yyyy-mm-dd" quanto
 * para ISO completo ("yyyy-mm-ddThh:mm:ss...").
 */
export function monthRange(year: number, month: number) {
  const start = `${year}-${pad2(month)}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = `${nextYear}-${pad2(nextMonth)}-01`;
  return { start, end };
}

async function monthTransactions(year: number, month: number) {
  const { start, end } = monthRange(year, month);
  return db.transactions.where("date").between(start, end, true, false).toArray();
}

export async function getMonthlySpending(year: number, month: number) {
  const txs = await monthTransactions(year, month);
  const sum = txs
    .filter((t) => t.amount < 0 && !EXCLUDED_CATEGORIES.includes(t.category))
    .reduce((acc, t) => acc + t.amount, 0);
  return -sum || 0;
}

export async function getMonthlyIncome(year: number, month: number) {
  const txs = await monthTransactions(year, month);
  return txs
    .filter((t) => t.amount > 0 && !EXCLUDED_CATEGORIES.includes(t.category))
    .reduce((acc, t) => acc + t.amount, 0);
}

// Média de ganhos dos últimos `months` meses completos (exclui o mês atual)
export async function getAverageMonthlyIncome(
  year: number,
  month: number,
  months = 3
) {
  let total = 0;
  let counted = 0;
  for (let i = 1; i <= months; i++) {
    const d = new Date(year, month - 1 - i, 1);
    const income = await getMonthlyIncome(d.getFullYear(), d.getMonth() + 1);
    if (income > 0) {
      total += income;
      counted++;
    }
  }
  return counted > 0 ? total / counted : 0;
}

// Soma dos gastos recorrentes ativos que ainda não ocorreram neste mês
// (só faz sentido para o mês corrente; para meses passados retorna 0)
export async function getUpcomingRecurring(
  year: number,
  month: number,
  today = new Date()
) {
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;
  if (!isCurrentMonth) return 0;
  const recurring = await db.recurring.toArray();
  return recurring
    .filter((r) => r.active && r.dayOfMonth > today.getDate())
    .reduce((sum, r) => sum + r.amount, 0);
}

export async function getBudget(year: number, month: number) {
  const settings = await getSettings();
  const mode = settings.budgetMode as BudgetMode;
  const factor = 1 - settings.savingsPercent / 100;

  if (mode === "goal") {
    return { mode, budget: settings.goalAmount ?? null };
  }
  if (mode === "fixed_income") {
    return {
      mode,
      budget: settings.fixedIncome ? settings.fixedIncome * factor : null,
    };
  }
  // avg_income
  const avg = await getAverageMonthlyIncome(year, month);
  return { mode, budget: avg > 0 ? avg * factor : null };
}

export async function getSpendingByCategory(year: number, month: number) {
  const txs = await monthTransactions(year, month);
  const totals = new Map<string, number>();
  for (const t of txs) {
    if (t.amount >= 0 || EXCLUDED_CATEGORIES.includes(t.category)) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) - t.amount);
  }
  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export async function getMonthlySummary(
  year: number,
  month: number
): Promise<MonthlySummary> {
  const [{ mode, budget }, spent, income, upcomingRecurring, byCategory] =
    await Promise.all([
      getBudget(year, month),
      getMonthlySpending(year, month),
      getMonthlyIncome(year, month),
      getUpcomingRecurring(year, month),
      getSpendingByCategory(year, month),
    ]);

  return {
    year,
    month,
    budget,
    mode,
    spent,
    income,
    upcomingRecurring,
    remaining: budget !== null ? budget - spent - upcomingRecurring : null,
    percentUsed: budget !== null && budget > 0 ? (spent / budget) * 100 : null,
    byCategory,
  };
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

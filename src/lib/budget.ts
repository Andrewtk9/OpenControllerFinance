import { prisma } from "./db";

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

export function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export async function getMonthlySpending(year: number, month: number) {
  const { start, end } = monthRange(year, month);
  const result = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      date: { gte: start, lt: end },
      amount: { lt: 0 },
      category: { notIn: EXCLUDED_CATEGORIES },
    },
  });
  return -(result._sum.amount ?? 0);
}

export async function getMonthlyIncome(year: number, month: number) {
  const { start, end } = monthRange(year, month);
  const result = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      date: { gte: start, lt: end },
      amount: { gt: 0 },
      category: { notIn: EXCLUDED_CATEGORIES },
    },
  });
  return result._sum.amount ?? 0;
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
  const recurring = await prisma.recurringExpense.findMany({
    where: { active: true, dayOfMonth: { gt: today.getDate() } },
  });
  return recurring.reduce((sum, r) => sum + r.amount, 0);
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
  const { start, end } = monthRange(year, month);
  const grouped = await prisma.transaction.groupBy({
    by: ["category"],
    _sum: { amount: true },
    where: {
      date: { gte: start, lt: end },
      amount: { lt: 0 },
      category: { notIn: EXCLUDED_CATEGORIES },
    },
  });
  return grouped
    .map((g) => ({ category: g.category, total: -(g._sum.amount ?? 0) }))
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

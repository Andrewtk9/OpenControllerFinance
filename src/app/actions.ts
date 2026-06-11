"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/components/categories";

function isValidCategory(category: string) {
  return (CATEGORIES as readonly string[]).includes(category);
}

// ---------- Transações ----------

export async function updateTransactionCategory(
  transactionId: string,
  category: string
) {
  if (!isValidCategory(category)) return;
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { category, categorySource: "manual" },
  });
  revalidatePath("/transacoes");
  revalidatePath("/");
  revalidatePath("/analise");
}

// Extrai a primeira palavra significativa (>3 letras) da descrição
function significantPattern(description: string): string | null {
  const tokens = description
    .toLowerCase()
    .replace(/[*\d]/g, " ")
    .split(/[^a-zà-ú]+/i)
    .filter(Boolean);
  return tokens.find((t) => t.length > 3) ?? null;
}

// Cria uma CategoryRule a partir de uma transação e recategoriza similares
export async function createRuleFromTransaction(formData: FormData) {
  const transactionId = String(formData.get("transactionId") ?? "");
  if (!transactionId) return;

  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });
  if (!tx) return;

  const pattern = significantPattern(tx.description);
  if (!pattern) return;

  const existing = await prisma.categoryRule.findFirst({
    where: { pattern, category: tx.category },
  });
  if (!existing) {
    await prisma.categoryRule.create({
      data: { pattern, category: tx.category, priority: 10 },
    });
  }

  // Recategoriza transações ainda em "Outros" ou categorizadas pela Pluggy
  // que casem com o pattern (contains no SQLite é case-insensitive p/ ASCII)
  await prisma.transaction.updateMany({
    where: {
      description: { contains: pattern },
      OR: [{ category: "Outros" }, { categorySource: "pluggy" }],
    },
    data: { category: tx.category, categorySource: "rule" },
  });

  revalidatePath("/transacoes");
  revalidatePath("/");
  revalidatePath("/analise");
  revalidatePath("/config");
}

// ---------- Configurações ----------

export async function saveSettings(formData: FormData) {
  const budgetMode = String(formData.get("budgetMode") ?? "goal");
  const mode = ["goal", "avg_income", "fixed_income"].includes(budgetMode)
    ? budgetMode
    : "goal";

  const parseNum = (key: string): number | null => {
    const raw = String(formData.get(key) ?? "").replace(",", ".").trim();
    if (!raw) return null;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const goalAmount = parseNum("goalAmount");
  const fixedIncome = parseNum("fixedIncome");
  const savingsPercentRaw = parseNum("savingsPercent");
  const savingsPercent =
    savingsPercentRaw !== null ? Math.min(100, savingsPercentRaw) : 20;
  const alertRaw = parseNum("alertThreshold");
  const alertThreshold =
    alertRaw !== null ? Math.min(200, Math.max(1, Math.round(alertRaw))) : 80;

  await prisma.settings.upsert({
    where: { id: 1 },
    update: { budgetMode: mode, goalAmount, fixedIncome, savingsPercent, alertThreshold },
    create: {
      id: 1,
      budgetMode: mode,
      goalAmount,
      fixedIncome,
      savingsPercent,
      alertThreshold,
    },
  });

  revalidatePath("/config");
  revalidatePath("/");
}

// ---------- Gastos recorrentes ----------

export async function addRecurringExpense(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseFloat(
    String(formData.get("amount") ?? "").replace(",", ".")
  );
  const dayOfMonth = parseInt(String(formData.get("dayOfMonth") ?? ""), 10);
  const category = String(formData.get("category") ?? "Outros");

  if (!name || !Number.isFinite(amount) || amount <= 0) return;
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31)
    return;

  await prisma.recurringExpense.create({
    data: {
      name,
      amount,
      dayOfMonth,
      category: isValidCategory(category) ? category : "Outros",
    },
  });

  revalidatePath("/config");
  revalidatePath("/");
}

export async function toggleRecurringExpense(formData: FormData) {
  const id = parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isInteger(id)) return;
  const current = await prisma.recurringExpense.findUnique({ where: { id } });
  if (!current) return;
  await prisma.recurringExpense.update({
    where: { id },
    data: { active: !current.active },
  });
  revalidatePath("/config");
  revalidatePath("/");
}

export async function deleteRecurringExpense(formData: FormData) {
  const id = parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isInteger(id)) return;
  await prisma.recurringExpense.delete({ where: { id } }).catch(() => {});
  revalidatePath("/config");
  revalidatePath("/");
}

// ---------- Regras de categorização ----------

export async function addCategoryRule(formData: FormData) {
  const pattern = String(formData.get("pattern") ?? "")
    .trim()
    .toLowerCase();
  const category = String(formData.get("category") ?? "");
  if (!pattern || !isValidCategory(category)) return;

  await prisma.categoryRule.create({
    data: { pattern, category, priority: 10 },
  });

  // Aplica imediatamente em transações sem categoria manual
  await prisma.transaction.updateMany({
    where: {
      description: { contains: pattern },
      OR: [{ category: "Outros" }, { categorySource: "pluggy" }],
    },
    data: { category, categorySource: "rule" },
  });

  revalidatePath("/config");
  revalidatePath("/transacoes");
  revalidatePath("/");
}

export async function deleteCategoryRule(formData: FormData) {
  const id = parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isInteger(id)) return;
  await prisma.categoryRule.delete({ where: { id } }).catch(() => {});
  revalidatePath("/config");
}

// ---------- Notificações ----------

export async function markNotificationRead(formData: FormData) {
  const id = parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isInteger(id)) return;
  await prisma.notification.update({ where: { id }, data: { read: true } });
  revalidatePath("/notificacoes");
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  await prisma.notification.updateMany({
    where: { read: false },
    data: { read: true },
  });
  revalidatePath("/notificacoes");
  revalidatePath("/", "layout");
}

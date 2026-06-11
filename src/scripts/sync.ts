import "dotenv/config";
import type {
  Account as PluggyAccount,
  Transaction as PluggyTransaction,
} from "pluggy-sdk";
import { prisma } from "../lib/db";
import {
  getPluggyClient,
  getItemIds,
  hasPluggyCredentials,
} from "../lib/pluggy";
import { categorize, type DbRule } from "../lib/categorize";
import { createNotification, sendTelegram } from "../lib/notify";
import {
  getMonthlySummary,
  getSettings,
  formatBRL,
} from "../lib/budget";

const FIRST_SYNC_DAYS = 90; // janela inicial
const RESYNC_OVERLAP_DAYS = 7; // sobreposição para pegar atualizações

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(days: number, from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Convenção de sinal do DB: gasto = NEGATIVO, ganho = POSITIVO.
 * - Conta bancária (BANK): a Pluggy marca a direção em `type` (DEBIT = saída,
 *   CREDIT = entrada). Normalizamos pelo type, independente do sinal recebido.
 * - Cartão (CREDIT): a Pluggy costuma trazer compra com valor POSITIVO e
 *   pagamento/estorno NEGATIVO — então invertemos o sinal.
 */
function normalizeAmount(
  accountType: string,
  tx: PluggyTransaction
): number {
  const raw = tx.amount ?? 0;
  if (accountType === "CREDIT") {
    return -raw;
  }
  // BANK: usa a direção declarada pela Pluggy
  if (tx.type === "DEBIT") return -Math.abs(raw);
  if (tx.type === "CREDIT") return Math.abs(raw);
  return raw;
}

async function upsertAccount(itemId: string, bankName: string, acc: PluggyAccount) {
  const credit = acc.creditData;
  const closeDay = credit?.balanceCloseDate
    ? new Date(credit.balanceCloseDate).getDate()
    : null;
  const dueDay = credit?.balanceDueDate
    ? new Date(credit.balanceDueDate).getDate()
    : null;

  const data = {
    itemId,
    bankName,
    type: acc.type,
    subtype: acc.subtype ?? null,
    name: acc.name,
    number: acc.number ?? null,
    balance: acc.balance ?? 0,
    currencyCode: acc.currencyCode ?? "BRL",
    creditLimit: credit?.creditLimit ?? null,
    availableLimit: credit?.availableCreditLimit ?? null,
    closeDay,
    dueDay,
  };

  await prisma.account.upsert({
    where: { id: acc.id },
    update: data,
    create: { id: acc.id, ...data },
  });
}

async function syncTransactions(
  acc: PluggyAccount,
  dbRules: DbRule[]
): Promise<number> {
  const client = getPluggyClient();

  // from = 90 dias atrás na 1ª execução; depois, última transação - 7 dias
  const latest = await prisma.transaction.findFirst({
    where: { accountId: acc.id },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  const fromDate = latest
    ? daysAgo(RESYNC_OVERLAP_DAYS, latest.date)
    : daysAgo(FIRST_SYNC_DAYS);
  const dateFrom = toISODate(fromDate);

  console.log(`    Buscando transações desde ${dateFrom}...`);
  const transactions = await client.fetchAllTransactions(acc.id, { dateFrom });
  console.log(`    ${transactions.length} transações retornadas pela Pluggy`);

  let newCount = 0;
  for (const tx of transactions) {
    const amount = normalizeAmount(acc.type, tx);
    const { category, source } = categorize(
      tx.description ?? "",
      tx.category,
      dbRules
    );

    const existing = await prisma.transaction.findUnique({
      where: { id: tx.id },
      select: { id: true, categorySource: true },
    });

    const base = {
      accountId: acc.id,
      date: new Date(tx.date),
      description: tx.description ?? tx.descriptionRaw ?? "",
      amount,
      currencyCode: tx.currencyCode ?? "BRL",
      pluggyCategory: tx.category ?? null,
      status: tx.status ?? null,
    };

    if (!existing) {
      await prisma.transaction.create({
        data: { id: tx.id, ...base, category, categorySource: source },
      });
      newCount++;
    } else {
      // não sobrescreve categoria ajustada manualmente pelo usuário
      const keepManual = existing.categorySource === "manual";
      await prisma.transaction.update({
        where: { id: tx.id },
        data: keepManual
          ? base
          : { ...base, category, categorySource: source },
      });
    }
  }
  return newCount;
}

async function syncBills(acc: PluggyAccount): Promise<void> {
  const client = getPluggyClient();
  try {
    const page = await client.fetchCreditCardBills(acc.id, { pageSize: 100 });
    const bills = page.results ?? [];
    console.log(`    ${bills.length} faturas retornadas pela Pluggy`);

    for (const bill of bills) {
      const payments = bill.payments ?? [];
      const paymentsTotal = payments.reduce(
        (sum, p) => sum + Math.abs(p.amount ?? 0),
        0
      );
      const paid =
        payments.some((p) => p.valueType === "FULL_PAYMENT") ||
        (bill.totalAmount > 0 && paymentsTotal >= bill.totalAmount - 0.01);

      const data = {
        accountId: acc.id,
        dueDate: new Date(bill.dueDate),
        totalAmount: bill.totalAmount ?? 0,
        minimumPayment: bill.minimumPaymentAmount ?? null,
        paid,
      };

      await prisma.creditCardBill.upsert({
        where: { id: bill.id },
        update: data,
        // closeDate não vem na API de bills da Pluggy — fica null
        create: { id: bill.id, ...data, closeDate: null },
      });
    }
  } catch (error) {
    // alguns conectores não expõem faturas — não pode abortar o resto
    console.warn(
      `    Aviso: não foi possível sincronizar faturas da conta ${acc.name}:`,
      error instanceof Error ? error.message : error
    );
  }
}

async function runAlerts(): Promise<void> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  const [settings, summary] = await Promise.all([
    getSettings(),
    getMonthlySummary(year, month),
  ]);

  // Alertas de orçamento
  if (summary.percentUsed !== null && summary.budget !== null) {
    const pct = summary.percentUsed;

    if (pct >= 100) {
      const created = await createNotification({
        type: "budget_exceeded",
        dedupeKey: `budget_exceeded-${monthKey}`,
        title: "Orçamento estourado!",
        body: `Você gastou ${formatBRL(summary.spent)} este mês (${pct.toFixed(
          0
        )}% do orçamento de ${formatBRL(summary.budget)}).`,
      });
      if (created) {
        console.log("  Alerta criado: orçamento estourado");
        await sendTelegram(
          `🚨 Orçamento estourado!\nVocê gastou ${formatBRL(
            summary.spent
          )} este mês (${pct.toFixed(0)}% do orçamento de ${formatBRL(
            summary.budget
          )}).`
        );
      }
    } else if (pct >= settings.alertThreshold) {
      const created = await createNotification({
        type: "budget_alert",
        dedupeKey: `budget_alert-${monthKey}`,
        title: "Atenção ao orçamento",
        body: `Você já usou ${pct.toFixed(0)}% do orçamento do mês (${formatBRL(
          summary.spent
        )} de ${formatBRL(summary.budget)}).`,
      });
      if (created) {
        console.log("  Alerta criado: limiar de orçamento atingido");
        await sendTelegram(
          `⚠️ Atenção ao orçamento\nVocê já usou ${pct.toFixed(
            0
          )}% do orçamento do mês (${formatBRL(summary.spent)} de ${formatBRL(
            summary.budget
          )}).`
        );
      }
    }
  }

  // Faturas não pagas vencendo em <= 3 dias
  const startOfToday = new Date(year, now.getMonth(), now.getDate());
  const in3Days = new Date(startOfToday);
  in3Days.setDate(in3Days.getDate() + 3);
  in3Days.setHours(23, 59, 59, 999);

  const dueBills = await prisma.creditCardBill.findMany({
    where: {
      paid: false,
      dueDate: { gte: startOfToday, lte: in3Days },
    },
    include: { account: true },
  });

  for (const bill of dueBills) {
    const dueStr = bill.dueDate.toLocaleDateString("pt-BR");
    const created = await createNotification({
      type: "bill_due",
      dedupeKey: `bill_due-${bill.id}`,
      title: `Fatura do ${bill.account.bankName} vence em breve`,
      body: `Fatura de ${formatBRL(bill.totalAmount)} vence em ${dueStr}.`,
    });
    if (created) {
      console.log(
        `  Alerta criado: fatura do ${bill.account.bankName} vence ${dueStr}`
      );
      await sendTelegram(
        `💳 Fatura do ${bill.account.bankName} vence em ${dueStr}: ${formatBRL(
          bill.totalAmount
        )}.`
      );
    }
  }
}

async function main() {
  console.log("=== OpenControllerFinance — Sincronização Pluggy ===\n");

  if (!hasPluggyCredentials() || getItemIds().length === 0) {
    console.error("Credenciais da Pluggy não configuradas.\n");
    console.error("Para sincronizar seus bancos, configure no arquivo .env:");
    console.error("  PLUGGY_CLIENT_ID=seu-client-id");
    console.error("  PLUGGY_CLIENT_SECRET=seu-client-secret");
    console.error(
      "  PLUGGY_ITEM_IDS=uuid-do-item-1,uuid-do-item-2  (um por banco conectado)"
    );
    console.error("\nOpcional (alertas via Telegram):");
    console.error("  TELEGRAM_BOT_TOKEN=token-do-bot");
    console.error("  TELEGRAM_CHAT_ID=seu-chat-id");
    console.error(
      "\nObtenha as credenciais em https://dashboard.pluggy.ai e conecte seus bancos via MeuPluggy (https://meu.pluggy.ai)."
    );
    process.exit(1);
  }

  const client = getPluggyClient();
  const itemIds = getItemIds();
  const dbRules: DbRule[] = await prisma.categoryRule.findMany({
    orderBy: { priority: "desc" },
    select: { pattern: true, category: true, priority: true },
  });
  console.log(
    `${itemIds.length} conexão(ões) configurada(s), ${dbRules.length} regra(s) de categoria no DB.\n`
  );

  let totalNew = 0;
  let accountCount = 0;
  const errors: string[] = [];

  for (const itemId of itemIds) {
    try {
      const item = await client.fetchItem(itemId);
      const bankName = item.connector?.name ?? "Banco";
      console.log(`Sincronizando ${bankName} (item ${itemId})...`);
      if (item.status === "LOGIN_ERROR") {
        console.warn(
          `  Aviso: conexão com ${bankName} precisa ser atualizada (LOGIN_ERROR). Tentando ler dados existentes mesmo assim.`
        );
      }

      const accountsPage = await client.fetchAccounts(itemId);
      const accounts = accountsPage.results ?? [];
      console.log(`  ${accounts.length} conta(s) encontrada(s).`);

      for (const acc of accounts) {
        console.log(
          `  Conta: ${acc.name} (${acc.type}) — saldo ${formatBRL(
            acc.balance ?? 0
          )}`
        );
        await upsertAccount(itemId, bankName, acc);

        const newTx = await syncTransactions(acc, dbRules);
        totalNew += newTx;
        accountCount++;
        console.log(`    ${newTx} transação(ões) nova(s).`);

        if (acc.type === "CREDIT") {
          await syncBills(acc);
        }
      }
      console.log(`Concluído: ${bankName}.\n`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Erro ao sincronizar item ${itemId}: ${msg}\n`);
      errors.push(`item ${itemId}: ${msg}`);
    }
  }

  console.log("Verificando alertas...");
  try {
    await runAlerts();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Erro ao processar alertas: ${msg}`);
    errors.push(`alertas: ${msg}`);
  }

  const status = errors.length === 0 ? "ok" : "error";
  const message =
    errors.length === 0
      ? `Sincronizadas ${accountCount} conta(s), ${totalNew} transação(ões) nova(s).`
      : `Erros: ${errors.join(" | ")}`;

  await prisma.syncLog.create({
    data: { status, newTransactions: totalNew, message },
  });

  console.log(
    `\n=== Sincronização finalizada (${status}): ${totalNew} transação(ões) nova(s) ===`
  );
  if (errors.length > 0) process.exitCode = 1;
}

main()
  .catch(async (error) => {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Erro fatal na sincronização:", msg);
    try {
      await prisma.syncLog.create({
        data: { status: "error", newTransactions: 0, message: msg },
      });
    } catch {
      // ignora falha ao logar
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

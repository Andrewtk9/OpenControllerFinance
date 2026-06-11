import {
  db,
  getSettings,
  type Account,
  type CreditCardBill,
  type Transaction,
} from "./db";
import {
  pluggyAuth,
  fetchItem,
  fetchAccounts,
  fetchTransactions,
  fetchBills,
  type PluggyAccount,
  type PluggyTransaction,
} from "./pluggy";
import { categorize, type DbRule } from "../categorize";
import { createNotification, sendTelegram } from "./notify";
import { getMonthlySummary, formatBRL } from "./budget";

const FIRST_SYNC_DAYS = 90; // janela inicial
const RESYNC_OVERLAP_DAYS = 7; // sobreposição para pegar atualizações
const TX_PAGE_SIZE = 500;

export interface SyncResult {
  status: "ok" | "error" | "partial";
  newTransactions: number;
  accounts: number;
  errors: string[];
  message: string;
}

type Progress = (msg: string) => void;

/**
 * Lançado quando as credenciais da Pluggy (ou os item ids) não estão
 * configuradas em Settings. Quem decide como reagir (abrir a tela de
 * configurações, mostrar aviso, etc.) é o chamador.
 */
export class MissingPluggyCredentialsError extends Error {
  constructor() {
    super(
      "Credenciais da Pluggy não configuradas. Informe Client ID, Client Secret e Item IDs nas configurações."
    );
    this.name = "MissingPluggyCredentialsError";
  }
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(days: number, from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
}

function parseItemIds(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Convenção de sinal do DB: gasto = NEGATIVO, ganho = POSITIVO.
 * - Conta bancária (BANK): a Pluggy marca a direção em `type` (DEBIT = saída,
 *   CREDIT = entrada). Normalizamos pelo type, independente do sinal recebido.
 * - Cartão (CREDIT): a Pluggy costuma trazer compra com valor POSITIVO e
 *   pagamento/estorno NEGATIVO — então invertemos o sinal.
 */
function normalizeAmount(accountType: string, tx: PluggyTransaction): number {
  const raw = tx.amount ?? 0;
  if (accountType === "CREDIT") {
    return -raw;
  }
  // BANK: usa a direção declarada pela Pluggy
  if (tx.type === "DEBIT") return -Math.abs(raw);
  if (tx.type === "CREDIT") return Math.abs(raw);
  return raw;
}

function toAccountRecord(
  itemId: string,
  bankName: string,
  acc: PluggyAccount
): Account {
  const credit = acc.creditData;
  const closeDay = credit?.balanceCloseDate
    ? new Date(credit.balanceCloseDate).getDate()
    : undefined;
  const dueDay = credit?.balanceDueDate
    ? new Date(credit.balanceDueDate).getDate()
    : undefined;

  return {
    id: acc.id,
    itemId,
    bankName,
    type: acc.type === "CREDIT" ? "CREDIT" : "BANK",
    subtype: acc.subtype ?? undefined,
    name: acc.name,
    number: acc.number ?? undefined,
    balance: acc.balance ?? 0,
    currencyCode: acc.currencyCode ?? "BRL",
    creditLimit: credit?.creditLimit ?? undefined,
    availableLimit: credit?.availableCreditLimit ?? undefined,
    closeDay,
    dueDay,
    updatedAt: new Date().toISOString(),
  };
}

async function fetchAllTransactions(
  accountId: string,
  from: string
): Promise<PluggyTransaction[]> {
  const all: PluggyTransaction[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await fetchTransactions(accountId, {
      from,
      page,
      pageSize: TX_PAGE_SIZE,
    });
    all.push(...(res.results ?? []));
    totalPages = res.totalPages ?? 1;
    page++;
  } while (page <= totalPages);
  return all;
}

async function syncTransactions(
  acc: PluggyAccount,
  dbRules: DbRule[],
  log: Progress
): Promise<number> {
  // from = 90 dias atrás na 1ª execução; depois, última transação - 7 dias
  const existingForAccount = await db.transactions
    .where("accountId")
    .equals(acc.id)
    .toArray();
  let latestDate: string | null = null;
  for (const t of existingForAccount) {
    if (!latestDate || t.date > latestDate) latestDate = t.date;
  }
  const fromDate = latestDate
    ? daysAgo(RESYNC_OVERLAP_DAYS, new Date(latestDate))
    : daysAgo(FIRST_SYNC_DAYS);
  const dateFrom = toISODate(fromDate);

  log(`    Buscando transações desde ${dateFrom}...`);
  const transactions = await fetchAllTransactions(acc.id, dateFrom);
  log(`    ${transactions.length} transações retornadas pela Pluggy`);

  // lê as existentes antes do bulkPut para preservar categorias manuais
  const ids = transactions.map((tx) => tx.id);
  const existingList = await db.transactions.bulkGet(ids);
  const existingMap = new Map<string, Transaction>();
  existingList.forEach((e) => {
    if (e) existingMap.set(e.id, e);
  });

  let newCount = 0;
  const records: Transaction[] = [];
  for (const tx of transactions) {
    const amount = normalizeAmount(acc.type, tx);
    const { category, source } = categorize(
      tx.description ?? "",
      tx.category,
      dbRules
    );

    const existing = existingMap.get(tx.id);
    if (!existing) newCount++;
    // não sobrescreve categoria ajustada manualmente pelo usuário
    const keepManual = existing?.categorySource === "manual";

    records.push({
      id: tx.id,
      accountId: acc.id,
      date: new Date(tx.date).toISOString(),
      description: tx.description ?? tx.descriptionRaw ?? "",
      amount,
      currencyCode: tx.currencyCode ?? "BRL",
      pluggyCategory: tx.category ?? null,
      category: keepManual && existing ? existing.category : category,
      categorySource: keepManual ? "manual" : source,
      status: tx.status ?? undefined,
    });
  }

  await db.transactions.bulkPut(records);
  return newCount;
}

async function syncBills(acc: PluggyAccount, log: Progress): Promise<void> {
  try {
    const bills = await fetchBills(acc.id);
    log(`    ${bills.length} faturas retornadas pela Pluggy`);

    const records: CreditCardBill[] = bills.map((bill) => {
      const payments = bill.payments ?? [];
      const paymentsTotal = payments.reduce(
        (sum, p) => sum + Math.abs(p.amount ?? 0),
        0
      );
      const totalAmount = bill.totalAmount ?? 0;
      const paid =
        payments.some((p) => p.valueType === "FULL_PAYMENT") ||
        (totalAmount > 0 && paymentsTotal >= totalAmount - 0.01);

      return {
        id: bill.id,
        accountId: acc.id,
        dueDate: new Date(bill.dueDate).toISOString(),
        // closeDate não vem na API de bills da Pluggy — fica null
        closeDate: null,
        totalAmount,
        minimumPayment: bill.minimumPaymentAmount ?? null,
        paid,
      };
    });

    await db.bills.bulkPut(records);
  } catch (error) {
    // alguns conectores não expõem faturas — não pode abortar o resto
    const msg = error instanceof Error ? error.message : String(error);
    log(
      `    Aviso: não foi possível sincronizar faturas da conta ${acc.name}: ${msg}`
    );
  }
}

async function runAlerts(log: Progress): Promise<void> {
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
        log("  Alerta criado: orçamento estourado");
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
        log("  Alerta criado: limiar de orçamento atingido");
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

  const allBills = await db.bills.toArray();
  const dueBills = allBills.filter((bill) => {
    if (bill.paid) return false;
    const due = new Date(bill.dueDate);
    return due >= startOfToday && due <= in3Days;
  });

  for (const bill of dueBills) {
    const account = await db.accounts.get(bill.accountId);
    const bankName = account?.bankName ?? "cartão";
    const dueStr = new Date(bill.dueDate).toLocaleDateString("pt-BR");
    const created = await createNotification({
      type: "bill_due",
      dedupeKey: `bill_due-${bill.id}`,
      title: `Fatura do ${bankName} vence em breve`,
      body: `Fatura de ${formatBRL(bill.totalAmount)} vence em ${dueStr}.`,
    });
    if (created) {
      log(`  Alerta criado: fatura do ${bankName} vence ${dueStr}`);
      await sendTelegram(
        `💳 Fatura do ${bankName} vence em ${dueStr}: ${formatBRL(
          bill.totalAmount
        )}.`
      );
    }
  }
}

async function doSync(
  clientId: string,
  clientSecret: string,
  allItemIds: string[],
  log: Progress
): Promise<SyncResult> {
  log("Autenticando na Pluggy...");
  await pluggyAuth(clientId, clientSecret);

  let itemIds = allItemIds;

  // Limite do plano Grátis: até 3 bancos conectados
  const settings = await getSettings();
  if (settings.plan === "free" && itemIds.length > 3) {
    log(
      "⚠️ Plano Grátis permite 3 bancos — sincronizando apenas os 3 primeiros. Veja /planos para ilimitado."
    );
    itemIds = itemIds.slice(0, 3);
  }

  const dbRules: DbRule[] = (
    await db.rules.orderBy("priority").reverse().toArray()
  ).map((r) => ({
    pattern: r.pattern,
    category: r.category,
    priority: r.priority,
  }));
  log(
    `${itemIds.length} conexão(ões) configurada(s), ${dbRules.length} regra(s) de categoria no DB.\n`
  );

  let totalNew = 0;
  let accountCount = 0;
  const errors: string[] = [];

  for (const itemId of itemIds) {
    try {
      const item = await fetchItem(itemId);
      const bankName = item.connector?.name ?? "Banco";
      log(`Sincronizando ${bankName} (item ${itemId})...`);
      if (item.status === "LOGIN_ERROR") {
        log(
          `  Aviso: conexão com ${bankName} precisa ser atualizada (LOGIN_ERROR). Tentando ler dados existentes mesmo assim.`
        );
      }

      const accounts = await fetchAccounts(itemId);
      log(`  ${accounts.length} conta(s) encontrada(s).`);

      await db.accounts.bulkPut(
        accounts.map((acc) => toAccountRecord(itemId, bankName, acc))
      );

      for (const acc of accounts) {
        log(
          `  Conta: ${acc.name} (${acc.type}) — saldo ${formatBRL(
            acc.balance ?? 0
          )}`
        );

        const newTx = await syncTransactions(acc, dbRules, log);
        totalNew += newTx;
        accountCount++;
        log(`    ${newTx} transação(ões) nova(s).`);

        if (acc.type === "CREDIT") {
          await syncBills(acc, log);
        }
      }
      log(`Concluído: ${bankName}.\n`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log(`Erro ao sincronizar item ${itemId}: ${msg}\n`);
      errors.push(`item ${itemId}: ${msg}`);
    }
  }

  log("Verificando alertas...");
  try {
    await runAlerts(log);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log(`Erro ao processar alertas: ${msg}`);
    errors.push(`alertas: ${msg}`);
  }

  const status: SyncResult["status"] =
    errors.length === 0 ? "ok" : accountCount > 0 ? "partial" : "error";
  const message =
    errors.length === 0
      ? `Sincronizadas ${accountCount} conta(s), ${totalNew} transação(ões) nova(s).`
      : `Erros: ${errors.join(" | ")}`;

  await db.synclogs.add({
    ranAt: new Date().toISOString(),
    status,
    newTransactions: totalNew,
    message,
  });

  log(
    `\n=== Sincronização finalizada (${status}): ${totalNew} transação(ões) nova(s) ===`
  );

  return {
    status,
    newTransactions: totalNew,
    accounts: accountCount,
    errors,
    message,
  };
}

/**
 * Executa a sincronização completa no aparelho: auth → itens → contas →
 * transações → faturas → categorização → alertas → SyncLog.
 *
 * As credenciais vêm de Settings (pluggyClientId / pluggyClientSecret /
 * pluggyItemIds). Lança MissingPluggyCredentialsError se não estiverem
 * configuradas (quem decide como reagir é o chamador). Qualquer outro erro
 * fatal é capturado, registrado no SyncLog e devolvido como SyncResult com
 * status "error".
 *
 * @param onProgress recebe cada mensagem de progresso (além do console.log).
 */
export async function runSync(onProgress?: Progress): Promise<SyncResult> {
  const log: Progress = (msg) => {
    console.log(msg);
    try {
      onProgress?.(msg);
    } catch {
      // callback de progresso nunca derruba o sync
    }
  };

  log("=== OpenControllerFinance — Sincronização Pluggy ===\n");

  const settings = await getSettings();
  const clientId = settings.pluggyClientId?.trim();
  const clientSecret = settings.pluggyClientSecret?.trim();
  const itemIds = parseItemIds(settings.pluggyItemIds);

  if (!clientId || !clientSecret || itemIds.length === 0) {
    throw new MissingPluggyCredentialsError();
  }

  try {
    return await doSync(clientId, clientSecret, itemIds, log);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log(`Erro fatal na sincronização: ${msg}`);
    try {
      await db.synclogs.add({
        ranAt: new Date().toISOString(),
        status: "error",
        newTransactions: 0,
        message: msg,
      });
    } catch {
      // ignora falha ao logar
    }
    return {
      status: "error",
      newTransactions: 0,
      accounts: 0,
      errors: [msg],
      message: msg,
    };
  }
}

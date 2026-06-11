import Dexie, { type EntityTable } from "dexie";

// Banco de dados local do aparelho (IndexedDB via Dexie).
// Datas são strings ISO (yyyy-mm-dd ou ISO completo) — ordenáveis e indexáveis.

export interface Account {
  id: string; // pluggy account id
  itemId: string;
  bankName: string;
  type: "BANK" | "CREDIT";
  subtype?: string;
  name: string;
  number?: string;
  balance: number;
  currencyCode: string;
  creditLimit?: number;
  availableLimit?: number;
  closeDay?: number;
  dueDay?: number;
  updatedAt: string;
}

// Convenção de sinal: gasto = negativo, ganho = positivo
export interface Transaction {
  id: string; // pluggy transaction id
  accountId: string;
  date: string; // ISO
  description: string;
  amount: number;
  currencyCode: string;
  pluggyCategory?: string | null;
  category: string;
  categorySource: "rule" | "merchant" | "pluggy" | "fallback" | "manual";
  status?: string;
}

export interface CreditCardBill {
  id: string;
  accountId: string;
  dueDate: string; // ISO
  closeDate?: string | null;
  totalAmount: number;
  minimumPayment?: number | null;
  paid: boolean;
}

export interface CategoryRule {
  id?: number;
  pattern: string; // substring case-insensitive na descrição
  category: string;
  priority: number; // maior vence
}

export interface RecurringExpense {
  id?: number;
  name: string;
  amount: number; // sempre positivo
  dayOfMonth: number;
  category: string;
  active: boolean; // Dexie não indexa boolean — filtrar em memória
  createdAt: string;
}

export interface Settings {
  id: 1;
  budgetMode: "goal" | "avg_income" | "fixed_income";
  goalAmount?: number | null;
  fixedIncome?: number | null;
  savingsPercent: number; // orçamento = renda * (1 - savingsPercent/100)
  alertThreshold: number; // % do orçamento para alertar
  profileType?: "personal" | "business" | null; // null = onboarding pendente
  plan: "free" | "pro" | "business";
  planBilling?: "monthly" | "yearly" | null;
  // credenciais Pluggy (ficam SÓ neste aparelho)
  pluggyClientId?: string;
  pluggyClientSecret?: string;
  pluggyItemIds?: string; // separados por vírgula
  // Telegram opcional
  telegramBotToken?: string;
  telegramChatId?: string;
}

export interface AppNotification {
  id?: number;
  createdAt: string;
  type: string; // budget_alert | budget_exceeded | bill_due
  dedupeKey: string; // único — evita alerta repetido
  title: string;
  body: string;
  read: boolean;
}

export interface SyncLog {
  id?: number;
  ranAt: string;
  status: "ok" | "partial" | "error";
  newTransactions: number;
  message?: string;
}

export const db = new Dexie("OpenControllerFinance") as Dexie & {
  accounts: EntityTable<Account, "id">;
  transactions: EntityTable<Transaction, "id">;
  bills: EntityTable<CreditCardBill, "id">;
  rules: EntityTable<CategoryRule, "id">;
  recurring: EntityTable<RecurringExpense, "id">;
  settings: EntityTable<Settings, "id">;
  notifications: EntityTable<AppNotification, "id">;
  synclogs: EntityTable<SyncLog, "id">;
};

db.version(1).stores({
  accounts: "id, itemId, type",
  transactions: "id, date, category, accountId",
  bills: "id, accountId, dueDate",
  rules: "++id, priority",
  recurring: "++id",
  settings: "id",
  notifications: "++id, &dedupeKey, createdAt",
  synclogs: "++id, ranAt",
});

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  budgetMode: "goal",
  savingsPercent: 20,
  alertThreshold: 80,
  profileType: null,
  plan: "free",
};

// credenciais embutidas no APK via public/config.local.js (fora do git)
interface BakedConfig {
  pluggyClientId?: string;
  pluggyClientSecret?: string;
  pluggyItemIds?: string;
}

function bakedConfig(): BakedConfig {
  if (typeof window === "undefined") return {};
  return (window as unknown as { OCF_CONFIG?: BakedConfig }).OCF_CONFIG ?? {};
}

export async function getSettings(): Promise<Settings> {
  const baked = bakedConfig();
  const existing = await db.settings.get(1);
  if (existing) {
    // preenche credenciais embutidas se ainda não configuradas manualmente
    const fill: Partial<Settings> = {};
    if (!existing.pluggyClientId && baked.pluggyClientId)
      fill.pluggyClientId = baked.pluggyClientId;
    if (!existing.pluggyClientSecret && baked.pluggyClientSecret)
      fill.pluggyClientSecret = baked.pluggyClientSecret;
    if (!existing.pluggyItemIds && baked.pluggyItemIds)
      fill.pluggyItemIds = baked.pluggyItemIds;
    if (Object.keys(fill).length > 0) {
      await db.settings.update(1, fill);
      return { ...existing, ...fill };
    }
    return existing;
  }
  const seeded: Settings = { ...DEFAULT_SETTINGS, ...baked };
  await db.settings.put(seeded);
  return seeded;
}

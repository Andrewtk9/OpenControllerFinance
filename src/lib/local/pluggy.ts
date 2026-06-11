import { CapacitorHttp, type HttpResponse } from "@capacitor/core";

/**
 * Cliente REST da Pluggy (Open Finance via MeuPluggy) para rodar NO APARELHO.
 *
 * Usa CapacitorHttp (HTTP nativo, sem CORS) em vez do pluggy-sdk, que não
 * funciona no browser/WebView. Fluxo:
 *   1. pluggyAuth(clientId, clientSecret) -> obtém e guarda a apiKey
 *   2. fetchItem / fetchAccounts / fetchTransactions / fetchBills (X-API-KEY)
 */

const BASE_URL = "https://api.pluggy.ai";

// ---- Tipos mínimos das respostas da Pluggy ----

export interface PluggyConnector {
  id?: number;
  name?: string;
}

export interface PluggyItem {
  id: string;
  status?: string;
  connector?: PluggyConnector | null;
}

export interface PluggyCreditData {
  creditLimit?: number | null;
  availableCreditLimit?: number | null;
  balanceCloseDate?: string | null;
  balanceDueDate?: string | null;
}

export interface PluggyAccount {
  id: string;
  itemId?: string;
  type: string; // "BANK" | "CREDIT"
  subtype?: string | null;
  name: string;
  number?: string | null;
  balance?: number | null;
  currencyCode?: string | null;
  creditData?: PluggyCreditData | null;
}

export interface PluggyTransaction {
  id: string;
  accountId?: string;
  date: string;
  description?: string | null;
  descriptionRaw?: string | null;
  amount?: number | null;
  currencyCode?: string | null;
  category?: string | null;
  type?: string | null; // "DEBIT" | "CREDIT"
  status?: string | null;
}

export interface PluggyBillPayment {
  amount?: number | null;
  valueType?: string | null; // "FULL_PAYMENT" | "PARTIAL_PAYMENT" | ...
}

export interface PluggyBill {
  id: string;
  dueDate: string;
  totalAmount?: number | null;
  minimumPaymentAmount?: number | null;
  payments?: PluggyBillPayment[] | null;
}

export interface PluggyPage<T> {
  results: T[];
  totalPages: number;
  total?: number;
  page?: number;
}

// ---- Infra ----

let apiKey: string | null = null;

/** res.data já vem parseado pelo CapacitorHttp; se vier string, parseia. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseData(res: HttpResponse): any {
  const d = res.data;
  if (typeof d === "string") {
    try {
      return JSON.parse(d);
    } catch {
      return d;
    }
  }
  return d;
}

function ensureOk(res: HttpResponse, context: string): void {
  if (res.status >= 400) {
    const data = parseData(res);
    const detail =
      data && typeof data === "object"
        ? (data.message ?? data.error ?? JSON.stringify(data))
        : String(data ?? "");
    throw new Error(
      `Pluggy: ${context} falhou (HTTP ${res.status})${detail ? ` — ${detail}` : ""}`
    );
  }
}

function authHeaders(): Record<string, string> {
  if (!apiKey) {
    throw new Error(
      "Pluggy: não autenticado. Chame pluggyAuth(clientId, clientSecret) antes."
    );
  }
  return { "X-API-KEY": apiKey, "Content-Type": "application/json" };
}

async function apiGet(
  path: string,
  params: Record<string, string>,
  context: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const res = await CapacitorHttp.get({
    url: `${BASE_URL}${path}`,
    params,
    headers: authHeaders(),
  });
  ensureOk(res, context);
  return parseData(res);
}

// ---- API pública ----

/**
 * Autentica na Pluggy e guarda a apiKey para as chamadas seguintes.
 * @returns a apiKey obtida.
 */
export async function pluggyAuth(
  clientId: string,
  clientSecret: string
): Promise<string> {
  const res = await CapacitorHttp.post({
    url: `${BASE_URL}/auth`,
    headers: { "Content-Type": "application/json" },
    data: { clientId, clientSecret },
  });
  ensureOk(res, "autenticação");
  const data = parseData(res);
  if (!data || typeof data.apiKey !== "string" || !data.apiKey) {
    throw new Error("Pluggy: resposta de /auth não contém apiKey.");
  }
  apiKey = data.apiKey;
  return data.apiKey;
}

export async function fetchItem(id: string): Promise<PluggyItem> {
  return (await apiGet(`/items/${id}`, {}, `buscar item ${id}`)) as PluggyItem;
}

export async function fetchAccounts(itemId: string): Promise<PluggyAccount[]> {
  const data = await apiGet(
    "/accounts",
    { itemId },
    `buscar contas do item ${itemId}`
  );
  return (data?.results ?? []) as PluggyAccount[];
}

export async function fetchTransactions(
  accountId: string,
  opts: { from?: string; page?: number; pageSize?: number } = {}
): Promise<PluggyPage<PluggyTransaction>> {
  const { from, page = 1, pageSize = 500 } = opts;
  const params: Record<string, string> = {
    accountId,
    page: String(page),
    pageSize: String(pageSize),
  };
  if (from) params.from = from;
  const data = await apiGet(
    "/transactions",
    params,
    `buscar transações da conta ${accountId}`
  );
  return {
    results: (data?.results ?? []) as PluggyTransaction[],
    totalPages: typeof data?.totalPages === "number" ? data.totalPages : 1,
    total: data?.total,
    page: data?.page,
  };
}

export async function fetchBills(accountId: string): Promise<PluggyBill[]> {
  const data = await apiGet(
    "/bills",
    { accountId },
    `buscar faturas da conta ${accountId}`
  );
  return (data?.results ?? []) as PluggyBill[];
}

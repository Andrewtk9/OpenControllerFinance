import { PluggyClient } from "pluggy-sdk";

/**
 * Cliente Pluggy (Open Finance via MeuPluggy).
 *
 * Variáveis de ambiente esperadas:
 * - PLUGGY_CLIENT_ID
 * - PLUGGY_CLIENT_SECRET
 * - PLUGGY_ITEM_IDS (uuids separados por vírgula, um por banco conectado)
 */

export function hasPluggyCredentials(): boolean {
  return Boolean(
    process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET
  );
}

/** Lista de itemIds configurados em PLUGGY_ITEM_IDS (separados por vírgula). */
export function getItemIds(): string[] {
  return (process.env.PLUGGY_ITEM_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

let client: PluggyClient | undefined;

/** Retorna um singleton do PluggyClient. Lança erro se credenciais ausentes. */
export function getPluggyClient(): PluggyClient {
  if (!hasPluggyCredentials()) {
    throw new Error(
      "Credenciais da Pluggy ausentes. Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env"
    );
  }
  if (!client) {
    client = new PluggyClient({
      clientId: process.env.PLUGGY_CLIENT_ID as string,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET as string,
    });
  }
  return client;
}

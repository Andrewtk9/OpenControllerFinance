import "dotenv/config";
import { prisma } from "../lib/db";
import { runSync, MissingPluggyCredentialsError } from "../lib/sync";

async function main(): Promise<number> {
  try {
    const result = await runSync();

    console.log(`\nResumo: ${result.message}`);
    if (result.errors.length > 0) {
      console.log(`Erros (${result.errors.length}):`);
      for (const err of result.errors) {
        console.log(`  - ${err}`);
      }
    }

    return result.status === "ok" ? 0 : 1;
  } catch (error) {
    if (error instanceof MissingPluggyCredentialsError) {
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
      return 1;
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Erro fatal na sincronização:", msg);
    return 1;
  }
}

main()
  .then(async (code) => {
    await prisma.$disconnect();
    process.exit(code);
  })
  .catch(async (error) => {
    console.error("Erro fatal na sincronização:", error);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });

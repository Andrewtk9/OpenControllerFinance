import "dotenv/config";
import { prisma } from "../lib/db";
import { MERCHANT_RULES, CATEGORIES } from "../lib/categorize";

/**
 * Seed inicial: garante a linha única de Settings (id=1).
 * As regras de comércios (MERCHANT_RULES) ficam no código — não vão para o DB.
 * A tabela CategoryRule é só para regras personalizadas do usuário.
 */
async function main() {
  console.log("=== OpenControllerFinance — Seed ===\n");

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  console.log("Configurações garantidas (Settings id=1):");
  console.log(`  - Modo de orçamento: ${settings.budgetMode}`);
  console.log(`  - % de poupança: ${settings.savingsPercent}%`);
  console.log(`  - Limiar de alerta: ${settings.alertThreshold}%`);
  console.log(
    `\n${Object.keys(MERCHANT_RULES).length} regras built-in de comércios e ${
      CATEGORIES.length
    } categorias disponíveis no código (não precisam de seed).`
  );

  console.log("\nPróximos passos:");
  console.log("  1. Crie um arquivo .env na raiz do projeto com:");
  console.log("       DATABASE_URL=\"file:./dev.db\"");
  console.log("       PLUGGY_CLIENT_ID=seu-client-id");
  console.log("       PLUGGY_CLIENT_SECRET=seu-client-secret");
  console.log("       PLUGGY_ITEM_IDS=uuid-1,uuid-2");
  console.log(
    "     (credenciais em https://dashboard.pluggy.ai; conecte seus bancos via https://meu.pluggy.ai)"
  );
  console.log(
    "  2. Opcional: TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID para receber alertas no Telegram."
  );
  console.log("  3. Rode `npm run db:push` para criar o banco (se ainda não criou).");
  console.log("  4. Rode `npm run sync` para sincronizar contas e transações.");
  console.log("  5. Rode `npm run dev` para abrir o app.\n");
  console.log("Seed concluído com sucesso.");
}

main()
  .catch((error) => {
    console.error("Erro ao executar o seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

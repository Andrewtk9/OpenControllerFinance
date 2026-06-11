import { prisma } from "./db";

export interface NotificationInput {
  type: string; // budget_alert | budget_exceeded | bill_due
  dedupeKey: string;
  title: string;
  body: string;
}

/**
 * Cria uma notificação no DB se o dedupeKey ainda não existe.
 * @returns true se criou, false se já existia (deduplicada).
 */
export async function createNotification(
  input: NotificationInput
): Promise<boolean> {
  const existing = await prisma.notification.findUnique({
    where: { dedupeKey: input.dedupeKey },
  });
  if (existing) return false;

  try {
    await prisma.notification.create({
      data: {
        type: input.type,
        dedupeKey: input.dedupeKey,
        title: input.title,
        body: input.body,
      },
    });
    return true;
  } catch {
    // corrida com unique violation -> já existe, não duplica
    return false;
  }
}

/**
 * Envia mensagem via Telegram Bot API.
 * Silencioso se TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID não configurados. Nunca lança.
 */
export async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(
        `[notify] Falha ao enviar Telegram (HTTP ${res.status}): ${body.replaceAll(token, "***")}`
      );
    }
  } catch (error) {
    // não logar o erro cru: a URL do undici contém o token do bot
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[notify] Erro ao enviar Telegram: ${msg.replaceAll(token, "***")}`);
  }
}

import { CapacitorHttp } from "@capacitor/core";
import { db, getSettings } from "./db";

export interface NotificationInput {
  type: string; // budget_alert | budget_exceeded | bill_due
  dedupeKey: string;
  title: string;
  body: string;
}

/**
 * Cria uma notificação no DB se o dedupeKey ainda não existe.
 * O índice &dedupeKey é único — uma colisão lança ConstraintError, que é
 * capturado e tratado como "já existia".
 * @returns true se criou, false se já existia (deduplicada).
 */
export async function createNotification(
  input: NotificationInput
): Promise<boolean> {
  try {
    await db.notifications.add({
      createdAt: new Date().toISOString(),
      type: input.type,
      dedupeKey: input.dedupeKey,
      title: input.title,
      body: input.body,
      read: false,
    });
    return true;
  } catch (error) {
    // unique violation no índice &dedupeKey -> já existe, não duplica
    if (error instanceof Error && error.name === "ConstraintError") {
      return false;
    }
    throw error;
  }
}

/**
 * Envia mensagem via Telegram Bot API usando as credenciais de Settings
 * (telegramBotToken / telegramChatId).
 * Silencioso se não configurado. Nunca lança.
 */
export async function sendTelegram(text: string): Promise<void> {
  let token: string | undefined;
  try {
    const settings = await getSettings();
    token = settings.telegramBotToken;
    const chatId = settings.telegramChatId;
    if (!token || !chatId) return;

    const res = await CapacitorHttp.post({
      url: `https://api.telegram.org/bot${token}/sendMessage`,
      headers: { "Content-Type": "application/json" },
      data: { chat_id: chatId, text },
    });
    if (res.status >= 400) {
      const body =
        typeof res.data === "string"
          ? res.data
          : JSON.stringify(res.data ?? "");
      console.warn(
        `[notify] Falha ao enviar Telegram (HTTP ${res.status}): ${body.replaceAll(token, "***")}`
      );
    }
  } catch (error) {
    // não logar o erro cru sem mascarar: a URL contém o token do bot
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(
      `[notify] Erro ao enviar Telegram: ${token ? msg.replaceAll(token, "***") : msg}`
    );
  }
}

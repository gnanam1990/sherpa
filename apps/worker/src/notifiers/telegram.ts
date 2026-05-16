import type { AlertRow } from '../types.js';

export type { AlertRow };

export interface NotifyResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface NotifyPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function notifyTelegram(
  alert: AlertRow,
  payload: NotifyPayload,
): Promise<NotifyResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = alert.params?.telegramChatId as string | undefined;

  if (!botToken || !chatId) {
    return { success: false, error: 'missing telegram config' };
  }

  try {
    const text = `🔔 *${payload.title}*\n\n${payload.body}`;
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
    const data = (await resp.json()) as { ok: boolean; result?: { message_id: number } };
    if (!data.ok) return { success: false, error: 'telegram api error' };
    return { success: true, messageId: String(data.result?.message_id) };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

import type { NotificationPayload, NotificationResult } from '../types.js';

export async function sendTelegramNotification(
  chatId: string,
  payload: NotificationPayload,
  config: { botToken?: string },
): Promise<NotificationResult> {
  const token = config.botToken ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
  }

  const text = `<b>${payload.title}</b>\n\n${payload.body}`;
  let resp: Response;
  try {
    resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `telegram_fetch_error: ${msg}` };
  }

  if (!resp.ok) {
    return { success: false, error: `tg_api_${resp.status}` };
  }

  const json = (await resp.json()) as { ok: boolean; result?: { message_id: number } };
  if (!json.ok) {
    return { success: false, error: 'tg_api_not_ok' };
  }

  return { success: true, messageId: String(json.result?.message_id ?? '') };
}

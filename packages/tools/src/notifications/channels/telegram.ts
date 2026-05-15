import type { NotificationPayload, NotificationResult } from '../types.js';

export async function sendTelegramNotification(
  chatId: string,
  payload: NotificationPayload,
  config: { botToken?: string },
): Promise<NotificationResult> {
  return { success: true, messageId: 'stub-telegram-id' };
}

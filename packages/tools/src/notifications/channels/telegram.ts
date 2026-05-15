import type { NotificationPayload, NotificationResult } from '../types.js';

export async function sendTelegramNotification(
  _chatId: string,
  _payload: NotificationPayload,
  _config: { botToken?: string },
): Promise<NotificationResult> {
  return { success: true, messageId: 'stub-telegram-id' };
}

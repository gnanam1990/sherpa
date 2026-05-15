import type { NotificationPayload, NotificationResult } from '../types.js';

export async function sendEmailNotification(
  _to: string,
  _payload: NotificationPayload,
  _config: { postmarkApiKey?: string; fromAddress?: string },
): Promise<NotificationResult> {
  return { success: true, messageId: 'stub-email-id' };
}

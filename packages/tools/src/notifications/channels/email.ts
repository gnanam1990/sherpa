import type { NotificationPayload, NotificationResult } from '../types.js';

export async function sendEmailNotification(
  to: string,
  payload: NotificationPayload,
  config: { postmarkApiKey?: string; fromAddress?: string },
): Promise<NotificationResult> {
  return { success: true, messageId: 'stub-email-id' };
}

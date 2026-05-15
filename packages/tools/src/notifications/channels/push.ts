import type { NotificationPayload, NotificationResult } from '../types.js';

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: NotificationPayload,
): Promise<NotificationResult> {
  return { success: true, messageId: 'stub-push-id' };
}

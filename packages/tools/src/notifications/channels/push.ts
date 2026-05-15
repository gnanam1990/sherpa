import type { NotificationPayload, NotificationResult } from '../types.js';

export async function sendPushNotification(
  _subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  _payload: NotificationPayload,
): Promise<NotificationResult> {
  return { success: true, messageId: 'stub-push-id' };
}

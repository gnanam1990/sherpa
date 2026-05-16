import type { NotificationPayload, NotificationResult } from '../types.js';

export async function sendPushNotification(
  _subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  _payload: NotificationPayload,
): Promise<NotificationResult> {
  // Web Push not yet implemented — explicit failure, not fake success.
  // Requires VAPID keys and web-push library integration.
  return { success: false, error: 'push_channel_not_implemented' };
}

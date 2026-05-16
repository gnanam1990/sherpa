import type { AlertRow } from '../types.js';
import type { NotifyResult, NotifyPayload } from './telegram.js';

let notificationStore: { logNotification(n: Record<string, unknown>): Promise<void> } | null = null;

export function setNotificationStore(
  store: { logNotification(n: Record<string, unknown>): Promise<void> },
): void {
  notificationStore = store;
}

export async function notifyInApp(
  alert: AlertRow,
  payload: NotifyPayload,
): Promise<NotifyResult> {
  if (!notificationStore) {
    return { success: false, error: 'notification store not configured' };
  }

  try {
    await notificationStore.logNotification({
      userAddress: alert.user_address,
      channel: 'push',
      title: payload.title,
      body: payload.body,
      data: payload.data,
      status: 'sent',
      createdAt: Date.now(),
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

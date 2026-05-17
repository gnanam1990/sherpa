import type { AlertRow } from '../types.js';
import type { NotifyResult, NotifyPayload } from './telegram.js';

let notificationStore: {
  logNotification(n: {
    userAddress: string;
    channel: 'push';
    payload: NotifyPayload;
    status: 'sent' | 'failed';
    sentAt?: string;
  }): Promise<unknown>;
} | null = null;

export function setNotificationStore(
  store: NonNullable<typeof notificationStore>,
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
      payload,
      status: 'sent',
      sentAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export { notifyTelegram } from './telegram.js';
export { notifyFarcaster } from './farcaster.js';
export { notifyInApp, setNotificationStore } from './in-app.js';
export type { NotifyResult, NotifyPayload } from './telegram.js';
export type { AlertRow } from '../types.js';

import type { AlertRow } from '../types.js';
import type { NotifyResult, NotifyPayload } from './telegram.js';
import { notifyTelegram } from './telegram.js';
import { notifyFarcaster } from './farcaster.js';
import { notifyInApp } from './in-app.js';

const notifierMap: Record<string, (alert: AlertRow, payload: NotifyPayload) => Promise<NotifyResult>> = {
  telegram: notifyTelegram,
  farcaster: notifyFarcaster,
  push: notifyInApp,
  'in-app': notifyInApp,
};

export async function dispatchAlertNotification(
  alert: AlertRow,
  payload: NotifyPayload,
): Promise<NotifyResult[]> {
  const channels = alert.notification_channels ?? ['push'];
  const results: NotifyResult[] = [];

  for (const channel of channels) {
    const notifier = notifierMap[channel] ?? notifyInApp;
    const result = await notifier(alert, payload);
    results.push(result);
  }

  return results;
}

export function formatAlertPayload(
  alert: AlertRow,
  currentValue: number,
): NotifyPayload {
  const asset = (alert.asset as Record<string, string>)?.symbol ?? alert.condition_type;
  const threshold = Number(alert.threshold);
  const comp = alert.comparison;

  return {
    title: `Alert Triggered: ${asset}`,
    body: `${asset} is now ${currentValue.toFixed(4)} (${comp} ${threshold})`,
    data: {
      alertId: alert.id,
      conditionType: alert.condition_type,
      currentValue: String(currentValue),
      threshold: String(threshold),
    },
  };
}

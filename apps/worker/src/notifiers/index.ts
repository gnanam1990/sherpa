/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export { notifyTelegram } from './telegram.js';
export { notifyFarcaster, setFarcasterTokenResolver } from './farcaster.js';
export { notifyInApp, setNotificationStore } from './in-app.js';
export { notifyEmail } from './email.js';
export { notifyWebPush } from './web-push.js';
export type { NotifyResult, NotifyPayload } from './telegram.js';
export type { AlertRow } from '../types.js';

import type { AlertRow } from '../types.js';
import type { NotifyResult, NotifyPayload } from './telegram.js';
import { notifyTelegram } from './telegram.js';
import { notifyFarcaster } from './farcaster.js';
import { notifyInApp } from './in-app.js';
import { notifyEmail } from './email.js';
import { notifyWebPush } from './web-push.js';

const notifierMap: Record<string, (alert: AlertRow, payload: NotifyPayload) => Promise<NotifyResult>> = {
  telegram: notifyTelegram,
  farcaster: notifyFarcaster,
  email: notifyEmail,
  push: notifyInApp,
  'in-app': notifyInApp,
  'web-push': notifyWebPush,
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

/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

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

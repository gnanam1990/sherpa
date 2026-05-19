/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { sendPushNotification } from '@sherpa/tools';
import type { AlertRow } from '../types.js';
import type { NotifyPayload, NotifyResult } from './telegram.js';

type PushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
};

function readPushSubscription(alert: AlertRow): PushSubscription | null {
  const value = alert.params?.pushSubscription;
  if (!value || typeof value !== 'object') return null;
  const subscription = value as Partial<PushSubscription>;
  if (
    typeof subscription.endpoint !== 'string' ||
    typeof subscription.keys?.p256dh !== 'string' ||
    typeof subscription.keys?.auth !== 'string'
  ) {
    return null;
  }
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: {
      auth: subscription.keys.auth,
      p256dh: subscription.keys.p256dh,
    },
  };
}

export async function notifyWebPush(
  alert: AlertRow,
  payload: NotifyPayload,
): Promise<NotifyResult> {
  const subscription = readPushSubscription(alert);
  if (!subscription) return { success: false, error: 'missing web push subscription' };
  return sendPushNotification(subscription, payload, {});
}

/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { NotificationPayload, NotificationResult } from '../types.js';
import webPush, { type PushSubscription } from 'web-push';

type PushConfig = {
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
  vapidSubject?: string;
};

function resolvePushConfig(config: PushConfig): Required<PushConfig> | null {
  const vapidPublicKey = config.vapidPublicKey ?? process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = config.vapidPrivateKey ?? process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const vapidSubject =
    config.vapidSubject ??
    process.env.WEB_PUSH_VAPID_SUBJECT ??
    process.env.EMAIL_FROM_ADDRESS ??
    'mailto:alerts@sherpa-web.vercel.app';

  if (!vapidPublicKey || !vapidPrivateKey) return null;
  return { vapidPrivateKey, vapidPublicKey, vapidSubject };
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload,
  config: PushConfig = {},
): Promise<NotificationResult> {
  const resolved = resolvePushConfig(config);
  if (!resolved) return { success: false, error: 'web_push_not_configured' };

  try {
    const result = await webPush.sendNotification(
      subscription,
      JSON.stringify({
        body: payload.body,
        title: payload.title,
        url: payload.data?.url ?? '/',
      }),
      {
        TTL: 3600,
        urgency: 'normal',
        vapidDetails: {
          privateKey: resolved.vapidPrivateKey,
          publicKey: resolved.vapidPublicKey,
          subject: resolved.vapidSubject,
        },
      },
    );
    return { success: true, messageId: String(result.statusCode) };
  } catch (err) {
    const status =
      typeof err === 'object' && err !== null && 'statusCode' in err
        ? `_${String((err as { statusCode: unknown }).statusCode)}`
        : '';
    return {
      success: false,
      error: `web_push_error${status}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

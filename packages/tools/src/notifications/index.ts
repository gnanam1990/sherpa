/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export { dispatchNotification } from './dispatcher.js';
export { sendPushNotification } from './channels/push.js';
export { sendEmailNotification } from './channels/email.js';
export { sendFarcasterNotification } from './channels/farcaster.js';
export { sendTelegramNotification } from './channels/telegram.js';
export type {
  NotificationPayload,
  NotificationResult,
  ChannelConfig,
  NotificationDeps,
} from './types.js';

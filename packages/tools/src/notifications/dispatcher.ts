import type { NotificationPayload, NotificationResult, NotificationDeps } from './types.js';
import { sendPushNotification } from './channels/push.js';
import { sendEmailNotification } from './channels/email.js';
import { sendFarcasterNotification } from './channels/farcaster.js';
import { sendTelegramNotification } from './channels/telegram.js';

export async function dispatchNotification(
  channel: string,
  recipient: string,
  payload: NotificationPayload,
  deps: NotificationDeps,
): Promise<NotificationResult> {
  switch (channel) {
    case 'push':
    case 'web-push':
      return sendPushNotification(JSON.parse(recipient), payload, deps.config.push ?? {});
    case 'email':
      return sendEmailNotification(recipient, payload, deps.config.email ?? {});
    case 'farcaster':
      return sendFarcasterNotification(Number(recipient), payload, deps.config.farcaster ?? {});
    case 'telegram':
      return sendTelegramNotification(recipient, payload, deps.config.telegram ?? {});
    default:
      return { success: false, error: `Unsupported channel: ${channel}` };
  }
}

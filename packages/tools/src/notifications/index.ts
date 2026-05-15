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

import type { NotificationPayload, NotificationResult } from '../types.js';

export async function sendEmailNotification(
  _to: string,
  _payload: NotificationPayload,
  _config: { postmarkApiKey?: string; fromAddress?: string },
): Promise<NotificationResult> {
  // Email channel not yet implemented — explicit failure, not fake success.
  // Track in: https://github.com/sherpa-protocol/sherpa/issues (email_channel)
  return { success: false, error: 'email_channel_not_implemented' };
}

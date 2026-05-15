import type { NotificationPayload, NotificationResult } from '../types.js';

export async function sendFarcasterNotification(
  _fid: number,
  _payload: NotificationPayload,
  _config: { neynarApiKey?: string },
): Promise<NotificationResult> {
  return { success: true, messageId: 'stub-farcaster-id' };
}

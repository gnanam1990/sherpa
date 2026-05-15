import type { NotificationPayload, NotificationResult } from '../types.js';

export async function sendFarcasterNotification(
  fid: number,
  payload: NotificationPayload,
  config: { neynarApiKey?: string },
): Promise<NotificationResult> {
  return { success: true, messageId: 'stub-farcaster-id' };
}

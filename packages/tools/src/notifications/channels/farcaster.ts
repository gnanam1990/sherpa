import type { NotificationPayload, NotificationResult } from '../types.js';

export async function sendFarcasterNotification(
  fid: number,
  payload: NotificationPayload,
  config: { neynarApiKey?: string },
): Promise<NotificationResult> {
  const apiKey = config.neynarApiKey ?? process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'NEYNAR_API_KEY not configured' };
  }

  let resp: Response;
  try {
    resp = await fetch('https://api.neynar.com/v2/farcaster/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey,
      },
      body: JSON.stringify({
        target_fids: [fid],
        notification: {
          title: payload.title,
          body: payload.body,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `farcaster_fetch_error: ${msg}` };
  }

  if (!resp.ok) {
    return { success: false, error: `farcaster_api_${resp.status}` };
  }

  const json = (await resp.json()) as { notification_id?: string };
  return { success: true, messageId: json.notification_id ?? '' };
}

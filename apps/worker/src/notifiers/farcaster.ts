import type { AlertRow } from '../types.js';
import type { NotifyResult, NotifyPayload } from './telegram.js';

export async function notifyFarcaster(
  alert: AlertRow,
  payload: NotifyPayload,
): Promise<NotifyResult> {
  const fid = alert.params?.farcasterFid as number | undefined;
  const notificationUrl = alert.params?.notificationUrl as string | undefined;

  if (!fid || !notificationUrl) {
    return { success: false, error: 'missing farcaster config' };
  }

  try {
    const resp = await fetch(notificationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: crypto.randomUUID(),
        title: payload.title,
        body: payload.body,
        targetUrl: payload.data?.targetUrl ?? 'https://sherpa.tools',
        tokens: [alert.params?.notificationToken].filter(Boolean),
      }),
    });
    if (!resp.ok) return { success: false, error: `farcaster ${resp.status}` };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

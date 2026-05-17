import sdk from '@farcaster/frame-sdk';

export type FarcasterUser = {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
};

export type FarcasterNotificationDetails = {
  token: string;
  url: string;
};

export type MiniAppAddResult =
  | {
      added: true;
      notificationDetails?: FarcasterNotificationDetails;
    }
  | {
      added: false;
      reason?: string;
    };

export async function getFarcasterUser(): Promise<FarcasterUser | null> {
  try {
    await sdk.actions.ready();
    const context = await sdk.context;
    if (!context?.user?.fid) return null;
    return {
      fid: context.user.fid,
      username: context.user.username,
      displayName: context.user.displayName,
      pfpUrl: context.user.pfpUrl,
    };
  } catch (err) {
    console.error('[sherpa:miniapp] FC connect failed:', err);
    return null;
  }
}

export async function addSherpaMiniApp(): Promise<MiniAppAddResult> {
  try {
    const result = await sdk.actions.addFrame();
    return result as MiniAppAddResult;
  } catch (err) {
    console.error('[sherpa:miniapp] add frame failed:', err);
    return { added: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export async function saveFarcasterNotificationDetails(
  fid: number,
  details: FarcasterNotificationDetails,
): Promise<void> {
  const apiBase = process.env.NEXT_PUBLIC_SHERPA_API_BASE || '';
  const res = await fetch(`${apiBase}/api/webhooks/farcaster`, {
    body: JSON.stringify({
      event: 'notifications-enabled',
      fid,
      notificationDetails: details,
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Farcaster notification save failed: ${res.status}`);
  }
}

export async function getFarcasterNotificationStatus(fid: number): Promise<boolean> {
  const apiBase = process.env.NEXT_PUBLIC_SHERPA_API_BASE || '';
  const res = await fetch(`${apiBase}/api/farcaster/notifications/${fid}/status`);
  if (!res.ok) return false;
  const body = (await res.json()) as { active?: boolean };
  return body.active === true;
}

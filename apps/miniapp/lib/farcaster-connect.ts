import sdk from '@farcaster/frame-sdk';

export type FarcasterUser = {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
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

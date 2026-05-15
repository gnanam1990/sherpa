import { sdk } from '@farcaster/frame-sdk';

export async function initFrame() {
  await sdk.actions.ready();
}

export function openUrl(url: string) {
  sdk.actions.openUrl(url);
}

export function isInFarcasterFrame(): boolean {
  return typeof window !== 'undefined' && window.parent !== window;
}

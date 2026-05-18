import { NextResponse } from 'next/server';

export const runtime = 'edge';

type MiniAppManifest = {
  version: '1';
  name: string;
  iconUrl: string;
  homeUrl: string;
  splashImageUrl: string;
  splashBackgroundColor: string;
  webhookUrl: string;
  subtitle: string;
  description: string;
  primaryCategory: 'finance';
  tags: string[];
  tagline: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  heroImageUrl: string;
  screenshotUrls: string[];
  requiredChains: string[];
  requiredCapabilities: string[];
  canonicalDomain: string;
};

function appDomain(appUrl: string): string {
  return new URL(appUrl).hostname;
}

function buildMiniAppManifest(appUrl: string, apiBase: string): MiniAppManifest {
  return {
    version: '1',
    name: 'Sherpa',
    iconUrl: `${appUrl}/icon-1024.png`,
    homeUrl: appUrl,
    splashImageUrl: `${appUrl}/splash.png`,
    splashBackgroundColor: '#0052FF',
    webhookUrl: `${apiBase}/api/webhooks/farcaster`,
    subtitle: 'Type plain English',
    description:
      'Natural-language agent for Base. Send, swap, lend, borrow, repay, and view Aave positions from one chat surface.',
    primaryCategory: 'finance',
    tags: ['ai', 'agent', 'defi', 'base', 'aave'],
    tagline: 'Onchain in plain English',
    ogTitle: 'Sherpa',
    ogDescription: 'Type plain English. Sherpa does it on Base.',
    ogImageUrl: `${appUrl}/og-image.png`,
    heroImageUrl: `${appUrl}/og-image.png`,
    screenshotUrls: [
      `${appUrl}/screenshot-1.png`,
      `${appUrl}/screenshot-2.png`,
      `${appUrl}/screenshot-3.png`,
    ],
    requiredChains: ['eip155:8453'],
    requiredCapabilities: ['wallet.getEthereumProvider'],
    canonicalDomain: appDomain(appUrl),
  };
}

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL || 'https://sherpa-miniapp.vercel.app';
  const apiBase = process.env.SHERPA_API_BASE || 'https://sherpa-api.up.railway.app';
  const miniapp = buildMiniAppManifest(appUrl, apiBase);

  return NextResponse.json({
    accountAssociation: {
      header: process.env.FARCASTER_HEADER || '',
      payload: process.env.FARCASTER_PAYLOAD || '',
      signature: process.env.FARCASTER_SIGNATURE || '',
    },
    miniapp,
    // Backward compatibility for older Farcaster clients that still read frame.
    frame: miniapp,
  });
}

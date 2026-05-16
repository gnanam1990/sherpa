import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL || 'https://sherpa-miniapp.vercel.app';
  const apiBase = process.env.SHERPA_API_BASE || 'https://sherpa-api.up.railway.app';

  return NextResponse.json({
    accountAssociation: {
      header: process.env.FARCASTER_HEADER || '',
      payload: process.env.FARCASTER_PAYLOAD || '',
      signature: process.env.FARCASTER_SIGNATURE || '',
    },
    frame: {
      version: 'next',
      name: 'Sherpa',
      iconUrl: `${appUrl}/icon-512.png`,
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: '#0052FF',
      homeUrl: appUrl,
      webhookUrl: `${apiBase}/api/webhooks/farcaster`,
      subtitle: 'Type plain English.',
      description:
        'Natural-language agent for Base. Send, swap, lend via chat. Sponsored gas via Coinbase Smart Wallet.',
      primaryCategory: 'finance',
      tags: ['ai', 'agent', 'defi', 'base'],
      tagline: 'Onchain in plain English',
      ogTitle: 'Sherpa — Base Agent',
      ogDescription: 'Type plain English. Sherpa does the onchain.',
      ogImageUrl: `${appUrl}/og-image.png`,
      heroImageUrl: `${appUrl}/og-image.png`,
    },
  });
}

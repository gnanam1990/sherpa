import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const appUrl = process.env.NEXT_PUBLIC_URL || 'https://sherpa-miniapp.vercel.app';
  const baseAppId = process.env.NEXT_PUBLIC_BASE_APP_ID || '6a06efd3067444793fb8ddba';
  return {
    metadataBase: new URL(appUrl),
    applicationName: 'Sherpa',
    title: 'Sherpa',
    description: 'The natural-language Base agent.',
    keywords: [
      'Sherpa',
      'Base',
      'AI agent',
      'onchain agent',
      'DeFi',
      'Coinbase Smart Wallet',
      'sponsored gas',
    ],
    category: 'AI Agents',
    icons: {
      icon: [
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    },
    openGraph: {
      title: 'Sherpa',
      description: 'Type plain English. Sherpa does it on Base.',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Sherpa' }],
    },
    other: {
      'base:app_id': baseAppId,
      'fc:frame': JSON.stringify({
        version: 'next',
        imageUrl: `${appUrl}/og-image.png`,
        button: {
          title: 'Open Sherpa',
          action: {
            type: 'launch_frame',
            name: 'Sherpa',
            url: appUrl,
            splashImageUrl: `${appUrl}/splash.png`,
            splashBackgroundColor: '#0052FF',
          },
        },
      }),
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { RegisterSW } from './_components/RegisterSW';
import '@rainbow-me/rainbowkit/styles.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://sherpa-web.vercel.app'),
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
  manifest: '/manifest.json',
  other: {
    'talentapp:project_verification':
      'b7e6ba47c5060c17951c92322b6a5bb719093bfcef6ca7ec9a763f29d02a476b4b7ee131a0e30c58b0628dfc60279b6cee51873b359ef1e394ddc8fffdd6ad6a',
  },
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
    siteName: 'Sherpa',
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sherpa',
    description: 'Type plain English. Sherpa does it on Base.',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sherpa',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0052FF',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="m-0 bg-background font-sans text-foreground">
        <RegisterSW />
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

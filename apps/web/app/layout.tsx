import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { RegisterSW } from './_components/RegisterSW';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://sherpa-web.vercel.app'),
  title: 'Sherpa',
  description: 'The natural-language Base agent.',
  manifest: '/manifest.json',
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
    <html lang="en">
      <body className="m-0 bg-sherpa-bg font-sans text-sherpa-fg">
        <RegisterSW />
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { RegisterSW } from './_components/RegisterSW';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sherpa',
  description: 'The natural-language Base agent.',
  manifest: '/manifest.json',
  themeColor: '#0052FF',
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

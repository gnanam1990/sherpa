import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sherpa - Mini App',
  description: 'Sherpa onchain agent on Farcaster',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="m-0 bg-sherpa-bg font-sans text-sherpa-fg">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { tokens } from '@sherpa/ui';

export const metadata: Metadata = {
  title: 'Sherpa',
  description: 'The natural-language Base agent.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: tokens.color.bg,
          color: tokens.color.fg,
          fontFamily: tokens.font.sans,
        }}
      >
        {children}
      </body>
    </html>
  );
}

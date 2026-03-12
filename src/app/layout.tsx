import type { ReactNode } from 'react';
import { Geist } from 'next/font/google';
import '@/app/globals.css';
import { cn } from '@/frontend/lib/utils';

const geist = Geist({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={cn(geist.className, "min-h-screen bg-background antialiased")}>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppShell } from './app-shell/AppShell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'QR Studio — Artistic QR Code Generator',
  description: 'Generate beautiful, scannable artistic QR codes for your brand',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

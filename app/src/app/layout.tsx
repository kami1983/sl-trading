import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientOnly } from '@/components/ClientOnly';
import { WalletProvider } from '@/components/WalletProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Solana Program Demo',
  description: 'Learn Solana Program Demo',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientOnly>
          <WalletProvider>{children}</WalletProvider>
        </ClientOnly>
      </body>
    </html>
  );
}

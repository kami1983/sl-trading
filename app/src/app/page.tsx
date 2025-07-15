'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { NetworkInfo } from '@/components/NetworkInfo';
import { TradeForm } from '@/components/TradeForm';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="w-full max-w-4xl space-y-8">
        <div className="flex justify-between items-center">
          <NetworkInfo />
          <WalletMultiButton className="!bg-slate-700 hover:!bg-slate-600" />
        </div>
        
        <TradeForm />
      </div>
    </main>
  );
}

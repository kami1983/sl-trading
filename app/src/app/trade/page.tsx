'use client'

import { TradeForm } from '@/components/app/trade-form'
import { AppHero } from '@/components/app-hero'

export default function TradePage() {
  return (
    <div>
      <AppHero 
        title="交易" 
        subtitle="提交交易到 Solana 区块链"
      >
        <p className="mb-6">
          使用下面的表单提交交易。请填写所有必要信息。
        </p>
      </AppHero>
      
      <div className="max-w-4xl mx-auto py-8">
        <TradeForm />
      </div>
    </div>
  )
} 
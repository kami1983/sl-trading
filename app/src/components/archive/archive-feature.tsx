'use client'

import { useState } from 'react'
import { AppHero } from '@/components/app-hero'
import { ArchiveSearch } from './archive-search'
import { ArchiveResults } from './archive-results'
import type { Address } from 'gill'

export default function ArchiveFeature() {
  const [searchAddress, setSearchAddress] = useState<Address | null>(null)

  return (
    <div>
      <AppHero
        title="SL Trading Archive"
        subtitle="查询任意 Solana 地址的交易记录"
      >
        <div className="my-6">
          <ArchiveSearch onAddressChange={setSearchAddress} />
        </div>
      </AppHero>
      
      <div className="space-y-8">
        {searchAddress && <ArchiveResults address={searchAddress} />}
      </div>
    </div>
  )
} 
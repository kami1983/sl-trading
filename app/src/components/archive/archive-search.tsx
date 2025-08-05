'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { address, type Address } from 'gill'
import { toast } from 'sonner'

interface ArchiveSearchProps {
  onAddressChange: (address: Address | null) => void
}

export function ArchiveSearch({ onAddressChange }: ArchiveSearchProps) {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async () => {
    if (!inputValue.trim()) {
      toast.error('请输入 Solana 地址')
      return
    }

    setIsLoading(true)
    try {
      // 验证地址格式
      const validAddress = address(inputValue.trim())
      onAddressChange(validAddress)
      toast.success('地址验证成功，正在查询交易记录...')
    } catch (error) {
      toast.error('无效的 Solana 地址格式')
      onAddressChange(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setInputValue('')
    onAddressChange(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address-input" className="text-lg font-medium">
          Solana 地址
        </Label>
        <div className="flex space-x-2">
          <Input
            id="address-input"
            placeholder="输入要查询的 Solana 地址..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1 font-mono"
          />
          <Button 
            onClick={handleSearch} 
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? '验证中...' : '搜索'}
          </Button>
          {inputValue && (
            <Button 
              variant="outline" 
              onClick={handleClear}
              disabled={isLoading}
            >
              清除
            </Button>
          )}
        </div>
      </div>
      
      <div className="text-sm text-gray-600">
        <p>💡 提示：输入任意 Solana 地址来查询该地址相关的 SL Trading 交易记录</p>
        <p className="mt-1">支持的格式：Base58 编码的 Solana 公钥（44个字符）</p>
      </div>
    </div>
  )
} 
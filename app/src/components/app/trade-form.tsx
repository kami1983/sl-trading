'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TradeFormData {
  id: string
  userId: string
  fundId: string
  tradeType: 'BUY' | 'SELL'
  amount: string
  price: string
}

// 生成随机交易ID
function generateTradeId(): string {
  return `TRADE_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

// 生成随机用户ID
function generateUserId(): string {
  return `USER_${Math.random().toString(36).substr(2, 6).toUpperCase()}`
}

// 生成随机基金ID
function generateFundId(): string {
  return `FUND_${Math.random().toString(36).substr(2, 8).toUpperCase()}`
}

// 生成随机数量
function generateAmount(): string {
  return Math.floor(Math.random() * 1000 + 1).toString()
}

// 生成随机价格
function generatePrice(): string {
  return (Math.random() * 100 + 1).toFixed(2)
}

// 生成随机交易类型
function generateTradeType(): 'BUY' | 'SELL' {
  return Math.random() > 0.5 ? 'BUY' : 'SELL'
}

export function TradeForm() {
  const [formData, setFormData] = useState<TradeFormData>({
    id: generateTradeId(),
    userId: generateUserId(),
    fundId: generateFundId(),
    tradeType: generateTradeType(),
    amount: generateAmount(),
    price: generatePrice(),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('提交交易数据:', formData)
    
    // 这里你可以添加自己的交互逻辑
    alert('表单提交成功！数据: ' + JSON.stringify(formData, null, 2))
  }

  const handleInputChange = (field: keyof TradeFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  // 填充随机数据
  const fillRandomData = () => {
    setFormData({
      id: generateTradeId(),
      userId: generateUserId(),
      fundId: generateFundId(),
      tradeType: generateTradeType(),
      amount: generateAmount(),
      price: generatePrice(),
    })
  }

  // 清空表单
  const clearForm = () => {
    setFormData({
      id: '',
      userId: '',
      fundId: '',
      tradeType: 'BUY',
      amount: '',
      price: '',
    })
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-card rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">提交交易</h2>
      
      <div className="mb-4 flex gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={fillRandomData}
          className="flex-1"
        >
          填充随机数据
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={clearForm}
          className="flex-1"
        >
          清空表单
        </Button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="id">交易ID</Label>
          <Input
            id="id"
            value={formData.id}
            onChange={(e) => handleInputChange('id', e.target.value)}
            placeholder="输入交易ID"
            required
          />
        </div>

        <div>
          <Label htmlFor="userId">用户ID</Label>
          <Input
            id="userId"
            value={formData.userId}
            onChange={(e) => handleInputChange('userId', e.target.value)}
            placeholder="输入用户ID"
            required
          />
        </div>

        <div>
          <Label htmlFor="fundId">基金ID</Label>
          <Input
            id="fundId"
            value={formData.fundId}
            onChange={(e) => handleInputChange('fundId', e.target.value)}
            placeholder="输入基金ID"
            required
          />
        </div>

        <div>
          <Label htmlFor="tradeType">交易类型</Label>
          <Select
            value={formData.tradeType}
            onValueChange={(value: 'BUY' | 'SELL') => handleInputChange('tradeType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择交易类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUY">买入</SelectItem>
              <SelectItem value="SELL">卖出</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="amount">数量</Label>
          <Input
            id="amount"
            type="number"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            placeholder="输入数量"
            required
          />
        </div>

        <div>
          <Label htmlFor="price">价格</Label>
          <Input
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => handleInputChange('price', e.target.value)}
            placeholder="输入价格"
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full"
        >
          提交交易
        </Button>
      </form>

      <div className="mt-4 text-sm text-muted-foreground">
        <p className="font-semibold mb-2">当前表单数据:</p>
        <pre className="bg-muted p-2 rounded text-xs overflow-auto">
          {JSON.stringify(formData, null, 2)}
        </pre>
      </div>
    </div>
  )
} 
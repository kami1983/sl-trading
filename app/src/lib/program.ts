import { useWalletUi } from '@wallet-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useWalletUiSigner } from '@/components/solana/use-wallet-ui-signer'
import { useWalletTransactionSignAndSend } from '@/components/solana/use-wallet-transaction-sign-and-send'
import { toastTx } from '@/components/toast-tx'
import { address } from 'gill'

// 程序地址
const PROGRAM_ID = address('19g7kgLjp6TKgtHCgs5rZseG4eeKNqhXf3AhAmRJrtW')

// TradeType 枚举
export enum TradeType {
  BUY = 'BUY',
  SELL = 'SELL',
}

// 交易参数接口
export interface LogTradeParams {
  id: string
  userId: string
  fundId: string
  tradeType: TradeType
  amount: number
  price: number
  timestamp: number
}

// 创建 log_trade 指令
function createLogTradeInstruction(params: LogTradeParams) {
  // 指令标识符 (discriminator)
  const discriminator = new Uint8Array([70, 253, 98, 112, 79, 171, 112, 145])
  
  // 序列化参数
  const encoder = new TextEncoder()
  
  // 序列化字符串参数
  const idBytes = encoder.encode(params.id)
  const userIdBytes = encoder.encode(params.userId)
  const fundIdBytes = encoder.encode(params.fundId)
  
  // 序列化数字参数
  const amountBuffer = new ArrayBuffer(8)
  const amountView = new DataView(amountBuffer)
  amountView.setBigUint64(0, BigInt(params.amount), true)
  
  const priceBuffer = new ArrayBuffer(8)
  const priceView = new DataView(priceBuffer)
  priceView.setBigUint64(0, BigInt(params.price), true)
  
  const timestampBuffer = new ArrayBuffer(8)
  const timestampView = new DataView(timestampBuffer)
  timestampView.setBigInt64(0, BigInt(params.timestamp), true)
  
  // 序列化 TradeType 枚举
  const tradeTypeBuffer = new ArrayBuffer(1)
  const tradeTypeView = new DataView(tradeTypeBuffer)
  tradeTypeView.setUint8(0, params.tradeType === TradeType.BUY ? 0 : 1)
  
  // 组合所有数据
  const data = new Uint8Array([
    ...discriminator,
    ...new Uint8Array(4), // id 字符串长度 (4 bytes)
    ...idBytes,
    ...new Uint8Array(4), // userId 字符串长度 (4 bytes)
    ...userIdBytes,
    ...new Uint8Array(4), // fundId 字符串长度 (4 bytes)
    ...fundIdBytes,
    ...tradeTypeView,
    ...new Uint8Array(amountBuffer),
    ...new Uint8Array(priceBuffer),
    ...new Uint8Array(timestampBuffer),
  ])
  
  return {
    programAddress: PROGRAM_ID,
    data,
  }
}

// Hook 用于调用 log_trade
export function useLogTrade() {
  const { account } = useWalletUi()
  const txSigner = useWalletUiSigner()
  const signAndSend = useWalletTransactionSignAndSend()
  
  return useMutation({
    mutationFn: async (params: LogTradeParams) => {
      if (!account || !txSigner) {
        throw new Error('请先连接钱包')
      }
      
      const instruction = createLogTradeInstruction(params)
      return await signAndSend(instruction, txSigner)
    },
    onSuccess: (signature) => {
      toastTx(signature, '交易提交成功')
    },
    onError: (error) => {
      console.error('交易失败:', error)
      toastTx(undefined, '交易失败: ' + (error as Error).message)
    },
  })
} 
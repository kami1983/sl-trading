import { useWalletUi } from '@wallet-ui/react'
import { useMutation } from '@tanstack/react-query'
import { toastTx } from '@/components/toast-tx'
import { Program, BN } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import { useAnchorWallet } from '@solana/wallet-adapter-react'
import type { LearnSolanaProgram } from 'target/types/learn_solana_program'

// TradeType 枚举 (与 Anchor 程序中定义的保持一致)
export enum TradeType {
  BUY = 'buy',
  SELL = 'sell',
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

// 将 TradeType 转换为 Anchor 枚举格式
function toAnchorTradeType(type: TradeType) {
  return type === TradeType.BUY ? { buy: {} } : { sell: {} }
}

// Hook 用于调用 log_trade
export function useLogTrade() {
  const wallet = useAnchorWallet()
  
  return useMutation({
    mutationFn: async (params: LogTradeParams) => {
      if (!wallet) {
        throw new Error('请先连接钱包')
      }

      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'http://localhost:8899'
      )

      // 创建程序实例
      const program = await Program.at<LearnSolanaProgram>(
        '19g7kgLjp6TKgtHCgs5rZseG4eeKNqhXf3AhAmRJrtW',
        { connection, wallet }
      )
      
      return await program.methods
        .logTrade(
          params.id,
          params.userId,
          params.fundId,
          toAnchorTradeType(params.tradeType),
          new BN(params.amount),
          new BN(params.price),
          new BN(params.timestamp)
        )
        .accounts({
          signer: wallet.publicKey
        })
        .rpc()
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
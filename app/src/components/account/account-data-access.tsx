import { TOKEN_2022_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from 'gill/programs/token'
import { getTransferSolInstruction } from 'gill/programs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWalletUi } from '@wallet-ui/react'
import {
  type Address,
  airdropFactory,
  createTransaction,
  getBase58Decoder,
  lamports,
  signAndSendTransactionMessageWithSigners,
  type SolanaClient,
} from 'gill'
import { toast } from 'sonner'
import { toastTx } from '@/components/toast-tx'
import { useWalletUiSigner } from '@/components/solana/use-wallet-ui-signer'


import { getLogTradeInstruction } from '@/generated/instructions'
import { TradeType, TradeEvent, getTradeEventDecoder } from '@/generated/types'
import { SL_TRADING_PROGRAM_ADDRESS } from '@/generated/programs'

// 重新导出以保持API一致性
export { TradeType }
export type { TradeEvent }

// logTrade 参数类型
export interface LogTradeData {
  id: string
  userId: string
  fundId: string
  tradeType: TradeType
  amount: bigint
  price: bigint
  timestamp?: bigint
}

function useGetBalanceQueryKey({ address }: { address: Address }) {
  const { cluster } = useWalletUi()

  return ['get-balance', { cluster, address }]
}

function useInvalidateGetBalanceQuery({ address }: { address: Address }) {
  const queryClient = useQueryClient()
  const queryKey = useGetBalanceQueryKey({ address })
  return async () => {
    await queryClient.invalidateQueries({ queryKey })
  }
}

export function useGetBalanceQuery({ address }: { address: Address }) {
  const { client } = useWalletUi()

  return useQuery({
    retry: false,
    queryKey: useGetBalanceQueryKey({ address }),
    queryFn: () => client.rpc.getBalance(address).send(),
  })
}

function useGetSignaturesQueryKey({ address }: { address: Address }) {
  const { cluster } = useWalletUi()

  return ['get-signatures', { cluster, address }]
}

function useInvalidateGetSignaturesQuery({ address }: { address: Address }) {
  const queryClient = useQueryClient()
  const queryKey = useGetSignaturesQueryKey({ address })
  return async () => {
    await queryClient.invalidateQueries({ queryKey })
  }
}

export function useGetSignaturesQuery({ address }: { address: Address }) {
  const { client } = useWalletUi()

  return useQuery({
    queryKey: useGetSignaturesQueryKey({ address }),
    queryFn: () => client.rpc.getSignaturesForAddress(address).send(),
  })
}

async function getTokenAccountsByOwner(
  rpc: SolanaClient['rpc'],
  { address, programId }: { address: Address; programId: Address },
) {
  return await rpc
    .getTokenAccountsByOwner(address, { programId }, { commitment: 'confirmed', encoding: 'jsonParsed' })
    .send()
    .then((res) => res.value ?? [])
}

export function useGetTokenAccountsQuery({ address }: { address: Address }) {
  const { client, cluster } = useWalletUi()

  return useQuery({
    queryKey: ['get-token-accounts', { cluster, address }],
    queryFn: async () =>
      Promise.all([
        getTokenAccountsByOwner(client.rpc, { address, programId: TOKEN_PROGRAM_ADDRESS }),
        getTokenAccountsByOwner(client.rpc, { address, programId: TOKEN_2022_PROGRAM_ADDRESS }),
      ]).then(([tokenAccounts, token2022Accounts]) => [...tokenAccounts, ...token2022Accounts]),
  })
}

export function useTransferSolMutation({ address }: { address: Address }) {
  const { client } = useWalletUi()
  const signer = useWalletUiSigner()
  const invalidateBalanceQuery = useInvalidateGetBalanceQuery({ address })
  const invalidateSignaturesQuery = useInvalidateGetSignaturesQuery({ address })

  return useMutation({
    mutationFn: async (input: { destination: Address; amount: number }) => {
      try {
        const { value: latestBlockhash } = await client.rpc.getLatestBlockhash({ commitment: 'confirmed' }).send()

        const transaction = createTransaction({
          feePayer: signer,
          version: 0,
          latestBlockhash,
          instructions: [
            getTransferSolInstruction({
              amount: input.amount,
              destination: input.destination,
              source: signer,
            }),
          ],
        })

        const signatureBytes = await signAndSendTransactionMessageWithSigners(transaction)
        const signature = getBase58Decoder().decode(signatureBytes)

        console.log(signature)
        return signature
      } catch (error: unknown) {
        console.log('error', `Transaction failed! ${error}`)

        return
      }
    },
    onSuccess: async (tx) => {
      toastTx(tx)
      await Promise.all([invalidateBalanceQuery(), invalidateSignaturesQuery()])
    },
    onError: (error) => {
      toast.error(`Transaction failed! ${error}`)
    },
  })
}

export function useLogTradeMutation({ address }: { address: Address }) {
  const { client } = useWalletUi()
  const signer = useWalletUiSigner()
  const invalidateSignaturesQuery = useInvalidateGetSignaturesQuery({ address })
  const invalidateTradeEventsQuery = useInvalidateGetTradeEventsQuery()

  return useMutation({
    mutationFn: async (input: LogTradeData) => {
      try {
        const { value: latestBlockhash } = await client.rpc.getLatestBlockhash({ commitment: 'confirmed' }).send()

        // 直接使用 Codama 生成的指令  
        const timestamp = BigInt(Math.floor(Date.now() / 1000)) // 使用当前时间的秒级时间戳
        console.log('Submitting trade with timestamp:', timestamp, 'Current time:', new Date())
        const instruction = getLogTradeInstruction({
          signer: signer,
          id: input.id,
          userId: input.userId,
          fundId: input.fundId,
          tradeType: input.tradeType,
          amount: input.amount,
          price: input.price,
          timestamp: timestamp,
        })

        const transaction = createTransaction({
          feePayer: signer,
          version: 0,
          latestBlockhash,
          instructions: [instruction],
        })

        const signatureBytes = await signAndSendTransactionMessageWithSigners(transaction)
        const signature = getBase58Decoder().decode(signatureBytes)

        console.log('LogTrade transaction signature:', signature)
        return signature
      } catch (error: unknown) {
        console.log('error', `LogTrade transaction failed! ${error}`)
        throw error
      }
    },
    onSuccess: async (tx) => {
      toastTx(tx)
      toast.success('交易记录已成功提交到链上!')
      await Promise.all([invalidateSignaturesQuery(), invalidateTradeEventsQuery()])
    },
    onError: (error) => {
      toast.error(`交易记录提交失败! ${error}`)
    },
  })
}

export function useRequestAirdropMutation({ address }: { address: Address }) {
  const { client } = useWalletUi()
  const invalidateBalanceQuery = useInvalidateGetBalanceQuery({ address })
  const invalidateSignaturesQuery = useInvalidateGetSignaturesQuery({ address })
  const airdrop = airdropFactory(client)

  return useMutation({
    mutationFn: async (amount: number = 1) =>
      airdrop({
        commitment: 'confirmed',
        recipientAddress: address,
        lamports: lamports(BigInt(Math.round(amount * 1_000_000_000))),
      }),
    onSuccess: async (tx) => {
      toastTx(tx)
      await Promise.all([invalidateBalanceQuery(), invalidateSignaturesQuery()])
    },
  })
}

// ==================== TradeEvent 查询功能 ====================

export function useGetTradeEventsQuery(targetAddress?: Address) {
  const { client } = useWalletUi()

  return useQuery({
    queryKey: ['getTradeEvents', SL_TRADING_PROGRAM_ADDRESS, targetAddress],
    queryFn: async () => {
      try {
        let signaturesResponse

        if (targetAddress) {
          // 查询指定地址的交易签名
          signaturesResponse = await client.rpc
            .getSignaturesForAddress(targetAddress, {
              limit: 100, // 限制获取最近100个交易
            })
            .send()
        } else {
          // 查询程序的所有签名
          signaturesResponse = await client.rpc
            .getSignaturesForAddress(SL_TRADING_PROGRAM_ADDRESS, {
              limit: 100, // 限制获取最近100个交易
            })
            .send()
        }

        const tradeEvents: TradeEvent[] = []

        // 获取每个交易的详细信息并解析事件
        for (const sig of signaturesResponse) {
          try {
            const transactionResponse = await client.rpc
              .getTransaction(sig.signature, {
                encoding: 'jsonParsed',
                maxSupportedTransactionVersion: 0,
                commitment: 'confirmed',
              })
              .send()

            if (transactionResponse?.meta?.logMessages) {
              // 如果查询指定地址，需要检查交易是否涉及 SL_TRADING_PROGRAM
              if (targetAddress) {
                const isSlTradingTransaction = transactionResponse.meta.logMessages.some(log => 
                  log.includes(`Program ${SL_TRADING_PROGRAM_ADDRESS} invoke`) ||
                  log.includes('Trade event emitted')
                )
                if (!isSlTradingTransaction) {
                  continue // 跳过不相关的交易
                }
              }

              // 解析交易中的 Anchor 事件
              const events = parseTradeEventsFromTransaction(
                transactionResponse,
                transactionResponse.blockTime ? Number(transactionResponse.blockTime) : undefined
              )
              tradeEvents.push(...events)
            }
          } catch (error) {
            console.warn('Failed to fetch transaction:', sig.signature, error)
          }
        }

        // 按时间戳降序排序
        return tradeEvents.sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      } catch (error) {
        console.error('Error fetching trade events:', error)
        throw error
      }
    },
    staleTime: 30_000, // 30秒缓存
    refetchInterval: 60_000, // 每分钟自动刷新
  })
}

// 解析交易日志中的 TradeEvent 数据
function parseTradeEventsFromLogs(logs: readonly string[], blockTime?: number): TradeEvent[] {
  const events: TradeEvent[] = []

  for (const log of logs) {
    try {
      // 查找包含交易事件信息的日志
      if (log.includes('Trade event emitted')) {
        // 解析格式: "Trade event emitted - ID: xxx, Type: xxx, Amount: xxx, Price: xxx"
        const idMatch = log.match(/ID: ([^,]+)/)
        const typeMatch = log.match(/Type: (BUY|SELL)/)
        const amountMatch = log.match(/Amount: (\d+)/)
        const priceMatch = log.match(/Price: (\d+)/)

        if (idMatch && typeMatch && amountMatch && priceMatch) {
          // 注意：从日志中我们只能获取部分信息
          // 完整的 TradeEvent 需要包含更多字段，这里我们先用可获取的信息
          const tradeTypeValue = typeMatch[1] === 'BUY' ? TradeType.BUY : TradeType.SELL
          const event: TradeEvent = {
            id: idMatch[1].trim(),
            userId: 'unknown', // 日志中未包含，需要从程序数据解析
            fundId: 'unknown', // 日志中未包含，需要从程序数据解析
            tradeType: tradeTypeValue,
            amount: BigInt(amountMatch[1]),
            price: BigInt(priceMatch[1]),
            timestamp: BigInt(blockTime || Math.floor(Date.now() / 1000)), // 使用区块时间（秒级），如果没有则使用当前时间的秒级时间戳
          }
          events.push(event)
        }
      }
    } catch (error) {
      console.warn('Failed to parse log:', log, error)
    }
  }

  return events
}

// 解析交易中的事件数据
function parseTradeEventsFromTransaction(transactionResponse: any, blockTime?: number): TradeEvent[] {
  const events: TradeEvent[] = []

  try {
    if (transactionResponse?.meta?.logMessages) {
      // 尝试从日志中解析 Anchor 事件数据
      const anchorEvents = parseAnchorEventsFromLogs(transactionResponse.meta.logMessages, blockTime)
      events.push(...anchorEvents)
      
      // 如果没有找到 Anchor 事件，回退到日志解析（保留兼容性）
      if (events.length === 0) {
        const logEvents = parseTradeEventsFromLogs(transactionResponse.meta.logMessages, blockTime)
        events.push(...logEvents)
      }
    }
  } catch (error) {
    console.warn('Failed to parse trade events from transaction:', error)
    // 发生错误时，尝试使用日志解析作为备用
    try {
      if (transactionResponse?.meta?.logMessages) {
        const logEvents = parseTradeEventsFromLogs(transactionResponse.meta.logMessages, blockTime)
        events.push(...logEvents)
      }
    } catch (fallbackError) {
      console.warn('Fallback log parsing also failed:', fallbackError)
    }
  }

  return events
}

// 解析 Anchor 事件的新函数
function parseAnchorEventsFromLogs(logs: readonly string[], blockTime?: number): TradeEvent[] {
  const events: TradeEvent[] = []
  const eventDiscriminator = Buffer.from([189, 219, 127, 211, 78, 230, 97, 238]) // TradeEvent discriminator
  
  for (const log of logs) {
    try {
      // 查找包含 base64 编码事件数据的日志
      if (log.includes('Program data:')) {
        const match = log.match(/Program data: (.+)/)
        if (match) {
          const eventData = Buffer.from(match[1], 'base64')
          
          // 检查事件判别器
          if (eventData.length >= 8 && eventData.subarray(0, 8).equals(eventDiscriminator)) {
            // 使用生成的解码器解析事件数据
            const decoder = getTradeEventDecoder()
            const decodedEvent = decoder.decode(eventData.subarray(8))
            
            // 调试：打印原始时间戳
            console.log('Decoded event timestamp:', decodedEvent.timestamp, typeof decodedEvent.timestamp)
            console.log('Block time:', blockTime)
            
            // 处理时间戳：确保使用正确的时间
            let finalTimestamp: bigint
            
            if (decodedEvent.timestamp && decodedEvent.timestamp > 0) {
              const timestampNumber = Number(decodedEvent.timestamp)
              // 获取当前时间戳（秒级）用于对比
              const currentTime = Math.floor(Date.now() / 1000)
              
              // 如果时间戳是毫秒级（13位数字）或者远超当前时间，说明是错误的毫秒级时间戳
              if (timestampNumber > 1700000000000 || timestampNumber > currentTime + 24 * 3600) {
                // 对于错误的历史数据（毫秒值被当作秒值保存），优先使用区块时间
                console.log('Detected invalid timestamp, using block time instead')
                finalTimestamp = BigInt(blockTime || currentTime)
              } else if (timestampNumber > 1600000000) {
                // 合理的秒级时间戳（2020年之后），直接使用
                finalTimestamp = decodedEvent.timestamp
              } else {
                // 时间戳异常，使用区块时间
                finalTimestamp = BigInt(blockTime || currentTime)
              }
            } else {
              // 没有时间戳，使用区块时间
              finalTimestamp = BigInt(blockTime || Math.floor(Date.now() / 1000))
            }
            
            console.log('Final timestamp:', finalTimestamp)
            
            events.push({
              ...decodedEvent,
              timestamp: finalTimestamp
            })
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse anchor event from log:', log, error)
    }
  }
  
  return events
}

export function useInvalidateGetTradeEventsQuery() {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({
      queryKey: ['getTradeEvents'],
    })
}

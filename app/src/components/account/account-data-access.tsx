import { TOKEN_2022_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from 'gill/programs/token'
import { getTransferSolInstruction } from 'gill/programs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWalletUi } from '@wallet-ui/react'
import {
  type Address,
  address,
  airdropFactory,
  createTransaction,
  getBase58Decoder,
  lamports,
  signAndSendTransactionMessageWithSigners,
  type SolanaClient,
  type AccountRole,
} from 'gill'
import { toast } from 'sonner'
import { toastTx } from '@/components/toast-tx'
import { useWalletUiSigner } from '@/components/solana/use-wallet-ui-signer'
import { useWalletTransactionSignAndSend } from '@/components/solana/use-wallet-transaction-sign-and-send'

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

export function useLogTradeMutation({ address }: { address: Address }) {
  const { account } = useWalletUi()
  const signer = useWalletUiSigner()
  const signAndSend = useWalletTransactionSignAndSend()
  const invalidateSignaturesQuery = useInvalidateGetSignaturesQuery({ address })

  return useMutation({
    mutationFn: async (params: {
      id: string
      userId: string
      fundId: string
      tradeType: 'BUY' | 'SELL'
      amount: number
      price: number
      timestamp?: number
    }) => {
      if (!account || !signer) {
        throw new Error('请先连接钱包')
      }

      try {
        // 创建 log_trade 指令
        const instruction = createLogTradeInstruction({
          ...params,
          timestamp: params.timestamp || Date.now(),
        })

        const signature = await signAndSend(instruction, signer)
        console.log('Log trade transaction signature:', signature)
        return signature
      } catch (error: unknown) {
        console.log('error', `Log trade transaction failed! ${error}`)
        throw error
      }
    },
    onSuccess: async (tx) => {
      toastTx(tx, '交易记录提交成功')
      await invalidateSignaturesQuery()
    },
    onError: (error) => {
      toast.error(`交易记录提交失败! ${error}`)
    },
  })
}

// 创建 log_trade 指令的辅助函数
function createLogTradeInstruction(params: {
  id: string
  userId: string
  fundId: string
  tradeType: 'BUY' | 'SELL'
  amount: number
  price: number
  timestamp: number
}) {
  // 程序地址
  const PROGRAM_ID = address('19g7kgLjp6TKgtHCgs5rZseG4eeKNqhXf3AhAmRJrtW')
  
  // 指令标识符 (discriminator) - 这是 log_trade 方法的标识符
  const discriminator = new Uint8Array([70, 253, 98, 112, 79, 171, 112, 145])
  
  // 序列化参数
  const encoder = new TextEncoder()
  
  // 序列化字符串参数
  const idBytes = encoder.encode(params.id)
  const userIdBytes = encoder.encode(params.userId)
  const fundIdBytes = encoder.encode(params.fundId)
  
  // 创建字符串长度的 buffer
  const idLengthBuffer = new ArrayBuffer(4)
  const idLengthView = new DataView(idLengthBuffer)
  idLengthView.setUint32(0, idBytes.length, true)
  
  const userIdLengthBuffer = new ArrayBuffer(4)
  const userIdLengthView = new DataView(userIdLengthBuffer)
  userIdLengthView.setUint32(0, userIdBytes.length, true)
  
  const fundIdLengthBuffer = new ArrayBuffer(4)
  const fundIdLengthView = new DataView(fundIdLengthBuffer)
  fundIdLengthView.setUint32(0, fundIdBytes.length, true)
  
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
  tradeTypeView.setUint8(0, params.tradeType === 'BUY' ? 0 : 1)
  
  // 组合所有数据
  const data = new Uint8Array([
    ...discriminator,
    ...new Uint8Array(idLengthBuffer),      // id 字符串长度
    ...idBytes,                              // id 内容
    ...new Uint8Array(userIdLengthBuffer),  // userId 字符串长度
    ...userIdBytes,                          // userId 内容
    ...new Uint8Array(fundIdLengthBuffer),  // fundId 字符串长度
    ...fundIdBytes,                          // fundId 内容
    ...new Uint8Array(tradeTypeBuffer),     // 交易类型
    ...new Uint8Array(amountBuffer),        // 数量
    ...new Uint8Array(priceBuffer),         // 价格
    ...new Uint8Array(timestampBuffer),     // 时间戳
  ])
  
  return {
    programAddress: PROGRAM_ID,
    data,
    accounts: [
      { role: 'signer' as AccountRole, address: address(params.userId) },     // 用户账户
      { role: 'writable' as AccountRole, address: address(params.fundId) },   // 基金账户
      { role: 'readonly' as AccountRole, address: PROGRAM_ID }                // 程序账户
    ]
  }
}

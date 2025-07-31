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
  type TransactionSendingSigner,
  type Instruction,
} from 'gill'
import { toast } from 'sonner'
import { toastTx } from '@/components/toast-tx'
import { useWalletUiSigner } from '@/components/solana/use-wallet-ui-signer'

// ==================== Codama 自动生成的客户端 ====================
import { 
  getLogTradeInstruction as getLogTradeInstructionGenerated
} from '@/generated/instructions'
import { 
  TradeType as GeneratedTradeType
} from '@/generated/types'

// 为了保持兼容性，重新导出类型
export type TradeType = GeneratedTradeType
export const TradeType = GeneratedTradeType

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

// ==================== Gill-Style Transaction Builder 使用 Codama ====================

// Codama-enhanced instruction builder - 使用自动生成的客户端
export function getLogTradeInstruction(input: {
  id: string
  userId: string
  fundId: string
  tradeType: TradeType
  amount: bigint
  price: bigint
  timestamp?: bigint
  signer: TransactionSendingSigner
}): Instruction {
  const timestamp = input.timestamp || BigInt(Date.now())
  
  // 使用 Codama 生成的指令构建器
  return getLogTradeInstructionGenerated({
    signer: input.signer,
    id: input.id,
    userId: input.userId,
    fundId: input.fundId,
    tradeType: input.tradeType,
    amount: input.amount,
    price: input.price,
    timestamp: timestamp,
  })
}

// Transaction builder - 模仿 gill 的 transaction builders 风格
export function buildLogTradeTransaction(input: {
  id: string
  userId: string
  fundId: string
  tradeType: TradeType
  amount: bigint
  price: bigint
  timestamp?: bigint
  signer: TransactionSendingSigner
  latestBlockhash: Parameters<typeof createTransaction>[0]['latestBlockhash']
}) {
  const instruction = getLogTradeInstruction({
    id: input.id,
    userId: input.userId,
    fundId: input.fundId,
    tradeType: input.tradeType,
    amount: input.amount,
    price: input.price,
    timestamp: input.timestamp,
    signer: input.signer,
  })

  return createTransaction({
    feePayer: input.signer,
    version: 0,
    latestBlockhash: input.latestBlockhash,
    instructions: [instruction],
  })
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

  return useMutation({
    mutationFn: async (input: LogTradeData) => {
      try {
        const { value: latestBlockhash } = await client.rpc.getLatestBlockhash({ commitment: 'confirmed' }).send()

        // 使用 gill-style transaction builder
        const transaction = buildLogTradeTransaction({
          ...input,
          signer,
          latestBlockhash,
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
      await invalidateSignaturesQuery()
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

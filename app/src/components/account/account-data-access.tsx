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
  type TransactionSendingSigner,
  type Instruction,
} from 'gill'
import { toast } from 'sonner'
import { toastTx } from '@/components/toast-tx'
import { useWalletUiSigner } from '@/components/solana/use-wallet-ui-signer'

// 程序常量
const LEARN_SOLANA_PROGRAM_ADDRESS = address('19g7kgLjp6TKgtHCgs5rZseG4eeKNqhXf3AhAmRJrtW')

// logTrade 指令的 discriminator
const LOG_TRADE_DISCRIMINATOR = new Uint8Array([70, 253, 98, 112, 79, 171, 112, 145])

// 交易类型枚举
export type TradeType = { buy: {} } | { sell: {} }

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

// 序列化函数
function serializeString(str: string): Uint8Array {
  const encoded = new TextEncoder().encode(str)
  const lengthBuffer = new ArrayBuffer(4)
  const lengthView = new DataView(lengthBuffer)
  lengthView.setUint32(0, encoded.length, true)
  return new Uint8Array([...new Uint8Array(lengthBuffer), ...encoded])
}

function serializeU64(value: bigint): Uint8Array {
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setBigUint64(0, value, true)
  return new Uint8Array(buffer)
}

function serializeI64(value: bigint): Uint8Array {
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setBigInt64(0, value, true)
  return new Uint8Array(buffer)
}

function serializeTradeType(tradeType: TradeType): Uint8Array {
  if ('buy' in tradeType) {
    return new Uint8Array([0]) // BUY = 0
  } else {
    return new Uint8Array([1]) // SELL = 1
  }
}

// 创建 logTrade 指令
function createLogTradeInstruction(
  data: LogTradeData,
  signer: TransactionSendingSigner
): Instruction {
  const timestamp = data.timestamp || BigInt(Date.now())
  
  // 序列化参数
  const serializedData = new Uint8Array([
    ...LOG_TRADE_DISCRIMINATOR,
    ...serializeString(data.id),
    ...serializeString(data.userId),
    ...serializeString(data.fundId),
    ...serializeTradeType(data.tradeType),
    ...serializeU64(data.amount),
    ...serializeU64(data.price),
    ...serializeI64(timestamp),
  ])

  return {
    programAddress: LEARN_SOLANA_PROGRAM_ADDRESS,
    accounts: [
      {
        address: signer.address,
        role: 3, // AccountRole.WRITABLE_SIGNER
      },
    ],
    data: serializedData,
  }
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

        const instruction = createLogTradeInstruction(input, signer)

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

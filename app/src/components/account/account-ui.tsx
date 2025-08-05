import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { ExplorerLink } from '@/components/cluster/cluster-ui'
import { ellipsify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AppAlert } from '@/components/app-alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AppModal } from '@/components/app-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWalletUi } from '@wallet-ui/react'
import { address, Address, Lamports, lamportsToSol } from 'gill'
import { ErrorBoundary } from 'next/dist/client/components/error-boundary'
import {
  useGetBalanceQuery,
  useGetSignaturesQuery,
  useGetTokenAccountsQuery,
  useRequestAirdropMutation,
  useTransferSolMutation,
  useLogTradeMutation,
  useGetTradeEventsQuery,
  type LogTradeData,
  TradeType,
} from './account-data-access'

export function AccountBalance({ address }: { address: Address }) {
  const query = useGetBalanceQuery({ address })

  return (
    <h1 className="text-5xl font-bold cursor-pointer" onClick={() => query.refetch()}>
      {query.data?.value ? <BalanceSol balance={query.data?.value} /> : '...'} SOL
    </h1>
  )
}

export function AccountChecker() {
  const { account } = useWalletUi()
  if (!account) {
    return null
  }
  return <AccountBalanceCheck address={address(account.address)} />
}

export function AccountBalanceCheck({ address }: { address: Address }) {
  const { cluster } = useWalletUi()
  const mutation = useRequestAirdropMutation({ address })
  const query = useGetBalanceQuery({ address })

  if (query.isLoading) {
    return null
  }
  if (query.isError || !query.data?.value) {
    return (
      <AppAlert
        action={
          <Button variant="outline" onClick={() => mutation.mutateAsync(1).catch((err) => console.log(err))}>
            Request Airdrop
          </Button>
        }
      >
        You are connected to <strong>{cluster.label}</strong> but your account is not found on this cluster.
      </AppAlert>
    )
  }
  return null
}

export function AccountButtons({ address }: { address: Address }) {
  const { cluster } = useWalletUi()

  return (
    <div>
      <div className="space-x-2">
        {cluster.id === 'solana:mainnet' ? null : <ModalAirdrop address={address} />}
        <ErrorBoundary errorComponent={() => null}>
          <ModalSend address={address} />
        </ErrorBoundary>
        <ModalReceive address={address} />
        <ErrorBoundary errorComponent={() => null}>
          <ModalLogTrade address={address} />
        </ErrorBoundary>
      </div>
    </div>
  )
}

export function AccountTokens({ address }: { address: Address }) {
  const [showAll, setShowAll] = useState(false)
  const query = useGetTokenAccountsQuery({ address })
  const client = useQueryClient()
  const items = useMemo(() => {
    if (showAll) return query.data
    return query.data?.slice(0, 5)
  }, [query.data, showAll])

  return (
    <div className="space-y-2">
      <div className="justify-between">
        <div className="flex justify-between">
          <h2 className="text-2xl font-bold">Token Accounts</h2>
          <div className="space-x-2">
            {query.isLoading ? (
              <span className="loading loading-spinner"></span>
            ) : (
              <Button
                variant="outline"
                onClick={async () => {
                  await query.refetch()
                  await client.invalidateQueries({
                    queryKey: ['getTokenAccountBalance'],
                  })
                }}
              >
                <RefreshCw size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
      {query.isError && <pre className="alert alert-error">Error: {query.error?.message.toString()}</pre>}
      {query.isSuccess && (
        <div>
          {query.data.length === 0 ? (
            <div>No token accounts found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Public Key</TableHead>
                  <TableHead>Mint</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map(({ account, pubkey }) => (
                  <TableRow key={pubkey.toString()}>
                    <TableCell>
                      <div className="flex space-x-2">
                        <span className="font-mono">
                          <ExplorerLink label={ellipsify(pubkey.toString())} address={pubkey.toString()} />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <span className="font-mono">
                          <ExplorerLink
                            label={ellipsify(account.data.parsed.info.mint)}
                            address={account.data.parsed.info.mint.toString()}
                          />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono">{account.data.parsed.info.tokenAmount.uiAmount}</span>
                    </TableCell>
                  </TableRow>
                ))}

                {(query.data?.length ?? 0) > 5 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                        {showAll ? 'Show Less' : 'Show All'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  )
}

export function AccountTransactions({ address }: { address: Address }) {
  const query = useGetSignaturesQuery({ address })
  const [showAll, setShowAll] = useState(false)

  const items = useMemo(() => {
    if (showAll) return query.data
    return query.data?.slice(0, 5)
  }, [query.data, showAll])

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Transaction History</h2>
        <div className="space-x-2">
          {query.isLoading ? (
            <span className="loading loading-spinner"></span>
          ) : (
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCw size={16} />
            </Button>
          )}
        </div>
      </div>
      {query.isError && <pre className="alert alert-error">Error: {query.error?.message.toString()}</pre>}
      {query.isSuccess && (
        <div>
          {query.data.length === 0 ? (
            <div>No transactions found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Signature</TableHead>
                  <TableHead className="text-right">Slot</TableHead>
                  <TableHead>Block Time</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item) => (
                  <TableRow key={item.signature}>
                    <TableHead className="font-mono">
                      <ExplorerLink transaction={item.signature} label={ellipsify(item.signature, 8)} />
                    </TableHead>
                    <TableCell className="font-mono text-right">
                      <ExplorerLink block={item.slot.toString()} label={item.slot.toString()} />
                    </TableCell>
                    <TableCell>{new Date((Number(item.blockTime) ?? 0) * 1000).toISOString()}</TableCell>
                    <TableCell className="text-right">
                      {item.err ? (
                        <span className="text-red-500" title={JSON.stringify(item.err)}>
                          Failed
                        </span>
                      ) : (
                        <span className="text-green-500">Success</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(query.data?.length ?? 0) > 5 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                        {showAll ? 'Show Less' : 'Show All'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  )
}

function BalanceSol({ balance }: { balance: Lamports }) {
  return <span>{lamportsToSol(balance)}</span>
}

function ModalReceive({ address }: { address: Address }) {
  return (
    <AppModal title="Receive">
      <p>Receive assets by sending them to your public key:</p>
      <code>{address.toString()}</code>
    </AppModal>
  )
}

function ModalAirdrop({ address }: { address: Address }) {
  const mutation = useRequestAirdropMutation({ address })
  const [amount, setAmount] = useState('2')

  return (
    <AppModal
      title="Airdrop"
      submitDisabled={!amount || mutation.isPending}
      submitLabel="Request Airdrop"
      submit={() => mutation.mutateAsync(parseFloat(amount))}
    >
      <Label htmlFor="amount">Amount</Label>
      <Input
        disabled={mutation.isPending}
        id="amount"
        min="1"
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        step="any"
        type="number"
        value={amount}
      />
    </AppModal>
  )
}

function ModalSend(props: { address: Address }) {
  const mutation = useTransferSolMutation({ address: props.address })
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('1')

  if (!props.address) {
    return <div>Wallet not connected</div>
  }

  return (
    <AppModal
      title="Send"
      submitDisabled={!destination || !amount || mutation.isPending}
      submitLabel="Send"
      submit={async () => {
        await mutation.mutateAsync({
          destination: address(destination),
          amount: parseFloat(amount),
        })
      }}
    >
      <Label htmlFor="destination">Destination</Label>
      <Input
        disabled={mutation.isPending}
        id="destination"
        onChange={(e) => setDestination(e.target.value)}
        placeholder="Destination"
        type="text"
        value={destination}
      />
      <Label htmlFor="amount">Amount</Label>
      <Input
        disabled={mutation.isPending}
        id="amount"
        min="1"
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        step="any"
        type="number"
        value={amount}
      />
    </AppModal>
  )
}

function ModalLogTrade({ address }: { address: Address }) {
  const mutation = useLogTradeMutation({ address })
  const [tradeData, setTradeData] = useState({
    id: '',
    userId: '',
    fundId: '',
    tradeType: 'buy' as 'buy' | 'sell',
    amount: '',
    price: '',
  })

  const handleSubmit = async () => {
    const logTradeData: LogTradeData = {
      id: tradeData.id,
      userId: tradeData.userId,
      fundId: tradeData.fundId,
      tradeType: tradeData.tradeType === 'buy' ? TradeType.BUY : TradeType.SELL,
      amount: BigInt(tradeData.amount),
      price: BigInt(tradeData.price),
    }
    
    await mutation.mutateAsync(logTradeData)
  }

  const isFormValid = tradeData.id && tradeData.userId && tradeData.fundId && 
                     tradeData.amount && tradeData.price

  return (
    <AppModal
      title="记录交易"
      submitDisabled={!isFormValid || mutation.isPending}
      submitLabel="提交交易记录"
      submit={handleSubmit}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="tradeId">交易ID</Label>
          <Input
            disabled={mutation.isPending}
            id="tradeId"
            onChange={(e) => setTradeData(prev => ({ ...prev, id: e.target.value }))}
            placeholder="例如: trade-001"
            type="text"
            value={tradeData.id}
          />
        </div>
        
        <div>
          <Label htmlFor="userId">用户ID</Label>
          <Input
            disabled={mutation.isPending}
            id="userId"
            onChange={(e) => setTradeData(prev => ({ ...prev, userId: e.target.value }))}
            placeholder="例如: user-abc"
            type="text"
            value={tradeData.userId}
          />
        </div>
        
        <div>
          <Label htmlFor="fundId">基金ID</Label>
          <Input
            disabled={mutation.isPending}
            id="fundId"
            onChange={(e) => setTradeData(prev => ({ ...prev, fundId: e.target.value }))}
            placeholder="例如: fund-xyz"
            type="text"
            value={tradeData.fundId}
          />
        </div>
        
        <div>
          <Label htmlFor="tradeType">交易类型</Label>
          <select
            disabled={mutation.isPending}
            id="tradeType"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={tradeData.tradeType}
            onChange={(e) => setTradeData(prev => ({ ...prev, tradeType: e.target.value as 'buy' | 'sell' }))}
          >
            <option value="buy">买入</option>
            <option value="sell">卖出</option>
          </select>
        </div>
        
        <div>
          <Label htmlFor="amount">数量 (最小单位)</Label>
          <Input
            disabled={mutation.isPending}
            id="amount"
            onChange={(e) => setTradeData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="例如: 1000000"
            type="number"
            value={tradeData.amount}
          />
        </div>
        
        <div>
          <Label htmlFor="price">价格 (最小单位)</Label>
          <Input
            disabled={mutation.isPending}
            id="price"
            onChange={(e) => setTradeData(prev => ({ ...prev, price: e.target.value }))}
            placeholder="例如: 50000000"
            type="number"
            value={tradeData.price}
          />
        </div>
      </div>
    </AppModal>
  )
}

export function AccountTradeEvents() {
  const query = useGetTradeEventsQuery()
  const [showAll, setShowAll] = useState(false)

  const items = useMemo(() => {
    if (showAll) return query.data
    return query.data?.slice(0, 10)
  }, [query.data, showAll])

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">SL Trading 交易事件</h2>
        <div className="space-x-2">
          {query.isLoading ? (
            <span className="loading loading-spinner"></span>
          ) : (
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCw size={16} />
            </Button>
          )}
        </div>
      </div>

      {query.isError && <pre className="alert alert-error">Error: {query.error?.message.toString()}</pre>}
      
      {query.isSuccess && (
        <div>
          {query.data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>暂无交易事件记录</p>
              <p className="text-sm mt-2">使用上方的&ldquo;记录交易&rdquo;按钮来创建第一个交易记录</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>交易ID</TableHead>
                  <TableHead>用户ID</TableHead>
                  <TableHead>基金ID</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                  <TableHead className="text-right">价格</TableHead>
                  <TableHead className="text-right">时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((event, index) => (
                  <TableRow key={`${event.id}-${index}`}>
                    <TableCell className="font-mono">
                      <span title={event.id}>
                        {ellipsify(event.id, 12)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">
                      <span title={event.userId}>
                        {event.userId === 'unknown' ? '-' : ellipsify(event.userId, 8)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">
                      <span title={event.fundId}>
                        {event.fundId === 'unknown' ? '-' : ellipsify(event.fundId, 8)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        event.tradeType === TradeType.BUY 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {event.tradeType === TradeType.BUY ? '买入' : '卖出'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {event.amount.toString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {event.price.toString()}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {new Date(Number(event.timestamp) * 1000).toLocaleString('zh-CN')}
                    </TableCell>
                  </TableRow>
                ))}

                {(query.data?.length ?? 0) > 10 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                        {showAll ? '显示较少' : `显示全部 (${query.data?.length} 条)`}
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  )
}

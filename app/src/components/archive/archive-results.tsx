'use client'

import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ExplorerLink } from '@/components/cluster/cluster-ui'
import { ellipsify } from '@/lib/utils'
import { useGetTradeEventsQuery, TradeType } from '@/components/account/account-data-access'
import type { Address } from 'gill'

interface ArchiveResultsProps {
  address: Address
}

export function ArchiveResults({ address }: ArchiveResultsProps) {
  const query = useGetTradeEventsQuery(address)
  const [showAll, setShowAll] = useState(false)

  const items = useMemo(() => {
    if (showAll) return query.data
    return query.data?.slice(0, 20)
  }, [query.data, showAll])

  return (
    <div className="space-y-4">
      {/* 地址信息 */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">查询地址</h3>
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm">
            <ExplorerLink address={address.toString()} label={address.toString()} />
          </span>
        </div>
      </div>

      {/* 交易记录 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            SL Trading 交易记录
            {query.data && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                （共 {query.data.length} 条记录）
              </span>
            )}
          </h2>
          <div className="space-x-2">
            {query.isLoading ? (
              <span className="loading loading-spinner"></span>
            ) : (
              <Button variant="outline" onClick={() => query.refetch()}>
                <RefreshCw size={16} />
                刷新
              </Button>
            )}
          </div>
        </div>

        {query.isError && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-red-800 font-medium">查询失败</p>
            <p className="text-red-600 text-sm mt-1">
              {query.error?.message || '无法获取交易记录，请检查地址是否正确或稍后重试'}
            </p>
          </div>
        )}
        
        {query.isSuccess && (
          <div>
            {query.data.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-lg font-medium">未找到交易记录</p>
                <p className="text-sm mt-2">该地址暂无 SL Trading 相关的交易记录</p>
                <div className="text-xs mt-4 text-gray-400">
                  <p>• 确认地址是否正确</p>
                  <p>• 检查该地址是否参与过 SL Trading 交易</p>
                  <p>• 交易记录可能需要一些时间才能在链上确认</p>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
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
                      <TableRow key={`${event.id}-${index}`} className="hover:bg-gray-50">
                        <TableCell className="font-mono">
                          <span title={event.id}>
                            {ellipsify(event.id, 12)}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono">
                          <span title={event.userId}>
                            {event.userId === 'unknown' ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              ellipsify(event.userId, 8)
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono">
                          <span title={event.fundId}>
                            {event.fundId === 'unknown' ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              ellipsify(event.fundId, 8)
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            event.tradeType === TradeType.BUY 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {event.tradeType === TradeType.BUY ? '🟢 买入' : '🔴 卖出'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {Number(event.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {Number(event.price).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {new Date(Number(event.timestamp)).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </TableCell>
                      </TableRow>
                    ))}

                    {(query.data?.length ?? 0) > 20 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 bg-gray-50">
                          <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                            {showAll 
                              ? '显示前 20 条' 
                              : `显示全部 ${query.data?.length} 条记录`
                            }
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 
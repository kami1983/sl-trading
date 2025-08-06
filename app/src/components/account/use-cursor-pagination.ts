import { useState, useCallback } from 'react'
import { useGetTradeEventsWithCursor } from './account-data-access'
import type { Address } from 'gill'

export interface PageInfo {
  cursor?: string  // 当前页的游标
  hasNext: boolean // 是否有下一页
  hasPrev: boolean // 是否有上一页
  pageSize: number // 每页大小
  currentPage: number // 当前页码（用于显示）
}

export interface UseCursorPaginationReturn {
  pageInfo: PageInfo
  data: any[] | undefined
  isLoading: boolean
  error: any
  nextPage: () => void
  prevPage: () => void
  goToFirstPage: () => void
  refetch: () => void
}

export function useCursorPagination(
  targetAddress?: Address,
  pageSize: number = 20
): UseCursorPaginationReturn {
  // 页面历史堆栈，用于支持前进后退
  const [pageStack, setPageStack] = useState<string[]>([])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  
  // 获取当前页的游标
  const currentCursor = pageStack[currentPageIndex]
  
  // 查询当前页数据
  const query = useGetTradeEventsWithCursor(targetAddress, pageSize, currentCursor)
  
  const pageInfo: PageInfo = {
    cursor: currentCursor,
    hasNext: query.data ? query.data.length === pageSize : false,
    hasPrev: currentPageIndex > 0,
    pageSize,
    currentPage: currentPageIndex + 1,
  }

  const nextPage = useCallback(() => {
    if (query.data && query.data.length === pageSize) {
      // 获取最后一个事件的签名作为下一页的游标
      const lastEvent = query.data[query.data.length - 1]
      const nextCursor = lastEvent.signature || new Date(Number(lastEvent.timestamp) * 1000).toISOString()
      
      // 添加新页面到堆栈
      setPageStack(prev => [...prev.slice(0, currentPageIndex + 1), nextCursor])
      setCurrentPageIndex(prev => prev + 1)
    }
  }, [query.data, pageSize, currentPageIndex])

  const prevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1)
    }
  }, [currentPageIndex])

  const goToFirstPage = useCallback(() => {
    setPageStack([])
    setCurrentPageIndex(0)
  }, [])

  const refetch = useCallback(() => {
    query.refetch()
  }, [query])

  return {
    pageInfo,
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    nextPage,
    prevPage,
    goToFirstPage,
    refetch,
  }
} 
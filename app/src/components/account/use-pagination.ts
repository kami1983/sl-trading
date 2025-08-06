import { useState, useCallback } from 'react'

export interface PaginationState {
  limit: number
  before?: string
  hasMore: boolean
  isLoading: boolean
}

export interface UsePaginationReturn {
  pagination: PaginationState
  loadMore: () => void
  reset: () => void
  setHasMore: (hasMore: boolean) => void
  setLoading: (loading: boolean) => void
}

export function usePagination(initialLimit: number = 20): UsePaginationReturn {
  const [pagination, setPagination] = useState<PaginationState>({
    limit: initialLimit,
    hasMore: true,
    isLoading: false,
  })

  const loadMore = useCallback(() => {
    setPagination(prev => ({
      ...prev,
      limit: prev.limit + initialLimit,
      isLoading: true,
    }))
  }, [initialLimit])

  const reset = useCallback(() => {
    setPagination({
      limit: initialLimit,
      hasMore: true,
      isLoading: false,
    })
  }, [initialLimit])

  const setHasMore = useCallback((hasMore: boolean) => {
    setPagination(prev => ({ ...prev, hasMore }))
  }, [])

  const setLoading = useCallback((isLoading: boolean) => {
    setPagination(prev => ({ ...prev, isLoading }))
  }, [])

  return {
    pagination,
    loadMore,
    reset,
    setHasMore,
    setLoading,
  }
} 
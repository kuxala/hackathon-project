/**
 * Financial Data Cache Service
 * Handles localStorage caching for user financial data to reduce database queries
 */

interface CachedFinancialData {
  version: string
  userId: string
  lastUpdated: string
  expiresAt: string
  summary: {
    hasData: boolean
    transactionCount: number
    totalSpending: number
    totalIncome: number
    netBalance: number
    dateRange: {
      from: string
      to: string
    }
  }
  categoryBreakdown: Array<{
    category: string
    total: number
    count: number
  }>
  recentTransactions: Array<{
    date: string
    description: string
    merchant: string
    amount: number
    type: string
    category: string
  }>
}

const CACHE_VERSION = '1.0'
const CACHE_KEY_PREFIX = 'finsight_financial_data_'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Get cache key for a specific user
 */
function getCacheKey(userId: string): string {
  return `${CACHE_KEY_PREFIX}${userId}`
}

/**
 * Check if cache is valid (not expired and correct user)
 */
function isCacheValid(cache: CachedFinancialData, userId: string): boolean {
  if (cache.userId !== userId) {
    return false
  }

  if (cache.version !== CACHE_VERSION) {
    return false
  }

  const expiresAt = new Date(cache.expiresAt)
  const now = new Date()

  return expiresAt > now
}

/**
 * Get cached financial data for a user
 * Returns null if cache is invalid or doesn't exist
 */
export function getCachedFinancialData(userId: string): CachedFinancialData | null {
  if (typeof window === 'undefined') {
    return null // Server-side, no localStorage
  }

  try {
    const cacheKey = getCacheKey(userId)
    const cachedDataStr = localStorage.getItem(cacheKey)

    if (!cachedDataStr) {
      return null
    }

    const cachedData: CachedFinancialData = JSON.parse(cachedDataStr)

    if (!isCacheValid(cachedData, userId)) {
      // Invalid cache, remove it
      localStorage.removeItem(cacheKey)
      return null
    }

    console.log('[Cache] Hit: Using cached financial data for user', userId)
    return cachedData
  } catch (error) {
    console.error('[Cache] Error reading cache:', error)
    return null
  }
}

/**
 * Set cached financial data for a user
 */
export function setCachedFinancialData(
  userId: string,
  summary: {
    hasData: boolean
    transactionCount: number
    totalSpending: number
    totalIncome: number
    netBalance: number
    dateRange: {
      from: string
      to: string
    }
  },
  categoryBreakdown: Array<{
    category: string
    total: number
    count: number
  }>,
  recentTransactions: Array<{
    date: string
    description: string
    merchant: string
    amount: number
    type: string
    category: string
  }>
): void {
  if (typeof window === 'undefined') {
    return // Server-side, no localStorage
  }

  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + CACHE_TTL_MS)

    const cacheData: CachedFinancialData = {
      version: CACHE_VERSION,
      userId,
      lastUpdated: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      summary,
      categoryBreakdown,
      recentTransactions
    }

    const cacheKey = getCacheKey(userId)
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))

    console.log('[Cache] Set: Cached financial data for user', userId, 'expires at', expiresAt)
  } catch (error) {
    console.error('[Cache] Error setting cache:', error)
  }
}

/**
 * Invalidate (clear) cached financial data for a user
 * Call this when transactions are uploaded or modified
 */
export function invalidateCachedFinancialData(userId: string): void {
  if (typeof window === 'undefined') {
    return // Server-side, no localStorage
  }

  try {
    const cacheKey = getCacheKey(userId)
    localStorage.removeItem(cacheKey)
    console.log('[Cache] Invalidated: Cleared cache for user', userId)
  } catch (error) {
    console.error('[Cache] Error invalidating cache:', error)
  }
}

/**
 * Clear all financial data caches (for debugging or logout)
 */
export function clearAllFinancialCaches(): void {
  if (typeof window === 'undefined') {
    return // Server-side, no localStorage
  }

  try {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX))

    cacheKeys.forEach(key => localStorage.removeItem(key))

    console.log('[Cache] Cleared all financial data caches')
  } catch (error) {
    console.error('[Cache] Error clearing all caches:', error)
  }
}

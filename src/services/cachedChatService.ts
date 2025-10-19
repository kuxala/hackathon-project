/**
 * Cached Chat Service
 * Wraps chat API calls with localStorage caching
 */

import { getCachedFinancialData, setCachedFinancialData } from './financialDataCache'
import type { ChatMessage } from '@/lib/openrouter'

/**
 * Send a chat message with caching for financial data
 * This function checks cache first before making API calls
 */
export async function sendChatMessage(
  message: string,
  userId: string | undefined,
  history: ChatMessage[],
  authToken: string | undefined
): Promise<{
  success: boolean
  message?: string
  conversationId?: string
  error?: string
}> {
  try {
    // Check if we have cached financial data
    let userContext = null

    if (userId && authToken) {
      const cachedData = getCachedFinancialData(userId)

      if (cachedData && cachedData.summary.hasData) {
        // Use cached data
        console.log('[Chat] Using cached financial data')
        userContext = {
          transactionCount: cachedData.summary.transactionCount,
          totalSpending: cachedData.summary.totalSpending,
          totalIncome: cachedData.summary.totalIncome,
          netBalance: cachedData.summary.netBalance,
          topCategories: cachedData.categoryBreakdown,
          dateRange: cachedData.summary.dateRange,
          recentTransactions: cachedData.recentTransactions
        }
      } else {
        console.log('[Chat] No valid cache, will fetch from API')
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    // Make API call - if we have cached data, the API won't need to query DB
    // If we don't have cached data, the API will fetch from DB
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        history,
        userId,
        cachedContext: userContext // Pass cached context to API
      })
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    const data = await response.json()

    // If API returned fresh data and we don't have cache, cache it
    if (userId && data.userContext && !getCachedFinancialData(userId)) {
      setCachedFinancialData(
        userId,
        {
          hasData: true,
          transactionCount: data.userContext.transactionCount,
          totalSpending: data.userContext.totalSpending,
          totalIncome: data.userContext.totalIncome,
          netBalance: data.userContext.netBalance,
          dateRange: data.userContext.dateRange
        },
        data.userContext.topCategories || [],
        data.userContext.recentTransactions || []
      )
    }

    return {
      success: data.success,
      message: data.message,
      conversationId: data.conversationId
    }
  } catch (error) {
    console.error('Cached chat service error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get AI response'
    }
  }
}

/**
 * Send voice audio message with caching
 */
export async function sendVoiceMessage(
  transcript: string,
  userId: string | undefined,
  history: ChatMessage[],
  authToken: string | undefined,
  conversationId: string | null
): Promise<{
  success: boolean
  responseText?: string
  audioData?: string
  conversationId?: string
  error?: string
}> {
  try {
    // Check if we have cached financial data
    let userContext = null

    if (userId && authToken) {
      const cachedData = getCachedFinancialData(userId)

      if (cachedData && cachedData.summary.hasData) {
        // Use cached data
        console.log('[Voice] Using cached financial data')
        userContext = {
          transactionCount: cachedData.summary.transactionCount,
          totalSpending: cachedData.summary.totalSpending,
          totalIncome: cachedData.summary.totalIncome,
          netBalance: cachedData.summary.netBalance,
          topCategories: cachedData.categoryBreakdown,
          dateRange: cachedData.summary.dateRange,
          recentTransactions: cachedData.recentTransactions
        }
      } else {
        console.log('[Voice] No valid cache, will fetch from API')
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch('/api/voice/send-audio', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        transcript,
        history,
        userId,
        conversationId,
        cachedContext: userContext // Pass cached context to API
      })
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    const data = await response.json()

    // If API returned fresh data and we don't have cache, cache it
    if (userId && data.userContext && !getCachedFinancialData(userId)) {
      setCachedFinancialData(
        userId,
        {
          hasData: true,
          transactionCount: data.userContext.transactionCount,
          totalSpending: data.userContext.totalSpending,
          totalIncome: data.userContext.totalIncome,
          netBalance: data.userContext.netBalance,
          dateRange: data.userContext.dateRange
        },
        data.userContext.topCategories || [],
        data.userContext.recentTransactions || []
      )
    }

    return {
      success: data.success,
      responseText: data.responseText,
      audioData: data.audioData,
      conversationId: data.conversationId
    }
  } catch (error) {
    console.error('Cached voice service error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process voice message'
    }
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { sendMessage } from '@/services/chatService'
import { getUserTransactionSummary } from '@/services/chatDataService'
import type { ChatMessage } from '@/lib/openrouter'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, history, userId } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get auth token from request header
    const authHeader = request.headers.get('authorization')

    // Authenticate user if auth header is provided
    let userContext = null
    if (authHeader && userId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        })

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (!authError && user && user.id === userId) {
          // Get user's financial data summary
          const dataSummary = await getUserTransactionSummary(userId, authHeader.replace('Bearer ', ''))

          if (dataSummary && dataSummary.hasData) {
            userContext = {
              transactionCount: dataSummary.transactionCount,
              totalSpending: dataSummary.totalSpending,
              totalIncome: dataSummary.totalIncome,
              netBalance: dataSummary.netBalance,
              topCategories: dataSummary.categoryBreakdown,
              dateRange: dataSummary.dateRange,
              recentTransactions: dataSummary.recentTransactions
            }
          }
        }
      } catch (contextError) {
        // Log but don't fail if we can't get user context
        console.error('Failed to fetch user context:', contextError)
      }
    }

    // Call chat service to get AI response with user context
    const response = await sendMessage(
      message,
      typeof userId === 'string' && userId.trim() ? userId : 'anonymous',
      (history ?? []) as ChatMessage[],
      userContext
    )

    return NextResponse.json({
      success: true,
      message: response.message,
      conversationId: response.conversationId
    })
  } catch (error) {
    console.error('Chat API error:', error)

    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get AI response'
      },
      { status: 500 }
    )
  }
}

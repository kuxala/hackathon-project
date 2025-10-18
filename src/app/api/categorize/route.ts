import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { categorizeTransactionsBatch } from '@/services/aiCategorization'
import type { CategorizeTransactionsRequest, CategorizeTransactionsResponse } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/categorize - Categorize transactions using AI
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json<CategorizeTransactionsResponse>(
        { success: false, categorized: [], error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<CategorizeTransactionsResponse>(
        { success: false, categorized: [], error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    const body: CategorizeTransactionsRequest = await request.json()

    if (!body.transactions || !Array.isArray(body.transactions) || body.transactions.length === 0) {
      return NextResponse.json<CategorizeTransactionsResponse>(
        { success: false, categorized: [], error: 'transactions array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Limit batch size
    if (body.transactions.length > 100) {
      return NextResponse.json<CategorizeTransactionsResponse>(
        { success: false, categorized: [], error: 'Maximum 100 transactions per request' },
        { status: 400 }
      )
    }

    // Categorize using AI
    const categorized = await categorizeTransactionsBatch(body.transactions)

    // If transaction IDs are provided, update them in the database
    const transactionsWithIds = categorized.filter(c => c.id)

    if (transactionsWithIds.length > 0) {
      // Verify all transactions belong to user's accounts
      const transactionIds = transactionsWithIds.map(c => c.id!)

      const { data: userTransactions } = await supabase
        .from('transactions')
        .select('id, user_accounts!inner(user_id)')
        .in('id', transactionIds)
        .eq('user_accounts.user_id', user.id)

      if (!userTransactions || userTransactions.length !== transactionsWithIds.length) {
        return NextResponse.json<CategorizeTransactionsResponse>(
          { success: false, categorized: [], error: 'Some transactions not found or access denied' },
          { status: 403 }
        )
      }

      // Update transactions with categories
      const updates = categorized
        .filter(c => c.id)
        .map(c => ({
          id: c.id!,
          category: c.category,
          category_confidence: c.confidence
        }))

      // Batch update
      for (const update of updates) {
        await supabase
          .from('transactions')
          .update({
            category: update.category,
            category_confidence: update.category_confidence
          })
          .eq('id', update.id)
      }
    }

    return NextResponse.json<CategorizeTransactionsResponse>({
      success: true,
      categorized: categorized.map(c => ({
        id: c.id,
        category: c.category,
        confidence: c.confidence
      }))
    })

  } catch (error) {
    console.error('POST /api/categorize error:', error)
    return NextResponse.json<CategorizeTransactionsResponse>(
      { success: false, categorized: [], error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

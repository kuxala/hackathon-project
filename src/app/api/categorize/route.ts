import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { categorizeTransactionsBatch } from '@/services/aiFileParser'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface CategorizeRequest {
  transactionIds?: string[]
  fileName?: string
}

/**
 * POST /api/categorize - Categorize uncategorized transactions using AI
 * Returns transactions that need manual categorization if AI confidence is low
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    const body: CategorizeRequest = await request.json()

    // Build query for uncategorized transactions
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .or('category.is.null,category.eq.')

    // Filter by specific transaction IDs if provided
    if (body.transactionIds && body.transactionIds.length > 0) {
      query = query.in('id', body.transactionIds)
    }

    // Filter by file name if provided
    if (body.fileName) {
      query = query.eq('file_name', body.fileName)
    }

    const { data: transactions, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching transactions:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        categorized: 0,
        failed: [],
        message: 'No uncategorized transactions found'
      })
    }

    // Prepare transactions for AI categorization
    const transactionsToCateg = transactions.map(t => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      merchant: t.merchant
    }))

    console.log(`🤖 Categorizing ${transactionsToCateg.length} transactions with AI...`)

    // Use AI to categorize
    let categorizationResults
    try {
      categorizationResults = await categorizeTransactionsBatch(transactionsToCateg)
    } catch (aiError) {
      console.error('AI categorization failed:', aiError)
      // Return transactions that need manual categorization
      return NextResponse.json({
        success: false,
        needsManualCategorization: true,
        transactions: transactions.map(t => ({
          id: t.id,
          description: t.description,
          merchant: t.merchant,
          amount: t.amount,
          transaction_type: t.transaction_type
        })),
        error: 'AI categorization failed. Please categorize manually.'
      })
    }

    // Filter results - only update high confidence categorizations (>60%)
    const lowConfidenceTransactions = transactions.filter((_, idx) => {
      const result = categorizationResults[idx]
      return !result || !result.confidence || result.confidence <= 0.6
    })

    console.log(`✅ High confidence: ${transactions.length - lowConfidenceTransactions.length}, Low confidence: ${lowConfidenceTransactions.length}`)

    // Update high confidence transactions
    const updates = []
    const failed = []

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i]
      const result = categorizationResults[i]

      if (result && result.confidence && result.confidence > 0.6) {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            category: result.category,
            category_confidence: result.confidence,
            merchant: result.merchant || transaction.merchant
          })
          .eq('id', transaction.id)

        if (updateError) {
          console.error('Failed to update transaction:', updateError)
          failed.push(transaction.id)
        } else {
          updates.push(transaction.id)
        }
      }
    }

    // If there are low confidence transactions, return them for manual categorization
    if (lowConfidenceTransactions.length > 0) {
      return NextResponse.json({
        success: true,
        categorized: updates.length,
        needsManualCategorization: true,
        transactions: lowConfidenceTransactions.map(t => ({
          id: t.id,
          description: t.description,
          merchant: t.merchant,
          amount: t.amount,
          transaction_type: t.transaction_type,
          category: t.category
        })),
        message: `${updates.length} transactions categorized. ${lowConfidenceTransactions.length} need manual review.`
      })
    }

    return NextResponse.json({
      success: true,
      categorized: updates.length,
      failed,
      message: `Successfully categorized ${updates.length} transactions`
    })

  } catch (error) {
    console.error('POST /api/categorize error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/categorize - Manually update transaction categories
 */
export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    const { categorizations }: { categorizations: { [id: string]: string } } = await request.json()

    if (!categorizations || Object.keys(categorizations).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No categorizations provided' },
        { status: 400 }
      )
    }

    // Update each transaction
    const updates = []
    const failed = []

    for (const [id, category] of Object.entries(categorizations)) {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          category,
          category_confidence: 1.0 // Manual categorization has 100% confidence
        })
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user owns this transaction

      if (updateError) {
        console.error('Failed to update transaction:', updateError)
        failed.push(id)
      } else {
        updates.push(id)
      }
    }

    return NextResponse.json({
      success: true,
      updated: updates.length,
      failed,
      message: `Successfully updated ${updates.length} transactions`
    })

  } catch (error) {
    console.error('PUT /api/categorize error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

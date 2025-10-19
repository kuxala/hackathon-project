import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateInsights } from '@/services/insightsGenerator'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/generate-all-insights
 * Generate insights for the current user from their transactions
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

    console.log(`🔄 Generating insights for user ${user.id}...`)

    // Fetch all transactions for the user
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })

    if (txError) {
      console.error('❌ Error fetching transactions:', txError)
      return NextResponse.json(
        { success: false, error: `Failed to fetch transactions: ${txError.message}` },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No transactions found',
        insights: []
      })
    }

    console.log(`📊 Found ${transactions.length} transactions`)

    // Delete existing insights for this user to avoid duplicates
    await supabase
      .from('ai_insights')
      .delete()
      .eq('user_id', user.id)

    console.log('🗑️ Deleted old insights')

    // Generate new insights
    const generatedInsights = await generateInsights(transactions, user.id)

    console.log(`✨ Generated ${generatedInsights.length} insights`)

    // Store insights in database
    const insightsToInsert = generatedInsights.map(insight => ({
      user_id: insight.user_id!,
      insight_type: insight.insight_type!,
      title: insight.title!,
      description: insight.description!,
      data: insight.data!,
      severity: insight.severity || 'info',
      is_read: false,
      is_dismissed: false
    }))

    const { data: storedInsights, error: insertError } = await supabase
      .from('ai_insights')
      .insert(insightsToInsert)
      .select()

    if (insertError) {
      console.error('❌ Error storing insights:', insertError)
      return NextResponse.json(
        { success: false, error: `Failed to store insights: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully stored ${storedInsights?.length || 0} insights`)

    // Check if spending_pattern was created
    const spendingPattern = storedInsights?.find(i => i.insight_type === 'spending_pattern')

    return NextResponse.json({
      success: true,
      message: `Generated ${storedInsights?.length || 0} insights from ${transactions.length} transactions`,
      insights: storedInsights,
      hasSpendingPattern: !!spendingPattern,
      chartData: spendingPattern?.data
    })

  } catch (error) {
    console.error('❌ Generate insights error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

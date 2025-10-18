import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateInsights } from '@/services/insightsGenerator'
import type { GenerateInsightsRequest, GenerateInsightsResponse } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/insights - Generate AI insights for user's transactions
 */
export async function POST(request: Request) {
  try {

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json<GenerateInsightsResponse>(
        { success: false, insights: [], error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<GenerateInsightsResponse>(
        { success: false, insights: [], error: 'Invalid authentication' },
        { status: 401 }
      )
    }


    const body: GenerateInsightsRequest = await request.json()

    // Build transaction query (simplified - no user_accounts table)
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)


    // Apply time period filter
    if (body.time_period) {
      const now = new Date()
      let startDate: Date

      switch (body.time_period) {
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // Default 90 days
      }

      query = query.gte('transaction_date', startDate.toISOString().split('T')[0])
    }

    const { data: transactions, error: txError } = await query

    if (txError) {
      console.error('❌ Fetch transactions error:', txError)
      return NextResponse.json<GenerateInsightsResponse>(
        { success: false, insights: [], error: txError.message },
        { status: 500 }
      )
    }


    if (!transactions || transactions.length === 0) {
      return NextResponse.json<GenerateInsightsResponse>(
        {
          success: true,
          insights: [{
            id: 'no-data',
            user_id: user.id,
            insight_type: 'spending_pattern',
            title: 'No Transactions Found',
            description: 'Upload bank statements to start receiving personalized insights.',
            data: {},
            severity: 'info',
            is_read: false,
            is_dismissed: false,
            generated_at: new Date().toISOString()
          }]
        }
      )
    }


    // Generate insights (no account_id needed)
    const generatedInsights = await generateInsights(
      transactions,
      user.id
    )


    // Store insights in database (no account_id in simplified schema)
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
      console.error('❌ Insert insights error:', insertError)
      // Return generated insights even if storage fails
      return NextResponse.json<GenerateInsightsResponse>({
        success: true,
        insights: generatedInsights.map(i => ({
          ...i,
          id: 'temp-' + Math.random(),
          generated_at: new Date().toISOString()
        })) as any
      })
    }


    return NextResponse.json<GenerateInsightsResponse>({
      success: true,
      insights: storedInsights
    })

  } catch (error) {
    console.error('POST /api/insights error:', error)
    return NextResponse.json<GenerateInsightsResponse>(
      { success: false, insights: [], error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/insights - Fetch stored insights
 */
export async function GET(request: Request) {
  try {

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json<GenerateInsightsResponse>(
        { success: false, insights: [], error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<GenerateInsightsResponse>(
        { success: false, insights: [], error: 'Invalid authentication' },
        { status: 401 }
      )
    }


    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')


    let query = supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_dismissed', false)
      .order('generated_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data: insights, error } = await query

    if (error) {
      console.error('❌ Fetch insights error:', error)
      return NextResponse.json<GenerateInsightsResponse>(
        { success: false, insights: [], error: error.message },
        { status: 500 }
      )
    }


    return NextResponse.json<GenerateInsightsResponse>({
      success: true,
      insights: insights || []
    })

  } catch (error) {
    console.error('GET /api/insights error:', error)
    return NextResponse.json<GenerateInsightsResponse>(
      { success: false, insights: [], error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

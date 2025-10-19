import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Helper to extract numbers from text
function extractNumber(text: string): number | null {
  const matches = text.match(/\d+/)
  return matches ? parseInt(matches[0]) : null
}

export async function POST(request: Request) {
  try {
    const { transcript } = await request.json()
    const authHeader = request.headers.get('authorization')

    // Auth check
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid auth' }, { status: 401 })
    }

    const text = transcript.toLowerCase().trim()

    // KEYWORD MATCHING - Simple & Fast

    // Navigation intents
    if (text.includes('dashboard') || text.includes('home')) {
      return NextResponse.json({
        type: 'navigation',
        path: '/dashboard',
        voice_reply: 'Opening dashboard',
        success: true
      })
    }

    if (text.includes('statement') || text.includes('upload')) {
      return NextResponse.json({
        type: 'navigation',
        path: '/statements',
        voice_reply: 'Opening statements',
        success: true
      })
    }

    if (text.includes('insight')) {
      return NextResponse.json({
        type: 'navigation',
        path: '/dashboard/insights',
        voice_reply: 'Opening insights',
        success: true
      })
    }

    // Balance query
    if (text.includes('balance')) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('balance')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .limit(1)
        .single()

      const balance = transactions?.balance || 0

      return NextResponse.json({
        type: 'query_result',
        data: { balance },
        voice_reply: `Your balance is ${balance.toFixed(2)} lari`,
        success: true
      })
    }

    // Latest transactions
    if (text.includes('transaction') || text.includes('recent') || text.includes('last')) {
      const limit = extractNumber(text) || 5

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .limit(limit)

      return NextResponse.json({
        type: 'query_result',
        data: { transactions },
        voice_reply: `Here are your last ${transactions?.length || 0} transactions`,
        success: true
      })
    }

    // Spending summary
    if (text.includes('spend') || text.includes('spent')) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, category')
        .eq('user_id', user.id)
        .lt('amount', 0)
        .order('transaction_date', { ascending: false })
        .limit(100)

      const total = transactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

      return NextResponse.json({
        type: 'query_result',
        data: { total_spending: total, transactions },
        voice_reply: `You've spent ${total.toFixed(2)} lari`,
        success: true
      })
    }

    // Income query
    if (text.includes('income') || text.includes('earned')) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .gt('amount', 0)
        .order('transaction_date', { ascending: false })
        .limit(100)

      const total = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0

      return NextResponse.json({
        type: 'query_result',
        data: { total_income: total, transactions },
        voice_reply: `You've earned ${total.toFixed(2)} lari`,
        success: true
      })
    }

    // Fallback to AI chat
    return NextResponse.json({
      type: 'ai_reply',
      data: { message: transcript },
      voice_reply: 'Let me think about that. Try asking about your balance, transactions, or spending.',
      success: true
    })

  } catch (error) {
    console.error('Intent error:', error)
    return NextResponse.json(
      { error: 'Failed to process intent', success: false },
      { status: 500 }
    )
  }
}

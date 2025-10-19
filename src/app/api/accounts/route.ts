import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { CreateAccountRequest } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * GET /api/accounts - List all user accounts
 */
export async function GET(request: Request) {
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

    // Fetch user accounts with statistics
    const { data: accounts, error } = await supabase
      .from('user_accounts')
      .select(`
        *,
        bank_statements (
          id,
          transaction_count,
          total_credits,
          total_debits
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch accounts error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Calculate aggregate statistics for each account
    const accountsWithStats = accounts.map(account => {
      const statements = account.bank_statements || []
      const totalTransactions = statements.reduce((sum, s) => sum + (s.transaction_count || 0), 0)
      const totalCredits = statements.reduce((sum, s) => sum + (s.total_credits || 0), 0)
      const totalDebits = statements.reduce((sum, s) => sum + (s.total_debits || 0), 0)

      return {
        ...account,
        stats: {
          totalStatements: statements.length,
          totalTransactions,
          totalCredits,
          totalDebits,
          netBalance: totalCredits - totalDebits
        },
        bank_statements: undefined // Remove from response
      }
    })

    return NextResponse.json({
      success: true,
      accounts: accountsWithStats
    })

  } catch (error) {
    console.error('GET /api/accounts error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/accounts - Create new account
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

    const body: CreateAccountRequest = await request.json()

    // Validate required fields
    if (!body.account_name || !body.account_type) {
      return NextResponse.json(
        { success: false, error: 'account_name and account_type are required' },
        { status: 400 }
      )
    }

    // Validate account_type
    const validTypes = ['checking', 'savings', 'credit_card', 'investment', 'other']
    if (!validTypes.includes(body.account_type)) {
      return NextResponse.json(
        { success: false, error: `Invalid account_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Create account
    const { data: account, error } = await supabase
      .from('user_accounts')
      .insert({
        user_id: user.id,
        account_name: body.account_name,
        account_type: body.account_type,
        currency: body.currency || 'USD',
        institution_name: body.institution_name,
        account_number_last4: body.account_number_last4,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Create account error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      account
    })

  } catch (error) {
    console.error('POST /api/accounts error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

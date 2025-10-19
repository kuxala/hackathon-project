import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { GetTransactionsQuery, GetTransactionsResponse } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * GET /api/transactions - Fetch transactions with filtering
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json<GetTransactionsResponse>(
        { success: false, transactions: [], total: 0, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<GetTransactionsResponse>(
        { success: false, transactions: [], total: 0, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const query: GetTransactionsQuery = {
      account_id: searchParams.get('account_id') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      category: searchParams.get('category') || undefined,
      min_amount: searchParams.get('min_amount') ? parseFloat(searchParams.get('min_amount')!) : undefined,
      max_amount: searchParams.get('max_amount') ? parseFloat(searchParams.get('max_amount')!) : undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    }

    // Build query (simplified - no joins needed)
    let queryBuilder = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)

    // Apply filters
    if (query.account_id) {
      queryBuilder = queryBuilder.eq('account_id', query.account_id)
    }

    if (query.start_date) {
      queryBuilder = queryBuilder.gte('transaction_date', query.start_date)
    }

    if (query.end_date) {
      queryBuilder = queryBuilder.lte('transaction_date', query.end_date)
    }

    if (query.category) {
      queryBuilder = queryBuilder.eq('category', query.category)
    }

    if (query.min_amount !== undefined) {
      queryBuilder = queryBuilder.gte('amount', query.min_amount)
    }

    if (query.max_amount !== undefined) {
      queryBuilder = queryBuilder.lte('amount', query.max_amount)
    }

    if (query.search) {
      // Search in description and merchant
      queryBuilder = queryBuilder.or(`description.ilike.%${query.search}%,merchant.ilike.%${query.search}%`)
    }

    // Pagination and sorting
    queryBuilder = queryBuilder
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1)

    const { data: transactions, error, count } = await queryBuilder

    if (error) {
      console.error('Fetch transactions error:', error)
      return NextResponse.json<GetTransactionsResponse>(
        { success: false, transactions: [], total: 0, error: error.message },
        { status: 500 }
      )
    }

    // Remove the joined user_accounts data from response
    const cleanTransactions = transactions.map(({ user_accounts: _user_accounts, ...transaction }) => transaction)

    return NextResponse.json<GetTransactionsResponse>({
      success: true,
      transactions: cleanTransactions,
      total: count || 0
    })

  } catch (error) {
    console.error('GET /api/transactions error:', error)
    return NextResponse.json<GetTransactionsResponse>(
      { success: false, transactions: [], total: 0, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/transactions - Create manual transaction
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

    const body = await request.json()

    // Validate required fields
    if (!body.account_id || !body.transaction_date || !body.description || body.amount === undefined || !body.transaction_type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: account_id, transaction_date, description, amount, transaction_type' },
        { status: 400 }
      )
    }

    // Verify account belongs to user
    const { data: account } = await supabase
      .from('user_accounts')
      .select('id')
      .eq('id', body.account_id)
      .eq('user_id', user.id)
      .single()

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found or access denied' },
        { status: 403 }
      )
    }

    // Create transaction
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        account_id: body.account_id,
        transaction_date: body.transaction_date,
        post_date: body.post_date,
        description: body.description,
        amount: body.amount,
        transaction_type: body.transaction_type,
        category: body.category,
        merchant: body.merchant,
        balance: body.balance,
        notes: body.notes,
        is_manual: true
      })
      .select()
      .single()

    if (error) {
      console.error('Create transaction error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      transaction
    })

  } catch (error) {
    console.error('POST /api/transactions error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

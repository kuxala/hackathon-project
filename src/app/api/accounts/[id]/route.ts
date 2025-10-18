import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * PATCH /api/accounts/[id] - Update account
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Verify account belongs to user
    const { data: existingAccount } = await supabase
      .from('user_accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingAccount) {
      return NextResponse.json(
        { success: false, error: 'Account not found or access denied' },
        { status: 404 }
      )
    }

    // Update account
    const { data: account, error } = await supabase
      .from('user_accounts')
      .update({
        account_name: body.account_name,
        account_type: body.account_type,
        currency: body.currency,
        institution_name: body.institution_name,
        account_number_last4: body.account_number_last4,
        is_active: body.is_active
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update account error:', error)
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
    console.error('PATCH /api/accounts/[id] error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/accounts/[id] - Delete (soft delete) account
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Verify account belongs to user
    const { data: existingAccount } = await supabase
      .from('user_accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingAccount) {
      return NextResponse.json(
        { success: false, error: 'Account not found or access denied' },
        { status: 404 }
      )
    }

    // Soft delete - set is_active to false
    const { error } = await supabase
      .from('user_accounts')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Delete account error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })

  } catch (error) {
    console.error('DELETE /api/accounts/[id] error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

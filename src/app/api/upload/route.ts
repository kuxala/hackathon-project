import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { UploadStatementResponse } from '@/types/database'

// Server-side Supabase client with service role
// For file upload, we need service role to bypass RLS temporarily
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json<UploadStatementResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create supabase client with user's auth token
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<UploadStatementResponse>(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const parsedData = formData.get('parsed_data') as string

    if (!file) {
      return NextResponse.json<UploadStatementResponse>(
        { success: false, error: 'Missing file' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json<UploadStatementResponse>(
        { success: false, error: 'Invalid file type. Only CSV, Excel, and PDF files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json<UploadStatementResponse>(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Parse preview data to get detected bank and transactions
    let detectedBank = 'Unknown Bank'
    let accountNumber: string | undefined
    let parsedTransactions: any[] = []

    if (parsedData) {
      try {
        const parsed = JSON.parse(parsedData)
        detectedBank = parsed.detectedBank || 'Unknown Bank'
        accountNumber = parsed.accountNumber
        parsedTransactions = parsed.transactions || []

        console.log('📊 PARSED DATA:', {
          detectedBank,
          accountNumber,
          transactionCount: parsedTransactions.length,
          periodStart: parsed.periodStart,
          periodEnd: parsed.periodEnd,
          totalCredits: parsed.totalCredits,
          totalDebits: parsed.totalDebits,
          firstTransaction: parsedTransactions[0],
        })
      } catch (e) {
        console.error('❌ Failed to parse data:', e)
      }
    } else {
      console.warn('⚠️ No parsed data provided')
    }

    // Generate unique file path (no account needed)
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name}`
    const filePath = `${user.id}/${fileName}`

    // Upload file to Supabase Storage
    const fileBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('bank-statements')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json<UploadStatementResponse>(
        { success: false, error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('bank-statements')
      .getPublicUrl(filePath)

    // Store transactions directly (simplified - no accounts/statements tables needed)
    if (parsedTransactions.length > 0) {
      console.log(`💾 Attempting to insert ${parsedTransactions.length} transactions`)

      // Insert transactions with bank metadata
      const transactionsToInsert = parsedTransactions.map((tx: any) => ({
        user_id: user.id,
        bank_name: detectedBank,
        account_number: accountNumber,
        transaction_date: tx.date,
        description: tx.description,
        merchant: tx.merchant,
        amount: tx.amount,
        transaction_type: tx.type,
        balance: tx.balance,
        file_url: publicUrl,
        file_name: file.name
      }))

      console.log('🔍 First transaction to insert:', transactionsToInsert[0])
      console.log('👤 User ID:', user.id)

      // Insert in batches of 100
      for (let i = 0; i < transactionsToInsert.length; i += 100) {
        const batch = transactionsToInsert.slice(i, i + 100)
        console.log(`📤 Inserting batch ${Math.floor(i/100) + 1} (${batch.length} transactions)`)

        const { error: insertError, data: insertData } = await supabase
          .from('transactions')
          .insert(batch)
          .select()

        if (insertError) {
          console.error('❌ Transaction insert error:', {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code,
            batchSample: batch[0]
          })
          return NextResponse.json<UploadStatementResponse>(
            { success: false, error: `Failed to save transactions: ${insertError.message}. Details: ${insertError.details || 'No details'}. Hint: ${insertError.hint || 'Check RLS policies'}` },
            { status: 500 }
          )
        }

        console.log(`✅ Successfully inserted batch ${Math.floor(i/100) + 1}:`, insertData?.length || 0, 'records')
      }

      console.log(`✅ All ${parsedTransactions.length} transactions inserted successfully`)
    } else {
      console.warn('⚠️ No transactions found in file - file uploaded but no data extracted')
    }

    // Parse preview data for response
    let preview
    if (parsedData) {
      try {
        const parsed = JSON.parse(parsedData)
        preview = {
          transactions: parsed.transactions,
          periodStart: parsed.periodStart,
          periodEnd: parsed.periodEnd,
          totalCredits: parsed.totalCredits,
          totalDebits: parsed.totalDebits,
          detectedBank,
          accountNumber
        }
      } catch (e) {
        console.error('Failed to parse preview data:', e)
      }
    }

    return NextResponse.json<UploadStatementResponse>({
      success: true,
      statement_id: `${timestamp}`, // Use timestamp as ID
      preview
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json<UploadStatementResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

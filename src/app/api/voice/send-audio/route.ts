import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { textToSpeech } from '@/services/elevenlabsService'
import { sendMessage } from '@/services/chatService'
import { getUserTransactionSummary } from '@/services/chatDataService'
import type { ChatMessage } from '@/lib/openrouter'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { transcript, userId, history, conversationId, cachedContext } = body

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      )
    }

    // Get auth token from request header
    const authHeader = request.headers.get('authorization')

    // Use cached context if provided, otherwise fetch from database
    let userContext = cachedContext || null
    let fetchedFromDB = false

    // Only fetch from DB if we don't have cached context
    if (!userContext && authHeader && userId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        })

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (!authError && user && user.id === userId) {
          console.log('[Voice API] Cache miss: Fetching financial data from database')
          // Get user's financial data summary
          const dataSummary = await getUserTransactionSummary(
            userId,
            authHeader.replace('Bearer ', '')
          )

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
            fetchedFromDB = true
          }
        }
      } catch (contextError) {
        console.error('Failed to fetch user context:', contextError)
      }
    } else if (userContext) {
      console.log('[Voice API] Cache hit: Using cached financial data')
    }

    // Modify the transcript to request concise responses for voice
    const voicePrompt = `${transcript}\n\n[VOICE MODE: Provide a brief, conversational response in 2-3 sentences maximum. Speak naturally in English only. Do not include dates, numbers with commas, or special characters. Keep it simple and clear for voice.]`

    // Get AI text response using existing chat service
    const chatResponse = await sendMessage(
      voicePrompt,
      userId || 'anonymous',
      (history ?? []) as ChatMessage[],
      userContext
    )

    // Convert the AI response to speech
    const audioBuffer = await textToSpeech(chatResponse.message)

    // Convert buffer to base64 for transmission
    const audioBase64 = audioBuffer.toString('base64')

    return NextResponse.json({
      success: true,
      transcript,
      responseText: chatResponse.message,
      audioData: audioBase64,
      conversationId: conversationId || chatResponse.conversationId,
      // Return user context if we fetched from DB (for caching on client)
      userContext: fetchedFromDB ? userContext : undefined
    })
  } catch (error) {
    console.error('Send audio error:', error)

    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process audio'
      },
      { status: 500 }
    )
  }
}

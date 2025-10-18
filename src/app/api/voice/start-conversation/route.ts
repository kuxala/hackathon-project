import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { startConversation } from '@/services/elevenlabsService'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId } = body

    // Get auth token from request header
    const authHeader = request.headers.get('authorization')

    // Authenticate user if auth header is provided
    if (authHeader && userId) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      })

      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user || user.id !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Start a new conversation session
    const session = await startConversation(userId || 'anonymous')

    return NextResponse.json({
      success: true,
      conversationId: session.conversationId,
      agentId: session.agentId
    })
  } catch (error) {
    console.error('Start conversation error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start conversation'
      },
      { status: 500 }
    )
  }
}

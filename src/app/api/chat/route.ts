import { NextResponse } from 'next/server'

import { sendMessage } from '@/services/chatService'
import type { ChatMessage } from '@/lib/openrouter'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, history, userId } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Call chat service to get AI response
    const response = await sendMessage(
      message,
      typeof userId === 'string' && userId.trim() ? userId : 'anonymous',
      (history ?? []) as ChatMessage[]
    )

    return NextResponse.json({
      success: true,
      message: response.message,
      conversationId: response.conversationId
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get AI response' },
      { status: 500 }
    )
  }
}

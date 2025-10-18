import { NextResponse } from 'next/server'
import { chat, type ChatMessage } from '@/lib/openrouter'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, history } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Call OpenRouter API with DeepSeek model
    const response = await chat(message, history as ChatMessage[] || [])

    return NextResponse.json({
      success: true,
      message: response
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get AI response' },
      { status: 500 }
    )
  }
}

// OpenRouter API client for DeepSeek model

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
}

export async function createChatCompletion(request: ChatCompletionRequest) {



  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'Hackathon App'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${error}`)
  }

  return response.json()
}

// Helper function for simple chat
export async function chat(userMessage: string, conversationHistory: ChatMessage[] = []) {
  // Check if conversation history already has a system message
  const hasSystemMessage = conversationHistory.some(msg => msg.role === 'system')

  const messages: ChatMessage[] = [
    // Only add default system message if one doesn't exist
    ...(hasSystemMessage ? [] : [{
      role: 'system' as const,
      content: 'You are a helpful AI assistant. Be concise and friendly.'
    }]),
    ...conversationHistory,
    {
      role: 'user',
      content: userMessage
    }
  ]

  const response = await createChatCompletion({
    model: 'openai/gpt-4o-mini', // OpenAI GPT-4o Mini ($0.15/1M input, $0.60/1M output - very cheap & fast)
    messages,
    temperature: 0.7,
    max_tokens: 1000
  })

  return response.choices[0].message.content
}

// Helper function for structured data analysis - FAST model for parsing
export async function analyzeWithGemini(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.1,
  maxTokens: number = 2000
) {
  const response = await createChatCompletion({
    model: 'openai/gpt-4o-mini', // Fast & cheap for structured data ($0.15/1M tokens) 
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ],
    temperature,
    max_tokens: maxTokens
  })

  return response.choices[0].message.content
}

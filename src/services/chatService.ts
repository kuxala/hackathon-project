import { chat as openrouterChat, type ChatMessage } from '@/lib/openrouter'
import { supabase } from '@/lib/supabase'

/**
 * Chat Service
 * Handles AI chat interactions and conversation history
 */

export interface ChatResponse {
  message: string
  conversationId?: string
}

/**
 * Send a message to AI and get response
 */
export async function sendMessage(
  userMessage: string,
  userId: string,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  try {
    // Get AI response from OpenRouter
    const aiResponse = await openrouterChat(userMessage, conversationHistory)

    // Optionally: Save conversation to database
    // await saveConversation(userId, userMessage, aiResponse)

    return {
      message: aiResponse
    }
  } catch (error) {
    console.error('Chat service error:', error)
    throw new Error('Failed to get AI response')
  }
}

/**
 * Save conversation to database (optional)
 */
export async function saveConversation(
  userId: string,
  userMessage: string,
  aiResponse: string
) {
  try {
    const { error } = await supabase
      .from('conversations')
      .insert([
        {
          user_id: userId,
          role: 'user',
          content: userMessage
        },
        {
          user_id: userId,
          role: 'assistant',
          content: aiResponse
        }
      ])

    if (error) throw error
  } catch (error) {
    console.error('Failed to save conversation:', error)
    // Don't throw - saving is optional
  }
}

/**
 * Get user's conversation history
 */
export async function getConversationHistory(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw error
  return data
}

/**
 * Clear conversation history
 */
export async function clearConversationHistory(userId: string) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('user_id', userId)

  if (error) throw error
}

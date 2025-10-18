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

export interface UserFinancialContext {
  transactionCount: number
  totalSpending: number
  totalIncome: number
  netBalance: number
  topCategories: Array<{
    category: string
    total: number
    count: number
  }>
  dateRange: {
    from: string
    to: string
  }
  recentTransactions: Array<{
    date: string
    description: string
    merchant?: string
    amount: number
    type: string
    category?: string
  }>
}

/**
 * Send a message to AI and get response
 */
export async function sendMessage(
  userMessage: string,
  userId: string,
  conversationHistory: ChatMessage[] = [],
  userContext?: UserFinancialContext | null
): Promise<ChatResponse> {
  try {
    // Build enhanced conversation history with system context
    const enhancedHistory: ChatMessage[] = []

    // Add system message with user's financial context if available
    if (userContext) {
      const systemMessage: ChatMessage = {
        role: 'system',
        content: `You are FinSight Assistant, a helpful financial advisor AI. You have access to the user's financial data.

USER'S FINANCIAL SUMMARY:
- Total transactions: ${userContext.transactionCount}
- Date range: ${userContext.dateRange.from} to ${userContext.dateRange.to}
- Total income: $${userContext.totalIncome.toFixed(2)}
- Total spending: $${userContext.totalSpending.toFixed(2)}
- Net balance: $${userContext.netBalance.toFixed(2)}

TOP SPENDING CATEGORIES:
${userContext.topCategories.map((cat, idx) => `${idx + 1}. ${cat.category}: $${cat.total.toFixed(2)} (${cat.count} transactions)`).join('\n')}

RECENT TRANSACTIONS:
${userContext.recentTransactions.slice(0, 3).map((tx, idx) => `${idx + 1}. ${tx.date} - ${tx.description || tx.merchant} - $${tx.amount.toFixed(2)} (${tx.type})`).join('\n')}

When answering questions:
- Use this data to provide personalized, specific answers about their finances
- Refer to actual numbers and categories when relevant
- Be conversational and friendly
- Provide actionable insights and advice
- If asked about specific transactions or details not in this summary, acknowledge what you know and suggest they can upload more statements for complete data`
      }
      enhancedHistory.push(systemMessage)
    } else {
      // Default system message when no user data is available
      const systemMessage: ChatMessage = {
        role: 'system',
        content: `You are FinSight Assistant, a helpful financial advisor AI.

The user hasn't uploaded any financial data yet. Encourage them to upload their bank statements to get personalized insights and answers about their spending, income, and financial patterns.

Be friendly, helpful, and focus on explaining how FinSight can help them manage their finances better.`
      }
      enhancedHistory.push(systemMessage)
    }

    // Add conversation history
    enhancedHistory.push(...conversationHistory)

    // Get AI response from OpenRouter
    const aiResponse = await openrouterChat(userMessage, enhancedHistory)

    if (!aiResponse) {
      throw new Error('Empty response from AI')
    }

    // Optionally: Save conversation to database
    // await saveConversation(userId, userMessage, aiResponse)

    return {
      message: aiResponse
    }
  } catch (error) {
    console.error('Chat service error:', error)
    // Provide more specific error message
    if (error instanceof Error) {
      throw new Error(`Chat service failed: ${error.message}`)
    }
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

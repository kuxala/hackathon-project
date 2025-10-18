import { sendMessage } from './chatService'

export interface TransactionToCategorize {
  id?: string
  description: string
  amount: number
  merchant?: string
}

export interface CategorizedTransaction {
  id?: string
  category: string
  confidence: number
  reasoning?: string
}

// Default categories from our database
const CATEGORIES = [
  'Income',
  'Food & Dining',
  'Transportation',
  'Bills & Utilities',
  'Shopping',
  'Entertainment',
  'Healthcare',
  'Travel',
  'Education',
  'Personal Care',
  'Insurance',
  'Subscriptions',
  'Other'
]

/**
 * Categorize a single transaction using AI
 */
export async function categorizeTransaction(
  transaction: TransactionToCategorize
): Promise<CategorizedTransaction> {
  const prompt = `You are a financial transaction categorization expert. Analyze the following transaction and categorize it.

Transaction Details:
- Description: ${transaction.description}
- Amount: $${transaction.amount}
${transaction.merchant ? `- Merchant: ${transaction.merchant}` : ''}

Available Categories:
${CATEGORIES.map((cat, i) => `${i + 1}. ${cat}`).join('\n')}

Please respond in JSON format with:
{
  "category": "exact category name from the list",
  "confidence": 0.95,
  "reasoning": "brief explanation"
}

Choose the most appropriate category. Confidence should be 0.0 to 1.0.`

  try {
    const response = await sendMessage(prompt, 'categorization-bot', [])

    // Parse AI response
    const jsonMatch = response.message.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      // Fallback: try to extract category from text
      return fallbackCategorization(transaction)
    }

    const result = JSON.parse(jsonMatch[0])

    // Validate category
    if (!CATEGORIES.includes(result.category)) {
      result.category = 'Other'
      result.confidence = 0.5
    }

    return {
      id: transaction.id,
      category: result.category,
      confidence: Math.min(Math.max(result.confidence, 0), 1),
      reasoning: result.reasoning
    }
  } catch (error) {
    console.error('AI categorization error:', error)
    return fallbackCategorization(transaction)
  }
}

/**
 * Categorize multiple transactions in batch
 */
export async function categorizeTransactionsBatch(
  transactions: TransactionToCategorize[],
  batchSize: number = 10
): Promise<CategorizedTransaction[]> {
  const results: CategorizedTransaction[] = []

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize)

    const batchPrompt = `You are a financial transaction categorization expert. Analyze the following ${batch.length} transactions and categorize each one.

Available Categories:
${CATEGORIES.map((cat, i) => `${i + 1}. ${cat}`).join('\n')}

Transactions:
${batch.map((t, idx) => `
${idx + 1}. Description: ${t.description}
   Amount: $${t.amount}
   ${t.merchant ? `Merchant: ${t.merchant}` : ''}
`).join('\n')}

Please respond in JSON format with an array:
[
  {
    "transactionIndex": 1,
    "category": "exact category name from list",
    "confidence": 0.95,
    "reasoning": "brief explanation"
  },
  ...
]`

    try {
      const response = await sendMessage(batchPrompt, 'categorization-bot', [])

      // Parse AI response
      const jsonMatch = response.message.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        // Fallback for this batch
        batch.forEach(t => {
          results.push(fallbackCategorization(t))
        })
        continue
      }

      const batchResults = JSON.parse(jsonMatch[0])

      // Map results back to transactions
      batch.forEach((transaction, idx) => {
        const result = batchResults.find((r: any) => r.transactionIndex === idx + 1)

        if (result && CATEGORIES.includes(result.category)) {
          results.push({
            id: transaction.id,
            category: result.category,
            confidence: Math.min(Math.max(result.confidence, 0), 1),
            reasoning: result.reasoning
          })
        } else {
          results.push(fallbackCategorization(transaction))
        }
      })

      // Rate limiting - wait between batches
      if (i + batchSize < transactions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

    } catch (error) {
      console.error(`Batch ${i / batchSize + 1} categorization error:`, error)
      // Fallback for failed batch
      batch.forEach(t => {
        results.push(fallbackCategorization(t))
      })
    }
  }

  return results
}

/**
 * Rule-based fallback categorization when AI fails
 */
function fallbackCategorization(transaction: TransactionToCategorize): CategorizedTransaction {
  const desc = transaction.description.toLowerCase()
  const merchant = transaction.merchant?.toLowerCase() || ''
  const combined = `${desc} ${merchant}`

  // Simple keyword matching
  const rules: { keywords: string[]; category: string }[] = [
    { keywords: ['salary', 'paycheck', 'deposit', 'payment received', 'direct dep'], category: 'Income' },
    { keywords: ['restaurant', 'cafe', 'coffee', 'food', 'dining', 'grocery', 'uber eats', 'doordash', 'grubhub'], category: 'Food & Dining' },
    { keywords: ['uber', 'lyft', 'gas', 'fuel', 'parking', 'metro', 'transit', 'bus', 'train'], category: 'Transportation' },
    { keywords: ['electric', 'water', 'gas bill', 'internet', 'phone', 'utility', 'verizon', 'att', 'comcast'], category: 'Bills & Utilities' },
    { keywords: ['amazon', 'walmart', 'target', 'shopping', 'store', 'retail', 'ebay'], category: 'Shopping' },
    { keywords: ['netflix', 'spotify', 'hulu', 'disney', 'movie', 'theater', 'game', 'entertainment', 'concert'], category: 'Entertainment' },
    { keywords: ['pharmacy', 'doctor', 'hospital', 'medical', 'health', 'cvs', 'walgreens', 'clinic'], category: 'Healthcare' },
    { keywords: ['hotel', 'airbnb', 'flight', 'airline', 'booking', 'travel', 'resort', 'expedia'], category: 'Travel' },
    { keywords: ['tuition', 'school', 'course', 'education', 'university', 'college'], category: 'Education' },
    { keywords: ['gym', 'salon', 'spa', 'fitness', 'yoga', 'massage'], category: 'Personal Care' },
    { keywords: ['insurance', 'premium', 'policy', 'coverage'], category: 'Insurance' },
    { keywords: ['subscription', 'membership', 'annual fee', 'monthly fee'], category: 'Subscriptions' }
  ]

  for (const rule of rules) {
    if (rule.keywords.some(keyword => combined.includes(keyword))) {
      return {
        id: transaction.id,
        category: rule.category,
        confidence: 0.7,
        reasoning: 'Rule-based categorization'
      }
    }
  }

  return {
    id: transaction.id,
    category: 'Other',
    confidence: 0.5,
    reasoning: 'No matching category found'
  }
}

/**
 * Learn from user corrections to improve categorization
 */
export async function learnFromCorrection(
  transaction: TransactionToCategorize,
  userCategory: string
): Promise<void> {
  // This could be enhanced to:
  // 1. Store corrections in a database
  // 2. Build user-specific categorization rules
  // 3. Fine-tune the AI model with user feedback
  // Future: Implement learning mechanism
}

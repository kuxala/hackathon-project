import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getHistoricalMonthlyData } from '@/services/predictionService'
import { createChatCompletion } from '@/lib/openrouter'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface PredictionResult {
  nextMonth: string
  predictedExpenses: {
    total: number
    byCategory: {
      category: string
      amount: number
      confidence: 'high' | 'medium' | 'low'
    }[]
  }
  insights: string[]
  warnings: string[]
  confidence: number
  basedOnMonths: number
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Fetch the most recent prediction for this user
    const { data: predictions, error: fetchError } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error('Error fetching prediction:', fetchError)
      return NextResponse.json({
        error: 'Failed to fetch prediction',
        message: fetchError.message
      }, { status: 500 })
    }

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No predictions found'
      })
    }

    const prediction = predictions[0]

    // Format the response to match the expected structure
    const result: PredictionResult = {
      nextMonth: prediction.prediction_month,
      predictedExpenses: {
        total: parseFloat(prediction.total_predicted_expenses),
        byCategory: prediction.category_predictions
      },
      insights: prediction.insights || [],
      warnings: prediction.warnings || [],
      confidence: prediction.confidence_score,
      basedOnMonths: prediction.months_analyzed
    }

    return NextResponse.json({
      success: true,
      data: result,
      historicalData: prediction.historical_data || [],
      generatedAt: prediction.generated_at
    })

  } catch (error) {
    console.error('Get prediction API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const monthsToUse = body.monthsToUse || 6 // Default to 6 months

    // Validate monthsToUse
    if (monthsToUse < 3 || monthsToUse > 12) {
      return NextResponse.json(
        { error: 'monthsToUse must be between 3 and 12' },
        { status: 400 }
      )
    }

    // Get historical data
    const historicalData = await getHistoricalMonthlyData(user.id, token, monthsToUse)

    if (historicalData.length < 3) {
      return NextResponse.json({
        error: 'Insufficient data',
        message: 'At least 3 months of transaction data is required for predictions. Please upload more bank statements.',
        availableMonths: historicalData.length
      }, { status: 400 })
    }

    // Prepare data for AI
    const dataForAI = historicalData.map(month => ({
      month: month.month,
      totalSpending: month.totalSpending,
      totalIncome: month.totalIncome,
      categories: month.categoryBreakdown.map(c => ({
        category: c.category,
        amount: c.amount
      })),
      transactionCount: month.transactionCount
    }))

    // Calculate next month
    const lastMonth = historicalData[historicalData.length - 1].month
    const [year, month] = lastMonth.split('-').map(Number)
    const nextMonthDate = new Date(year, month, 1) // month is 0-indexed, so this gives us next month
    const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`

    // Create prompt for GPT-4o-mini
    const systemPrompt = `You are a financial analyst AI specializing in expense prediction.
Analyze the provided transaction data and predict next month's expenses with category-level breakdowns.
Your predictions should be based on:
1. Historical spending patterns and trends
2. Seasonal variations
3. Category-specific trends
4. Any unusual spikes or drops

Respond in valid JSON format only, with this exact structure:
{
  "totalExpenses": number,
  "categoryPredictions": [
    {
      "category": string,
      "amount": number,
      "confidence": "high" | "medium" | "low",
      "reasoning": string
    }
  ],
  "insights": [string],
  "warnings": [string],
  "overallConfidence": number (0-100)
}`

    const userPrompt = `Based on the following ${historicalData.length} months of transaction data, predict expenses for ${nextMonth}:

${JSON.stringify(dataForAI, null, 2)}

Provide detailed predictions with confidence levels and actionable insights.`

    // Call OpenAI via OpenRouter
    const response = await createChatCompletion({
      model: 'openai/gpt-4o-mini', // Using GPT-4o-mini for better predictions
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
      temperature: 0.3, // Lower temperature for more consistent predictions
      max_tokens: 2000
    })

    const aiResponse = response.choices[0].message.content

    // Parse AI response
    let prediction: any
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      const jsonText = jsonMatch ? jsonMatch[1] : aiResponse
      prediction = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      return NextResponse.json({
        error: 'Failed to parse prediction',
        message: 'The AI returned an invalid response format.'
      }, { status: 500 })
    }

    // Format the result
    const result: PredictionResult = {
      nextMonth,
      predictedExpenses: {
        total: prediction.totalExpenses || 0,
        byCategory: (prediction.categoryPredictions || []).map((cat: any) => ({
          category: cat.category,
          amount: cat.amount,
          confidence: cat.confidence
        }))
      },
      insights: prediction.insights || [],
      warnings: prediction.warnings || [],
      confidence: prediction.overallConfidence || 50,
      basedOnMonths: historicalData.length
    }

    // Save prediction to database
    try {
      const { error: insertError } = await supabase
        .from('predictions')
        .upsert({
          user_id: user.id,
          prediction_month: nextMonth,
          total_predicted_expenses: result.predictedExpenses.total,
          category_predictions: result.predictedExpenses.byCategory,
          insights: result.insights,
          warnings: result.warnings,
          confidence_score: result.confidence,
          months_analyzed: result.basedOnMonths,
          historical_data: dataForAI,
          generated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,prediction_month'
        })

      if (insertError) {
        console.error('Failed to save prediction:', insertError)
        // Don't fail the request if saving fails, just log it
      }
    } catch (saveError) {
      console.error('Error saving prediction to database:', saveError)
      // Continue even if save fails
    }

    return NextResponse.json({
      success: true,
      data: result,
      historicalData: dataForAI
    })

  } catch (error) {
    console.error('Prediction API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Database types matching Supabase schema

export interface UserAccount {
  id: string
  user_id: string
  account_name: string
  account_type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'other'
  currency: string
  institution_name?: string
  account_number_last4?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BankStatement {
  id: string
  account_id: string
  file_name: string
  file_size: number
  file_type: 'csv' | 'xlsx' | 'pdf'
  file_url: string
  upload_date: string
  statement_period_start?: string
  statement_period_end?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  parsed_data?: unknown
  transaction_count: number
  total_credits?: number
  total_debits?: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  account_id: string
  statement_id?: string
  transaction_date: string
  post_date?: string
  description: string
  amount: number
  transaction_type: 'debit' | 'credit'
  category?: string
  category_confidence?: number
  merchant?: string
  balance?: number
  notes?: string
  is_recurring: boolean
  is_manual: boolean
  created_at: string
  updated_at: string
}

export interface AIInsight {
  id: string
  user_id: string
  account_id?: string
  insight_type: 'spending_pattern' | 'budget_recommendation' | 'anomaly' | 'saving_opportunity' | 'trend_analysis'
  title: string
  description: string
  data: unknown
  severity?: 'info' | 'warning' | 'critical'
  is_read: boolean
  is_dismissed: boolean
  generated_at: string
  expires_at?: string
}

export interface TransactionCategory {
  id: string
  name: string
  parent_category?: string
  icon?: string
  color?: string
  keywords?: string[]
  created_at: string
}

// Chart Data types for AI Insights

export interface MonthlyTrendData {
  months: string[]        // ["2024-10", "2024-11", "2024-12", ...]
  income: number[]        // [5200, 5400, 5300, ...]
  spending: number[]      // [4100, 4500, 4300, ...]
}

export interface CategoryBreakdown {
  categories: Array<{
    name: string          // "Groceries"
    amount: number        // 654.21
    percentage: number    // 22.0
    color: 'emerald' | 'green' | 'rose' | 'amber' | 'blue' | 'purple'
  }>
}

export interface BudgetData {
  totalBudget: number             // 5000
  totalSpent: number              // 3847
  utilizationPercentage: number   // 76.9
  forecastEndOfMonth: number      // 4200
}

export interface ChartData {
  monthlyTrend?: MonthlyTrendData
  categoryBreakdown?: CategoryBreakdown
  budget?: BudgetData
}

// API Request/Response types

export interface CreateAccountRequest {
  account_name: string
  account_type: UserAccount['account_type']
  currency?: string
  institution_name?: string
  account_number_last4?: string
}

export interface UploadStatementRequest {
  account_id: string
  file: File
}

export interface UploadStatementResponse {
  success: boolean
  statement_id?: string
  preview?: {
    transactions: Transaction[]
    periodStart?: string
    periodEnd?: string
    totalCredits: number
    totalDebits: number
  }
  error?: string
}

export interface ParseTransactionsRequest {
  statement_id: string
  transactions: Array<{
    date: string
    description: string
    amount: number
    type: 'debit' | 'credit'
    balance?: number
    merchant?: string
  }>
}

export interface CategorizeTransactionsRequest {
  transactions: Array<{
    id?: string
    description: string
    amount: number
    merchant?: string
  }>
}

export interface CategorizeTransactionsResponse {
  success: boolean
  categorized: Array<{
    id?: string
    category: string
    confidence: number
  }>
  error?: string
}

export interface GenerateInsightsRequest {
  account_id?: string
  time_period?: string // e.g., "30d", "90d", "1y"
}

export interface GenerateInsightsResponse {
  success: boolean
  insights: AIInsight[]
  error?: string
}

export interface GetTransactionsQuery {
  account_id?: string
  start_date?: string
  end_date?: string
  category?: string
  min_amount?: number
  max_amount?: number
  search?: string
  limit?: number
  offset?: number
}

export interface GetTransactionsResponse {
  success: boolean
  transactions: Transaction[]
  total: number
  error?: string
}

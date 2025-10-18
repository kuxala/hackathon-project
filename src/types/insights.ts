// Insights visualization types

// Sankey Diagram
export interface SankeyNode {
  id: string
  name: string
  type: 'income' | 'category' | 'merchant'
  value: number
  color?: string
}

export interface SankeyLink {
  source: string
  target: string
  value: number
  color?: string
}

export interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
  totalIncome: number
  totalSpending: number
}

// Spending Heatmap
export interface HeatmapDay {
  date: string // YYYY-MM-DD
  amount: number
  transactionCount: number
  dayOfWeek: number // 0-6
  intensity: number // 0-100
}

export interface HeatmapData {
  days: HeatmapDay[]
  minAmount: number
  maxAmount: number
  averageDaily: number
  periodStart: string
  periodEnd: string
}

// Category River Chart (Streamgraph)
export interface RiverLayer {
  category: string
  color: string
  values: number[] // One per time period
}

export interface RiverData {
  layers: RiverLayer[]
  periods: string[] // Month labels
  totals: number[] // Total per period
}

// Financial Health Dashboard
export interface HealthMetric {
  id: string
  name: string
  value: number // 0-100
  score: number // Actual value for display
  unit: string // '%', '$', 'days', etc.
  status: 'excellent' | 'good' | 'fair' | 'poor'
  description: string
  target?: number
  color: string
}

export interface FinancialHealthData {
  overallScore: number // 0-100
  metrics: HealthMetric[]
  trend: 'improving' | 'stable' | 'declining'
  lastUpdated: string
}

// API Response
export interface InsightsDataResponse {
  success: boolean
  data?: {
    sankey: SankeyData
    heatmap: HeatmapData
    river: RiverData
    health: FinancialHealthData
  }
  error?: string
}

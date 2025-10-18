import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { analyzeFileStructure, categorizeTransactionsBatch, type RawDataRow } from './aiFileParser'

export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  balance?: number
  category?: string
  merchant?: string
  categoryConfidence?: number
}

export interface ParseResult {
  success: boolean
  transactions: ParsedTransaction[]
  periodStart?: string
  periodEnd?: string
  error?: string
  totalCredits: number
  totalDebits: number
  detectedBank?: string
  accountNumber?: string
  stats?: {
    totalRows: number
    importedRows: number
    skippedRows: number
    skippedReasons?: Array<{ row: number; reason: string; value?: any }>
  }
}

interface CSVRow {
  [key: string]: string
}

/**
 * Parse CSV file (browser-side) with AI-powered analysis
 */
export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const csvData = results.data as CSVRow[]

          // Use AI-powered processing
          const { transactions, skipped } = await processCSVData(csvData, file.name)
          const stats = calculateStats(transactions)

          // Use AI-detected bank info if available, otherwise fallback to rule-based
          const bankInfo = detectBank(csvData, file.name)
          const detectedBank = bankInfo.bank
          const accountNumber = bankInfo.accountNumber

          resolve({
            success: true,
            transactions,
            ...stats,
            detectedBank,
            accountNumber,
            stats: {
              totalRows: csvData.length,
              importedRows: transactions.length,
              skippedRows: skipped.length,
              skippedReasons: skipped
            }
          })
        } catch (error) {
          resolve({
            success: false,
            transactions: [],
            error: error instanceof Error ? error.message : 'Failed to parse CSV',
            totalCredits: 0,
            totalDebits: 0
          })
        }
      },
      error: (error) => {
        resolve({
          success: false,
          transactions: [],
          error: error.message,
          totalCredits: 0,
          totalDebits: 0
        })
      }
    })
  })
}

/**
 * Parse Excel file (browser-side) with AI-powered analysis
 */
export async function parseExcel(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })


    // Try ALL sheets and find the one with most transaction-like data
    let bestTransactions: ParsedTransaction[] = []
    let bestSkipped: Array<{ row: number; reason: string; value?: any }> = []
    let bestStats: any = null
    let bestBankInfo: any = null
    let bestTotalRows = 0

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false, // Convert dates to strings
        dateNF: 'yyyy-mm-dd' // ISO date format
      }) as CSVRow[]


      // Skip empty sheets
      if (jsonData.length === 0) continue

      // Log first row to see structure
      if (jsonData.length > 0) {
      }

      // Use AI-powered processing
      const { transactions, skipped } = await processCSVData(jsonData, file.name)

      // Use the sheet with the most valid transactions
      if (transactions.length > bestTransactions.length) {
        bestTransactions = transactions
        bestSkipped = skipped
        bestTotalRows = jsonData.length
        bestStats = calculateStats(transactions)

        // Use AI-detected bank info if available, otherwise fallback to rule-based
        bestBankInfo = detectBank(jsonData, file.name)
      }
    }


    // If no transactions found in any sheet, return error
    if (bestTransactions.length === 0) {
      return {
        success: false,
        transactions: [],
        error: 'No transaction data found in any sheet',
        totalCredits: 0,
        totalDebits: 0,
        stats: {
          totalRows: bestTotalRows,
          importedRows: 0,
          skippedRows: bestSkipped.length,
          skippedReasons: bestSkipped
        }
      }
    }

    return {
      success: true,
      transactions: bestTransactions,
      ...bestStats,
      detectedBank: bestBankInfo.bank,
      accountNumber: bestBankInfo.accountNumber,
      stats: {
        totalRows: bestTotalRows,
        importedRows: bestTransactions.length,
        skippedRows: bestSkipped.length,
        skippedReasons: bestSkipped
      }
    }
  } catch (error) {
    return {
      success: false,
      transactions: [],
      error: error instanceof Error ? error.message : 'Failed to parse Excel',
      totalCredits: 0,
      totalDebits: 0
    }
  }
}

/**
 * Parse PDF file (server-side only - requires Node.js)
 * This is a placeholder - actual implementation would use pdf-parse on the server
 */
export async function parsePDF(_file: File): Promise<ParseResult> {
  // PDF parsing is complex and should be done server-side
  // This function would send the file to the server for processing
  return {
    success: false,
    transactions: [],
    error: 'PDF parsing must be done server-side. Please upload the file.',
    totalCredits: 0,
    totalDebits: 0
  }
}

/**
 * Detect if a value looks like a date (language-agnostic)
 */
function looksLikeDate(value: string): boolean {
  if (!value || value.length < 6) return false

  // Check for common date separators
  const hasSeparator = /[\/\-\.]/.test(value)
  const hasNumbers = /\d/.test(value)

  // Try parsing as date
  const parsed = new Date(value)
  const isValidDate = !isNaN(parsed.getTime())

  // Check for date patterns (any language)
  const datePattern = /^\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4}$/
  const reversePattern = /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/

  return (hasSeparator && hasNumbers) || isValidDate || datePattern.test(value) || reversePattern.test(value)
}

/**
 * Detect if a value looks like a number/amount
 */
function looksLikeAmount(value: string): boolean {
  if (!value) return false

  // Remove common currency symbols and thousand separators
  const cleaned = value.replace(/[$€£¥₹₽₩,\s]/g, '')

  // Check if it's a valid number
  const isNumber = /^-?\d+\.?\d*$/.test(cleaned)
  const hasDecimal = /\d+[.,]\d{2}$/.test(value) // Common for currency

  return isNumber || hasDecimal
}

/**
 * Detect if a value looks like text/description
 */
function looksLikeText(value: string): boolean {
  if (!value) return false

  // Has letters and is reasonably long
  const hasLetters = /[a-zA-Z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF]/.test(value)
  const isLongEnough = value.length > 3

  return hasLetters && isLongEnough
}

/**
 * Analyze column types by looking at actual data (language-agnostic)
 */
function analyzeColumns(data: CSVRow[]): {
  date?: string
  description?: string
  amount?: string
  debit?: string
  credit?: string
  balance?: string
} {
  if (data.length === 0) return {}

  const headers = Object.keys(data[0])
  const columnScores: { [key: string]: { date: number; amount: number; text: number } } = {}

  // Sample first 10 rows to analyze patterns
  const sampleSize = Math.min(10, data.length)

  headers.forEach(header => {
    columnScores[header] = { date: 0, amount: 0, text: 0 }

    for (let i = 0; i < sampleSize; i++) {
      const value = String(data[i][header] || '').trim()
      if (!value) continue

      if (looksLikeDate(value)) columnScores[header].date++
      if (looksLikeAmount(value)) columnScores[header].amount++
      if (looksLikeText(value)) columnScores[header].text++
    }
  })

  // Find best matches based on scores
  const result: any = {}

  // Find date column (highest date score)
  let maxDateScore = 0
  headers.forEach(header => {
    if (columnScores[header].date > maxDateScore) {
      maxDateScore = columnScores[header].date
      result.date = header
    }
  })

  // Find description column (highest text score, not date)
  let maxTextScore = 0
  headers.forEach(header => {
    if (header !== result.date && columnScores[header].text > maxTextScore) {
      maxTextScore = columnScores[header].text
      result.description = header
    }
  })

  // Find amount columns (can have multiple)
  const amountColumns: Array<{ header: string; score: number }> = []
  headers.forEach(header => {
    if (header !== result.date && header !== result.description && columnScores[header].amount > sampleSize / 2) {
      amountColumns.push({ header, score: columnScores[header].amount })
    }
  })

  // Sort by score and assign to debit/credit or amount
  amountColumns.sort((a, b) => b.score - a.score)

  if (amountColumns.length >= 2) {
    // Likely separate debit/credit columns
    result.debit = amountColumns[0].header
    result.credit = amountColumns[1].header
    if (amountColumns.length >= 3) {
      result.balance = amountColumns[2].header
    }
  } else if (amountColumns.length === 1) {
    // Single amount column
    result.amount = amountColumns[0].header
  }

  return result
}

/**
 * Process CSV/Excel data into transactions using AI-powered analysis
 */
async function processCSVData(data: CSVRow[], fileName?: string): Promise<{ transactions: ParsedTransaction[]; skipped: Array<{ row: number; reason: string; value?: any }> }> {
  if (data.length === 0) return { transactions: [], skipped: [] }

  try {
    // Use AI to analyze file structure and detect columns
    const aiAnalysis = await analyzeFileStructure(data as RawDataRow[], fileName)

    const columns = aiAnalysis.columnMapping

    // If AI returned nothing useful, use fallback immediately
    if (!columns || Object.keys(columns).length === 0) {
      return processCSVDataFallback(data)
    }

    const transactions: ParsedTransaction[] = []
    const skipped: Array<{ row: number; reason: string; value?: any }> = []

    // Process each row using AI-detected column mappings
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      try {
        // Get date using AI-detected column
        let dateStr = columns.date ? row[columns.date] : undefined
        if (!dateStr) {
          // Fallback: search for date in any column
          const allValues = Object.values(row)
          dateStr = allValues.find(v => looksLikeDate(String(v)))
        }
        if (!dateStr) {
          skipped.push({ row: i + 2, reason: 'No date found', value: row })
          continue // Skip if no date found
        }

        // Get description using AI-detected column
        let description = columns.description ? row[columns.description] : undefined
        if (!description) {
          // Fallback: search for text description
          const allValues = Object.entries(row)
          const textEntry = allValues.find(([key, v]) =>
            key !== columns.date && looksLikeText(String(v))
          )
          description = textEntry ? textEntry[1] : 'Transaction'
        }
        description = String(description || 'Transaction').trim()

        // Parse amount using AI-detected columns
        let amount = 0
        let type: 'debit' | 'credit' = 'debit'

        if (columns.debit && columns.credit) {
          // Separate debit/credit columns
          const debitStr = row[columns.debit]
          const creditStr = row[columns.credit]

          if (debitStr && parseFloat(String(debitStr).replace(/[^0-9.-]/g, '')) !== 0) {
            amount = Math.abs(parseFloat(String(debitStr).replace(/[^0-9.-]/g, '')))
            type = 'debit'
          } else if (creditStr && parseFloat(String(creditStr).replace(/[^0-9.-]/g, '')) !== 0) {
            amount = Math.abs(parseFloat(String(creditStr).replace(/[^0-9.-]/g, '')))
            type = 'credit'
          }
        } else if (columns.amount) {
          // Single amount column
          const amountStr = row[columns.amount]
          const parsedAmount = parseFloat(String(amountStr).replace(/[^0-9.-]/g, ''))
          amount = Math.abs(parsedAmount)
          type = parsedAmount < 0 ? 'debit' : 'credit'
        } else if (columns.type) {
          // Has explicit type column - try to find amount
          const allValues = Object.entries(row)
          const amountEntry = allValues.find(([key, v]) =>
            key !== columns.date && key !== columns.description && looksLikeAmount(String(v))
          )
          if (amountEntry) {
            amount = Math.abs(parseFloat(String(amountEntry[1]).replace(/[^0-9.-]/g, '')))
            const typeStr = String(row[columns.type]).toLowerCase()
            type = typeStr.includes('credit') || typeStr.includes('deposit') ? 'credit' : 'debit'
          }
        } else {
          // Fallback: search for any amount column
          const allValues = Object.entries(row)
          const amountEntry = allValues.find(([key, v]) =>
            key !== columns.date && key !== columns.description && looksLikeAmount(String(v))
          )
          if (amountEntry) {
            const parsedAmount = parseFloat(String(amountEntry[1]).replace(/[^0-9.-]/g, ''))
            amount = Math.abs(parsedAmount)
            type = parsedAmount < 0 ? 'debit' : 'credit'
          }
        }

        // Skip if no valid amount
        if (amount === 0 || isNaN(amount)) {
          skipped.push({ row: i + 2, reason: 'Invalid or zero amount', value: row })
          continue
        }

        // Parse balance if available
        let balance: number | undefined
        if (columns.balance && row[columns.balance]) {
          const balanceStr = String(row[columns.balance]).replace(/[^0-9.-]/g, '')
          balance = parseFloat(balanceStr)
          if (isNaN(balance)) balance = undefined
        }

        // Use AI-detected merchant or extract from description
        const merchant = columns.merchant ? String(row[columns.merchant]) : extractMerchant(description)

        // Use AI-detected category if available
        const category = columns.category ? String(row[columns.category]) : undefined

        const normalizedDate = normalizeDate(String(dateStr))
        if (!normalizedDate) {
          skipped.push({ row: i + 2, reason: 'Invalid or future date', value: dateStr })
          continue
        }

        transactions.push({
          date: normalizedDate,
          description,
          amount,
          type,
          balance,
          merchant,
          category
        })
      } catch (error) {
        skipped.push({ row: i + 2, reason: 'Parse error', value: error instanceof Error ? error.message : 'Unknown error' })
        continue
      }
    }

    // If no categories detected, use AI to categorize all transactions
    if (transactions.length > 0 && !columns.category) {
      try {
        const categorizationResults = await categorizeTransactionsBatch(
          transactions.map(t => ({
            description: t.description,
            amount: t.amount,
            merchant: t.merchant
          }))
        )

        // Apply categorization results
        transactions.forEach((tx, idx) => {
          if (categorizationResults[idx]) {
            tx.category = categorizationResults[idx].category
            tx.categoryConfidence = categorizationResults[idx].confidence
            // Update merchant if AI provided a better one
            if (categorizationResults[idx].merchant) {
              tx.merchant = categorizationResults[idx].merchant
            }
          }
        })
      } catch (error) {
        console.error('AI categorization failed:', error)
      }
    }

    return { transactions, skipped }

  } catch (error) {
    console.error('❌ AI analysis failed, falling back to rule-based parsing:', error)
    // Fallback to old method if AI fails
    return processCSVDataFallback(data)
  }
}

/**
 * Fallback: Original rule-based processing (kept for reliability)
 */
function processCSVDataFallback(data: CSVRow[]): { transactions: ParsedTransaction[]; skipped: Array<{ row: number; reason: string; value?: any }> } {
  if (data.length === 0) return { transactions: [], skipped: [] }

  const columns = analyzeColumns(data)

  const transactions: ParsedTransaction[] = []
  const skipped: Array<{ row: number; reason: string; value?: any }> = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    try {
      let dateStr = columns.date ? row[columns.date] : undefined
      if (!dateStr) {
        const allValues = Object.values(row)
        dateStr = allValues.find(v => looksLikeDate(String(v)))
      }
      if (!dateStr) {
        skipped.push({ row: i + 2, reason: 'No date found', value: row })
        continue
      }

      let description = columns.description ? row[columns.description] : undefined
      if (!description) {
        const allValues = Object.entries(row)
        const textEntry = allValues.find(([key, v]) =>
          key !== columns.date && looksLikeText(String(v))
        )
        description = textEntry ? textEntry[1] : 'Transaction'
      }
      description = String(description || 'Transaction').trim()

      let amount = 0
      let type: 'debit' | 'credit' = 'debit'

      if (columns.debit && columns.credit) {
        const debitStr = row[columns.debit]
        const creditStr = row[columns.credit]

        if (debitStr && parseFloat(String(debitStr).replace(/[^0-9.-]/g, '')) !== 0) {
          amount = Math.abs(parseFloat(String(debitStr).replace(/[^0-9.-]/g, '')))
          type = 'debit'
        } else if (creditStr && parseFloat(String(creditStr).replace(/[^0-9.-]/g, '')) !== 0) {
          amount = Math.abs(parseFloat(String(creditStr).replace(/[^0-9.-]/g, '')))
          type = 'credit'
        }
      } else if (columns.amount) {
        const amountStr = row[columns.amount]
        const parsedAmount = parseFloat(String(amountStr).replace(/[^0-9.-]/g, ''))
        amount = Math.abs(parsedAmount)
        type = parsedAmount < 0 ? 'debit' : 'credit'
      } else {
        const allValues = Object.entries(row)
        const amountEntry = allValues.find(([key, v]) =>
          key !== columns.date && key !== columns.description && looksLikeAmount(String(v))
        )
        if (amountEntry) {
          const parsedAmount = parseFloat(String(amountEntry[1]).replace(/[^0-9.-]/g, ''))
          amount = Math.abs(parsedAmount)
          type = parsedAmount < 0 ? 'debit' : 'credit'
        }
      }

      if (amount === 0 || isNaN(amount)) {
        skipped.push({ row: i + 2, reason: 'Invalid or zero amount', value: row })
        continue
      }

      let balance: number | undefined
      if (columns.balance && row[columns.balance]) {
        const balanceStr = String(row[columns.balance]).replace(/[^0-9.-]/g, '')
        balance = parseFloat(balanceStr)
        if (isNaN(balance)) balance = undefined
      }

      const merchant = extractMerchant(description)

      const normalizedDate = normalizeDate(dateStr)
      if (!normalizedDate) {
        skipped.push({ row: i + 2, reason: 'Invalid or future date', value: dateStr })
        continue
      }

      transactions.push({
        date: normalizedDate,
        description,
        amount,
        type,
        balance,
        merchant
      })
    } catch (error) {
      skipped.push({ row: i + 2, reason: 'Parse error', value: error instanceof Error ? error.message : 'Unknown error' })
      continue
    }
  }

  return { transactions, skipped }
}

/**
 * Normalize date to ISO format with proper validation
 * Returns null if date cannot be parsed or is invalid
 */
function normalizeDate(dateValue: any): string | null {
  try {
    let parsedDate: Date | null = null

    // Handle Excel serial date numbers (e.g., 45230 = 2023-11-01)
    if (typeof dateValue === 'number') {
      // Excel dates are days since 1900-01-01 (with 1900 leap year bug)
      const excelEpoch = new Date(1899, 11, 30) // December 30, 1899
      parsedDate = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000)
    }
    // Handle string dates
    else if (typeof dateValue === 'string') {
      const dateStr = String(dateValue).trim()

      // Try ISO format first (YYYY-MM-DD) - most reliable
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        parsedDate = new Date(dateStr + 'T00:00:00.000Z')
      }
      // Try MM/DD/YYYY format
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('/')
        const month = parseInt(parts[0]) - 1
        const day = parseInt(parts[1])
        const year = parseInt(parts[2])
        parsedDate = new Date(year, month, day)
      }
      // Try DD-MM-YYYY format
      else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('-')
        const day = parseInt(parts[0])
        const month = parseInt(parts[1]) - 1
        const year = parseInt(parts[2])
        parsedDate = new Date(year, month, day)
      }
      // Try DD.MM.YYYY format (European)
      else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('.')
        const day = parseInt(parts[0])
        const month = parseInt(parts[1]) - 1
        const year = parseInt(parts[2])
        parsedDate = new Date(year, month, day)
      }
      // Fallback to JavaScript Date parser
      else {
        parsedDate = new Date(dateStr)
      }
    }
    // Handle Date objects
    else if (dateValue instanceof Date) {
      parsedDate = dateValue
    }

    // Validate parsed date
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      return null // Invalid date
    }

    // Reject future dates
    const now = new Date()
    now.setHours(23, 59, 59, 999) // End of today
    if (parsedDate > now) {
      console.warn(`Rejecting future date: ${dateValue} → ${parsedDate.toISOString()}`)
      return null
    }

    // Reject dates older than 10 years
    const tenYearsAgo = new Date()
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
    tenYearsAgo.setHours(0, 0, 0, 0)
    if (parsedDate < tenYearsAgo) {
      console.warn(`Rejecting date older than 10 years: ${dateValue}`)
      return null
    }

    // Return ISO format date (YYYY-MM-DD)
    return parsedDate.toISOString().split('T')[0]
  } catch (error) {
    console.error(`Failed to parse date: ${dateValue}`, error)
    return null
  }
}

/**
 * Extract merchant name from description
 */
function extractMerchant(description: string): string {
  // Remove common prefixes
  let merchant = description
    .replace(/^(DEBIT CARD PURCHASE|CREDIT CARD PURCHASE|POS|ATM)\s*/i, '')
    .replace(/\s+\d{4}$/, '') // Remove trailing numbers (like card last 4 digits)
    .replace(/\s+#\d+$/, '') // Remove transaction IDs
    .trim()

  // Extract first part before location or date
  const parts = merchant.split(/\s+/)
  if (parts.length > 3) {
    merchant = parts.slice(0, 3).join(' ')
  }

  return merchant || description
}

/**
 * Detect bank from file content patterns
 */
function detectBank(data: CSVRow[], fileName?: string): { bank: string; accountNumber?: string } {
  const allText = JSON.stringify(data).toLowerCase()
  const fileNameLower = fileName?.toLowerCase() || ''

  // Bank detection patterns
  const bankPatterns = [
    { keywords: ['chase', 'jpmorgan'], name: 'Chase' },
    { keywords: ['bank of america', 'bofa'], name: 'Bank of America' },
    { keywords: ['wells fargo', 'wellsfargo'], name: 'Wells Fargo' },
    { keywords: ['citibank', 'citi'], name: 'Citibank' },
    { keywords: ['us bank', 'usbank'], name: 'U.S. Bank' },
    { keywords: ['capital one', 'capitalone'], name: 'Capital One' },
    { keywords: ['pnc bank', 'pnc'], name: 'PNC Bank' },
    { keywords: ['td bank', 'tdbank'], name: 'TD Bank' },
    { keywords: ['truist'], name: 'Truist' },
    { keywords: ['citizens bank'], name: 'Citizens Bank' },
    { keywords: ['fifth third', '5/3'], name: 'Fifth Third Bank' },
    { keywords: ['ally bank', 'ally'], name: 'Ally Bank' },
    { keywords: ['discover'], name: 'Discover' },
    { keywords: ['american express', 'amex'], name: 'American Express' },
    { keywords: ['navy federal'], name: 'Navy Federal Credit Union' },
  ]

  for (const pattern of bankPatterns) {
    if (pattern.keywords.some(kw => allText.includes(kw) || fileNameLower.includes(kw))) {
      return { bank: pattern.name, accountNumber: extractAccountNumber(data) }
    }
  }

  return { bank: 'Unknown Bank' }
}

/**
 * Extract account number from CSV data
 */
function extractAccountNumber(data: CSVRow[]): string | undefined {
  // Look for account number in first few rows (often in headers)
  const searchRows = data.slice(0, 5)
  const accountPattern = /account.*?(\d{4,})/i

  for (const row of searchRows) {
    for (const value of Object.values(row)) {
      const match = value.match(accountPattern)
      if (match) {
        // Return last 4 digits for privacy
        const number = match[1]
        return number.length > 4 ? `****${number.slice(-4)}` : number
      }
    }
  }

  return undefined
}

/**
 * Calculate transaction statistics
 */
function calculateStats(transactions: ParsedTransaction[]) {
  let totalCredits = 0
  let totalDebits = 0
  let periodStart: string | undefined
  let periodEnd: string | undefined

  for (const transaction of transactions) {
    if (transaction.type === 'credit') {
      totalCredits += transaction.amount
    } else {
      totalDebits += transaction.amount
    }

    if (!periodStart || transaction.date < periodStart) {
      periodStart = transaction.date
    }
    if (!periodEnd || transaction.date > periodEnd) {
      periodEnd = transaction.date
    }
  }

  return {
    totalCredits: Math.round(totalCredits * 100) / 100,
    totalDebits: Math.round(totalDebits * 100) / 100,
    periodStart,
    periodEnd
  }
}

/**
 * Main parser function - detects file type and parses accordingly
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'csv':
      return parseCSV(file)
    case 'xlsx':
    case 'xls':
      return parseExcel(file)
    case 'pdf':
      return parsePDF(file)
    default:
      return {
        success: false,
        transactions: [],
        error: `Unsupported file type: ${extension}`,
        totalCredits: 0,
        totalDebits: 0
      }
  }
}

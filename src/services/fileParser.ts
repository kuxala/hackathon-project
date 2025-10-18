import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  balance?: number
  category?: string
  merchant?: string
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
}

interface CSVRow {
  [key: string]: string
}

/**
 * Parse CSV file (browser-side)
 */
export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const csvData = results.data as CSVRow[]
          const transactions = processCSVData(csvData)
          const stats = calculateStats(transactions)
          const bankInfo = detectBank(csvData, file.name)

          resolve({
            success: true,
            transactions,
            ...stats,
            detectedBank: bankInfo.bank,
            accountNumber: bankInfo.accountNumber
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
 * Parse Excel file (browser-side)
 */
export async function parseExcel(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    console.log(`📄 Excel file has ${workbook.SheetNames.length} sheets:`, workbook.SheetNames)

    // Try ALL sheets and find the one with most transaction-like data
    let bestTransactions: ParsedTransaction[] = []
    let bestStats: any = null
    let bestBankInfo: any = null
    let bestSheetName = ''

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as CSVRow[]

      console.log(`📋 Sheet "${sheetName}": ${jsonData.length} rows`)

      // Skip empty sheets
      if (jsonData.length === 0) continue

      // Log first row to see structure
      if (jsonData.length > 0) {
        console.log(`🔍 First row from "${sheetName}":`, jsonData[0])
      }

      const transactions = processCSVData(jsonData)
      console.log(`💰 Sheet "${sheetName}" extracted ${transactions.length} transactions`)

      // Use the sheet with the most valid transactions
      if (transactions.length > bestTransactions.length) {
        bestTransactions = transactions
        bestStats = calculateStats(transactions)
        bestBankInfo = detectBank(jsonData, file.name)
        bestSheetName = sheetName
      }
    }

    console.log(`✅ Best sheet: "${bestSheetName}" with ${bestTransactions.length} transactions`)

    // If no transactions found in any sheet, return error
    if (bestTransactions.length === 0) {
      return {
        success: false,
        transactions: [],
        error: 'No transaction data found in any sheet',
        totalCredits: 0,
        totalDebits: 0
      }
    }

    return {
      success: true,
      transactions: bestTransactions,
      ...bestStats,
      detectedBank: bestBankInfo.bank,
      accountNumber: bestBankInfo.accountNumber
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
 * Process CSV/Excel data into transactions
 */
function processCSVData(data: CSVRow[]): ParsedTransaction[] {
  if (data.length === 0) return []

  // Analyze column types intelligently (language-agnostic)
  const columns = analyzeColumns(data)
  console.log('🔬 Detected columns:', columns)

  const transactions: ParsedTransaction[] = []

  for (const row of data) {
    try {
      // Get date - try detected column first, then search all columns
      let dateStr = columns.date ? row[columns.date] : undefined
      if (!dateStr) {
        // Search for date in any column
        const allValues = Object.values(row)
        dateStr = allValues.find(v => looksLikeDate(String(v)))
      }
      if (!dateStr) continue // Skip if no date found

      // Get description - try detected column first, then search for text
      let description = columns.description ? row[columns.description] : undefined
      if (!description) {
        // Search for text description in any column
        const allValues = Object.entries(row)
        const textEntry = allValues.find(([key, v]) =>
          key !== columns.date && looksLikeText(String(v))
        )
        description = textEntry ? textEntry[1] : 'Transaction'
      }
      description = String(description || 'Transaction').trim()

      // Parse amount - handle different formats
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
      } else {
        // No amount column detected - search for any number that looks like money
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
      if (amount === 0 || isNaN(amount)) continue

      // Parse balance if available
      let balance: number | undefined
      if (columns.balance && row[columns.balance]) {
        const balanceStr = String(row[columns.balance]).replace(/[^0-9.-]/g, '')
        balance = parseFloat(balanceStr)
        if (isNaN(balance)) balance = undefined
      }

      // Extract merchant from description
      const merchant = extractMerchant(description)

      transactions.push({
        date: normalizeDate(String(dateStr)),
        description,
        amount,
        type,
        balance,
        merchant
      })
    } catch (error) {
      // Skip invalid rows silently
      console.warn('Skipping row:', error)
      continue
    }
  }

  return transactions
}

/**
 * Normalize date to ISO format
 */
function normalizeDate(dateStr: string): string {
  try {
    // Try parsing various date formats
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      // Try MM/DD/YYYY format
      const parts = dateStr.split('/')
      if (parts.length === 3) {
        const month = parseInt(parts[0]) - 1
        const day = parseInt(parts[1])
        const year = parseInt(parts[2])
        return new Date(year, month, day).toISOString().split('T')[0]
      }
      throw new Error('Invalid date format')
    }
    return date.toISOString().split('T')[0]
  } catch {
    return new Date().toISOString().split('T')[0] // Fallback to today
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

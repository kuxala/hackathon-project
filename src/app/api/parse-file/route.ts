import { NextResponse } from 'next/server'
import { parseCSV, parseExcel } from '@/services/fileParser'

/**
 * POST /api/parse-file - Parse uploaded file server-side with AI
 */
export async function POST(request: Request) {
  try {

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }


    // Determine file type
    const ext = file.name.split('.').pop()?.toLowerCase()
    let result

    if (ext === 'csv') {
      result = await parseCSV(file)
    } else if (ext === 'xlsx' || ext === 'xls') {
      result = await parseExcel(file)
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type' },
        { status: 400 }
      )
    }


    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Parse error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse file'
      },
      { status: 500 }
    )
  }
}

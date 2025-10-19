import { NextResponse } from 'next/server'

// Example API route - GET
export async function GET(request: Request) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Example: fetch data from Supabase
    // const { data, error } = await supabase.from('your_table').select('*')

    return NextResponse.json({
      message: 'API working',
      timestamp: new Date().toISOString()
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Example API route - POST
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Example: insert data to Supabase
    // const { data, error } = await supabase.from('your_table').insert(body)

    return NextResponse.json({
      success: true,
      received: body
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

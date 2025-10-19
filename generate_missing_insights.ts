/**
 * Script to manually generate insights for existing transactions
 *
 * Usage:
 * 1. Make sure you have transactions in the database
 * 2. Get your user access token from the browser (Application > Local Storage > sb-*-auth-token)
 * 3. Run: npx ts-node generate_missing_insights.ts YOUR_ACCESS_TOKEN
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function generateInsights(accessToken: string) {
  console.log('🔄 Generating insights...')

  try {
    const response = await fetch(`${SITE_URL}/api/insights`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        time_period: '1y' // Generate for last year
      })
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ Successfully generated insights!')
      console.log('📊 Insights created:', result.insights?.length || 0)
      console.log('\nInsight types:')
      result.insights?.forEach((insight: any) => {
        console.log(`  - ${insight.insight_type}: ${insight.title}`)
      })
    } else {
      console.error('❌ Failed to generate insights:', result.error)
    }

    return result
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Get access token from command line
const accessToken = process.argv[2]

if (!accessToken) {
  console.error('❌ Please provide an access token')
  console.error('Usage: npx ts-node generate_missing_insights.ts YOUR_ACCESS_TOKEN')
  console.error('\nTo get your access token:')
  console.error('1. Open your app in the browser')
  console.error('2. Open DevTools (F12)')
  console.error('3. Go to Application > Local Storage')
  console.error('4. Look for sb-*-auth-token')
  console.error('5. Copy the "access_token" value')
  process.exit(1)
}

generateInsights(accessToken)
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error.message)
    process.exit(1)
  })

import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function InsightsLoading() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[rgb(10,10,10)]">
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading insights..." />
      </div>
    </div>
  )
}

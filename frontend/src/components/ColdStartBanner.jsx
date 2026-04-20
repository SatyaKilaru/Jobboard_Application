import { useEffect, useState } from 'react'
import { subscribeWarmup } from '@/lib/warmup'

export default function ColdStartBanner() {
  const [status, setStatus] = useState('idle')

  useEffect(() => subscribeWarmup(setStatus), [])

  if (status !== 'pending' && status !== 'failed') return null

  const isPending = status === 'pending'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2.5 text-sm flex items-center justify-center gap-2.5 shadow-sm ${
        isPending
          ? 'bg-amber-50 border-b border-amber-200 text-amber-900'
          : 'bg-red-50 border-b border-red-200 text-red-900'
      }`}
    >
      {isPending ? (
        <>
          <div
            aria-hidden="true"
            className="animate-spin h-4 w-4 border-2 border-amber-600 border-t-transparent rounded-full flex-shrink-0"
          />
          <span>
            Waking up backend services on Render free tier — this can take up to 60 seconds on first visit.
          </span>
        </>
      ) : (
        <span>
          Backend unreachable. The demo may not work right now — refresh in a minute.
        </span>
      )}
    </div>
  )
}

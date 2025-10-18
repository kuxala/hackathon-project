'use client'

import type { HTMLAttributes } from 'react'

interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  label?: string
  description?: string
  fullscreen?: boolean
}

export function LoadingState({
  label = 'Getting things ready',
  description,
  fullscreen = false,
  className = '',
  ...rest
}: LoadingStateProps) {
  const containerClasses = [
    'flex flex-col items-center justify-center gap-4 text-center text-foreground/80',
    fullscreen ? 'min-h-screen w-full' : '',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses} {...rest}>
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute h-full w-full animate-pulse rounded-full bg-gradient-to-tr from-emerald-500/20 via-sky-500/10 to-violet-500/20 blur-lg" />
        <span className="absolute h-full w-full rounded-full border border-emerald-400/30" />
        <svg
          className="h-10 w-10 animate-spin text-emerald-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          role="img"
          aria-label="Loading"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 0114.32-4.906.75.75 0 101.28-.812 9.5 9.5 0 100 11.436.75.75 0 10-1.28-.812A8 8 0 014 12z"
          />
        </svg>
      </div>

      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? (
          <p className="mt-1 text-xs text-foreground/60">{description}</p>
        ) : null}
      </div>
    </div>
  )
}

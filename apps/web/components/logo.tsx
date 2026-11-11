import React from 'react'

/**
 * SynergySpace mark: two overlapping squares — two people, one shared space.
 * The overlap is the solid part; the rest is outline. Inherits currentColor.
 */
export function Logo({ className = '', size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="currentColor" strokeWidth="2" />
      <rect x="11.5" y="11.5" width="17" height="17" rx="4.5" stroke="currentColor" strokeWidth="2" />
      <path d="M12.5 16a3.5 3.5 0 0 1 3.5-3.5h3.5V16a3.5 3.5 0 0 1-3.5 3.5h-3.5V16Z" fill="currentColor" />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Logo size={22} />
      <span className="text-[15px] font-semibold tracking-tight">SynergySpace</span>
    </span>
  )
}

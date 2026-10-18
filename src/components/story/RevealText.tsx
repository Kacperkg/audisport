import type { ReactNode } from 'react'

type RevealTextProps = {
  as?: 'p' | 'h2'
  children: ReactNode
  className: string
}

export function WipeText({
  as: Component = 'p',
  children,
  className,
}: RevealTextProps) {
  return (
    <Component
      className={`relative inline-block overflow-hidden ${className}`}
      data-story-reveal-item
    >
      <span data-text-content>{children}</span>
      <span
        aria-hidden="true"
        className="absolute inset-0 z-10 origin-left scale-x-0 bg-white"
        data-text-wipe
      />
    </Component>
  )
}

export function SoftRevealText({
  as: Component = 'p',
  children,
  className,
}: RevealTextProps) {
  return (
    <Component
      className={`translate-y-5 opacity-0 ${className}`}
      data-reveal-type="soft"
      data-story-reveal-item
    >
      {children}
    </Component>
  )
}

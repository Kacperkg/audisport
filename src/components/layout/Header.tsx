import { useRef } from 'react'
import { useHeaderTheme } from '@/hooks/useHeaderTheme'

export default function Header() {
  const headerRef = useRef<HTMLElement | null>(null)
  const isOverDark = useHeaderTheme(headerRef)
  const textColor = isOverDark ? 'text-white' : 'text-black'

  return (
    <header
      ref={headerRef}
      className={`fixed inset-x-0 top-0 z-50 px-6 py-5 transition-colors duration-200 sm:px-10 sm:py-6 ${textColor} lg:backdrop-blur-xs`}
    >
      <div className="grid grid-cols-2 items-center gap-4">
        <BrandLink />
        <HeaderMeta />
      </div>
    </header>
  )
}

function BrandLink() {
  return (
    <a
      href="#top"
      className="flex items-center gap-2 justify-self-start text-[11px] font-semibold tracking-[0.2em] uppercase"
    >
      <span>AUDI</span>
      <span className="h-1 w-1 rounded-full bg-red-500 inline-block" />
      <span>SPORT</span>
    </a>
  )
}

function HeaderMeta() {
  return (
    <div className="hidden justify-self-end font-mono text-[10px] tracking-[0.2em] uppercase opacity-60 sm:block">
      EST. 1980 / Q.
    </div>
  )
}

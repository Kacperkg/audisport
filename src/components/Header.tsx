import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

export default function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const headerRef = useRef<HTMLElement | null>(null)
  const [isOverDark, setIsOverDark] = useState(false)

  const items = [
    { to: '/' as const, label: 'Index', num: '01' },
    { to: '/heritage' as const, label: 'Heritage', num: '02' },
    { to: '/legends' as const, label: 'Legends', num: '03' },
  ]

  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    let animationFrame = 0

    const getThemeAtPoint = (x: number, y: number) => {
      const elements = document.elementsFromPoint(x, y)
      const themedElement = elements.find(
        (element) =>
          !header.contains(element) && element.closest('[data-header-theme]'),
      )

      return themedElement?.closest<HTMLElement>('[data-header-theme]')?.dataset
        .headerTheme
    }

    const updateTextColor = () => {
      const rect = header.getBoundingClientRect()
      const samplePoints = [
        [rect.left + rect.width * 0.2, rect.top + rect.height / 2],
        [rect.left + rect.width * 0.5, rect.top + rect.height / 2],
        [rect.left + rect.width * 0.8, rect.top + rect.height / 2],
      ]

      const darkSamples = samplePoints.filter(
        ([x, y]) => getThemeAtPoint(x, y) === 'dark',
      ).length

      setIsOverDark(darkSamples >= 2)
    }

    const queueUpdate = () => {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = window.requestAnimationFrame(updateTextColor)
    }

    queueUpdate()

    window.addEventListener('scroll', queueUpdate, { passive: true })
    window.addEventListener('resize', queueUpdate)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('scroll', queueUpdate)
      window.removeEventListener('resize', queueUpdate)
    }
  }, [pathname])

  const textColor = isOverDark ? 'text-white' : 'text-black'

  return (
    <header
      ref={headerRef}
      className={`fixed inset-x-0 top-0 z-50 px-6 py-5 transition-colors duration-200 sm:px-10 sm:py-6 ${textColor} backdrop-blur-xs`}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 justify-self-start text-[11px] font-semibold tracking-[0.2em] uppercase"
        >
          <span>AUDI</span>
          <span className="h-1 w-1 rounded-full bg-red-500 inline-block" />
          <span>SPORT</span>
        </Link>

        <nav className="flex items-center gap-8 text-[11px] font-medium tracking-[0.18em] uppercase">
          {items.map((item) => {
            const isActive = pathname === item.to

            return (
              <Link
                key={item.to}
                to={item.to}
                className="group relative flex items-center gap-1.5"
              >
                <span className="font-mono text-[9px] opacity-60">
                  {item.num}
                </span>
                <span>{item.label}</span>
                <span
                  className={`absolute -bottom-1.5 left-0 h-px bg-red-500 transition-all duration-300 ${
                    isActive ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                />
              </Link>
            )
          })}
        </nav>

        <div className="hidden justify-self-end font-mono text-[10px] tracking-[0.2em] uppercase opacity-60 sm:block">
          EST. 1980 / Q.
        </div>
      </div>
    </header>
  )
}

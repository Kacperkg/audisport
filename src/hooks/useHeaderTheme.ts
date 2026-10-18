import type { RefObject } from 'react'
import { useEffect, useState } from 'react'

export function useHeaderTheme(headerRef: RefObject<HTMLElement | null>) {
  const [isOverDark, setIsOverDark] = useState(false)

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
  }, [headerRef])

  return isOverDark
}

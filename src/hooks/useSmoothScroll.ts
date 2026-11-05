import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

const WINDOWS_WHEEL_MULTIPLIER = 2.5

function isSteppedWheel(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return true
  if (event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return false

  // Chrome and Edge report pixels for both mice and trackpads. A mouse notch
  // also reports 120 legacy units, while precise scrolling reports pixels there.
  const ticks = Math.abs(
    (event as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY ?? 0,
  )
  return (
    ticks > 0 &&
    ticks % 120 === 0 &&
    Math.abs(Math.abs(event.deltaY) - ticks) >= 1
  )
}

export function useSmoothScroll() {
  useEffect(() => {
    const media = gsap.matchMedia()
    media.add(
      '(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
      () => {
        // The horizontal story still advances through vertical page scroll. Safari
        // trackpads can send a horizontal-only wheel gesture, so accept either axis.
        const isWindows = /Windows/i.test(navigator.userAgent)
        const lenis = new Lenis({
          gestureOrientation: 'both',
          virtualScroll: isWindows
            ? (data) => {
                if (
                  data.event instanceof WheelEvent &&
                  !data.event.ctrlKey &&
                  data.deltaX === 0 &&
                  data.deltaY !== 0 &&
                  isSteppedWheel(data.event)
                ) {
                  data.deltaY *= WINDOWS_WHEEL_MULTIPLIER
                }
                return true
              }
            : undefined,
        })
        const updateScrollTrigger = () => ScrollTrigger.update()
        const tick = (time: number) => lenis.raf(time * 1000)

        lenis.on('scroll', updateScrollTrigger)
        gsap.ticker.add(tick)
        gsap.ticker.lagSmoothing(0)
        ScrollTrigger.refresh()

        return () => {
          lenis.off('scroll', updateScrollTrigger)
          gsap.ticker.remove(tick)
          lenis.destroy()
        }
      },
    )
    return () => media.revert()
  }, [])
}

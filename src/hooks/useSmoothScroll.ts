import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

export function useSmoothScroll() {
  useEffect(() => {
    const media = gsap.matchMedia()
    media.add(
      '(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
      () => {
        // The horizontal story still advances through vertical page scroll. Safari
        // trackpads can send a horizontal-only wheel gesture, so accept either axis.
        const lenis = new Lenis({ gestureOrientation: 'both' })
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

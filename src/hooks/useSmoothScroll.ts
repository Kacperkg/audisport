import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

export function useSmoothScroll() {
  useEffect(() => {
    const shouldUseSmoothScroll = window.matchMedia(
      '(min-width: 1024px) and (pointer: fine)',
    ).matches

    if (!shouldUseSmoothScroll) {
      ScrollTrigger.refresh()
      return
    }

    const lenis = new Lenis()
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
  }, [])
}

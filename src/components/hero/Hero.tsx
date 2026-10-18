import { useRef } from 'react'
import type { RefObject } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useSmoothScroll } from '@/hooks/useSmoothScroll'
import HeroBackground from './HeroBackground'

gsap.registerPlugin(ScrollTrigger)

const HERO_DETAILS = [
  '1980 - PRESENT',
  'Rally. Touring Cars.',
  'Le Mans. Dakar.',
]

export default function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const imageRef = useRef<HTMLDivElement | null>(null)

  useSmoothScroll()

  useGSAP(() => {
    if (!sectionRef.current || !imageRef.current) return

    const usesNativeWebKitScrollAnimation =
      window.matchMedia('(max-width: 1023px)').matches &&
      window.matchMedia('(prefers-reduced-motion: no-preference)').matches &&
      CSS.supports('-webkit-touch-callout', 'none') &&
      CSS.supports('animation-timeline', 'view()')

    if (usesNativeWebKitScrollAnimation) return

    gsap.fromTo(
      imageRef.current,
      { scale: 1 },
      {
        scale: () => {
          if (window.innerWidth >= 768) return 0.45
          if (window.innerWidth >= 640) return 0.4
          return 0.3
        },
        force3D: true,
        transformOrigin: 'center center',
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    )
  }, [])

  return (
    <section
      ref={sectionRef}
      className="hero-scroll-stage relative min-h-[calc(100dvh+50svh)] w-full sm:min-h-[calc(100dvh+70svh)] lg:min-h-[200dvh]"
    >
      <div
        className="sticky top-0 h-[100svh] w-full lg:h-[100dvh]"
        data-header-theme="light"
      >
        <HeroImage imageRef={imageRef} />
        <HeroBackground />
      </div>
    </section>
  )
}

function HeroImage({
  imageRef,
}: {
  imageRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={imageRef}
      data-header-theme="dark"
      className="hero-scale-target relative z-40 grid h-full w-full grid-cols-1 grid-rows-2 overflow-hidden bg-black px-6 py-8 will-change-transform [backface-visibility:hidden] sm:px-10 sm:py-10 lg:grid-cols-2 lg:px-16 lg:py-12"
    >
      <picture className="pointer-events-none absolute inset-0">
        <source
          media="(max-width: 639px)"
          srcSet="/AU090348-1600.webp"
          type="image/webp"
        />
        <source srcSet="/AU090348-2560.webp" type="image/webp" />
        <img
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-[calc(50%+8vw)_center]"
          decoding="async"
          fetchPriority="high"
          loading="eager"
          src="/AU090348-2560.jpg"
        />
      </picture>

      <div className="relative z-10 col-span-1 row-span-1 row-start-2 w-full self-end text-white">
        <h1 className="max-w-[12ch] text-4xl font-bold sm:text-5xl">
          A LEGACY FORGED IN COMPETITION<span className="text-red-500">.</span>
        </h1>
        <div className="font-jetbrains mt-4 text-xs leading-6 text-white/60">
          {HERO_DETAILS.map((detail) => (
            <p key={detail}>{detail}</p>
          ))}
        </div>
      </div>

      <ScrollIndicator />
    </div>
  )
}

function ScrollIndicator() {
  return (
    <div className="relative z-10 col-span-1 row-span-1 row-start-2 hidden flex-col items-center self-end justify-self-end text-white sm:flex lg:col-start-2">
      <p className="text-xs uppercase tracking-widest font-jetbrains">SCROLL</p>
      <div className="h-3" />
      <div className="w-px h-15 bg-white" />
      <div className="h-6" />
      <div className="flex flex-col items-center">
        <div className="w-px h-10 bg-white" />
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-white" />
      </div>
    </div>
  )
}

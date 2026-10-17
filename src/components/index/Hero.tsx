import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

const BACKGROUND_YEARS = [
  {
    year: '1980',
    className:
      'col-span-2 row-span-1 row-start-2 col-start-2 self-center justify-self-start text-7xl font-black font-jetbrains sm:text-9xl lg:text-[180px]',
  },
  {
    year: '2026',
    className:
      'col-span-2 row-span-1 row-start-2 col-start-13 self-center text-7xl font-black font-jetbrains sm:col-start-15 sm:text-9xl lg:text-[180px]',
  },
]

const HERO_DETAILS = [
  '1980 - PRESENT',
  'Rally. Touring Cars.',
  'Le Mans. Dakar.',
]

const STATS = [
  { value: '500', suffix: '+', label: 'Race wins' },
  { value: '13', label: 'Le Mans Victories' },
  { value: '4', label: 'Dakar wins' },
  { value: '7', label: 'Drivers Championships' },
  { value: '100', suffix: '+', label: 'Pole Positions' },
]

export default function Hero() {
  const heroSectionRef = useRef<HTMLElement | null>(null)
  const heroImageRef = useRef<HTMLDivElement | null>(null)

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

  useGSAP(() => {
    if (!heroSectionRef.current || !heroImageRef.current) return

    gsap.fromTo(
      heroImageRef.current,
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
          trigger: heroSectionRef.current,
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
      ref={heroSectionRef}
      className="relative min-h-[calc(100dvh+50svh)] w-full sm:min-h-[calc(100dvh+70svh)] lg:min-h-[200dvh]"
    >
      <div className="sticky top-0 h-[100dvh] w-full" data-header-theme="light">
        <HeroImage heroImageRef={heroImageRef} />
        <BackgroundText />
      </div>
    </section>
  )
}

function BackgroundText() {
  return (
    <section className="absolute inset-0 z-0 grid h-full w-full grid-cols-20 grid-rows-3 overflow-hidden text-black/10">
      <BackgroundYears />

      <div className="col-span-20 row-span-1 row-start-3 mt-8 self-start justify-self-center px-4 text-black sm:mt-14 lg:mt-20">
        <BackgroundTitle />

        <BackgroundStats />
      </div>
    </section>
  )
}

function BackgroundYears() {
  return (
    <>
      {BACKGROUND_YEARS.map((item) => (
        <h1 key={item.year} className={item.className}>
          {item.year}
        </h1>
      ))}
    </>
  )
}

function BackgroundTitle() {
  return (
    <aside className="flex items-center justify-center gap-3 sm:gap-4">
      <HorizontalDivider />
      <h1 className="font-jetbrains text-center text-sm font-medium leading-loose sm:text-xl">
        <span className="inline-flex items-center">
          40 <span className="text-sm ml-1 leading-none">+</span>
        </span>{' '}
        YEARS OF MOTORSPORT
      </h1>
      <HorizontalDivider />
    </aside>
  )
}

function BackgroundStats() {
  return (
    <ul className="mt-2 grid grow grid-cols-2 gap-x-5 gap-y-2 p-2 text-3xl leading-none text-black sm:mt-4 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-5 sm:p-4 sm:text-5xl lg:flex lg:flex-row lg:justify-between lg:gap-8 lg:text-7xl">
      {STATS.map((stat, index) => (
        <StatGroup
          key={stat.label}
          stat={stat}
          isLast={index === STATS.length - 1}
          showDivider={index < STATS.length - 1}
        />
      ))}
    </ul>
  )
}

function StatGroup({
  isLast,
  stat,
  showDivider,
}: {
  isLast: boolean
  stat: (typeof STATS)[number]
  showDivider: boolean
}) {
  return (
    <>
      <StatItem stat={stat} isLast={isLast} />
      {showDivider && <VerticalDivider />}
    </>
  )
}

function StatItem({
  isLast,
  stat,
}: {
  isLast: boolean
  stat: (typeof STATS)[number]
}) {
  return (
    <li
      className={`flex flex-col items-center justify-center text-center ${
        isLast ? 'col-span-2 sm:col-span-1' : ''
      }`}
    >
      {stat.suffix ? (
        <span className="inline-flex items-center">
          {stat.value}
          <span className="text-xl leading-none sm:text-4xl">
            {stat.suffix}
          </span>
        </span>
      ) : (
        <span>{stat.value}</span>
      )}
      <h4 className="font-jetbrains mt-1 text-[9px] leading-tight text-black/30 sm:text-sm">
        {stat.label}
      </h4>
    </li>
  )
}

function HorizontalDivider() {
  return <div className="h-px w-10 bg-black/30 sm:w-20"></div>
}

function VerticalDivider() {
  return <div className="hidden w-px grow bg-black/30 lg:flex"></div>
}

function HeroImage({
  heroImageRef,
}: {
  heroImageRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={heroImageRef}
      data-header-theme="dark"
      className="relative z-40 grid h-full w-full grid-cols-1 grid-rows-2 overflow-hidden bg-black px-6 py-8 will-change-transform [backface-visibility:hidden] sm:px-10 sm:py-10 lg:grid-cols-2 lg:px-16 lg:py-12"
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

import heroimage from '../../../public/AU090348_medium.jpg'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

const BACKGROUND_YEARS = [
  {
    year: '1980',
    className:
      'col-span-2 row-span-1 row-start-2 col-start-2 self-center justify-self-start text-[180px] font-black font-jetbrains',
  },
  {
    year: '2025',
    className:
      'col-span-2 row-span-1 row-start-2 col-start-15 self-center text-[180px] font-black font-jetbrains',
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
  const heroImageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
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
    if (!heroImageRef.current) return

    gsap.from(heroImageRef.current, {
      scale: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: heroImageRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    })
  }, [])

  return (
    <section className="min-h-[200svh] w-full relative bg-cover bg-center">
      <div className="w-full sticky top-0" data-header-theme="light">
        <HeroImage heroImageRef={heroImageRef} />
        <BackgroundText />
      </div>
    </section>
  )
}

function BackgroundText() {
  return (
    <section className="absolute inset-0 w-full min-h-screen text-black/10 z-0 grid grid-cols-20 grid-rows-3">
      <BackgroundYears />

      <div className="col-span-20 row-span-1 row-start-3 self-start justify-self-center text-black mt-20">
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
    <aside className="flex items-center justify-center gap-4">
      <HorizontalDivider />
      <h1 className="text-center text-xl leading-loose font-medium font-jetbrains">
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
    <ul className="flex flex-row gap-8 text-black text-7xl justify-between grow mt-4 p-4">
      {STATS.map((stat, index) => (
        <StatGroup
          key={stat.label}
          stat={stat}
          showDivider={index < STATS.length - 1}
        />
      ))}
    </ul>
  )
}

function StatGroup({
  stat,
  showDivider,
}: {
  stat: (typeof STATS)[number]
  showDivider: boolean
}) {
  return (
    <>
      <StatItem stat={stat} />
      {showDivider && <VerticalDivider />}
    </>
  )
}

function StatItem({ stat }: { stat: (typeof STATS)[number] }) {
  return (
    <li className="flex flex-col justify-center items-center">
      {stat.suffix ? (
        <span className="inline-flex items-center">
          {stat.value}
          <span className="text-4xl leading-none">{stat.suffix}</span>
        </span>
      ) : (
        <span>{stat.value}</span>
      )}
      <h4 className="text-sm text-black/30 font-jetbrains">{stat.label}</h4>
    </li>
  )
}

function HorizontalDivider() {
  return <div className="w-20 h-px bg-black/30"></div>
}

function VerticalDivider() {
  return <div className="w-px flex grow bg-black/30"></div>
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
      className="min-h-screen w-full scale-45 bg-no-repeat bg-auto bg-position-[calc(50%+8vw)_center] bg-black grid grid-cols-2 grid-rows-2 z-40 relative px-16 py-12"
      style={{
        backgroundImage: `url(${heroimage})`,
        backgroundSize: 'cover',
      }}
    >
      <div className="text-white col-span-1 row-span-1 row-start-2 self-end w-full">
        <h1 className="max-w-[12ch] text-5xl font-bold">
          A LEGACY FORGED IN COMPETITION<span className="text-red-500">.</span>
        </h1>
        <div className="text-xs text-white/60 leading-6 font-jetbrains mt-4">
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
    <div className="col-span-1 row-span-1 row-start-2 col-start-2 text-white self-end justify-self-end flex flex-col items-center">
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

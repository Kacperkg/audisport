import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { ReactNode } from 'react'
import { useRef } from 'react'

gsap.registerPlugin(ScrollTrigger)

const STATEMENT_LINES = [
  { text: 'Motorsport', targetColor: 'rgba(0, 0, 0, 1)' },
  { text: "isn't built in a season.", targetColor: 'rgba(0, 0, 0, 1)' },
  {
    text: "It's built over decades",
    targetColor: 'rgba(0, 0, 0, 0.5)',
    suffix: <span className="text-red-500">.</span>,
  },
]

const PHILOSOPHY_LINES = [
  'Motorsport is not a result.',
  "It's a mindset.",
  'Built on passion.',
  'Driven by innovation.',
  'Defined by performance.',
]

const PURPOSE_LINES = [
  'Every era brings new challenges.',
  'Every challenge drives us forward.',
  'Every victory becomes part of something greater.',
]

export default function Subsection() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const SubsectionRef = useRef<HTMLDivElement | null>(null)

  useGSAP(() => {
    if (!sectionRef.current || !SubsectionRef.current) return

    const letters = gsap.utils.toArray<HTMLElement>(
      SubsectionRef.current.querySelectorAll('[data-letter]'),
    )
    const lineCovers = gsap.utils.toArray<HTMLElement>(
      sectionRef.current.querySelectorAll('[data-line-cover]'),
    )
    const sideLineCount = Math.max(
      PHILOSOPHY_LINES.length,
      PURPOSE_LINES.length,
    )

    const letterTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: SubsectionRef.current,
        start: '25% 75%',
        end: '75% center',
        scrub: true,
      },
    })

    const sideTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: SubsectionRef.current,
        start: '50% 75%',
        end: '75% center',
        scrub: true,
      },
    })

    letterTimeline.to(
      letters,
      {
        color: (_, letter) => letter.dataset.targetColor ?? 'rgba(0, 0, 0, 1)',
        ease: 'none',
        stagger: 0.03,
      },
      0,
    )

    Array.from({ length: sideLineCount }).forEach((_, index) => {
      const coversForRow = lineCovers.filter(
        (cover) => cover.dataset.lineOrder === String(index),
      )

      sideTimeline.to(
        coversForRow,
        {
          yPercent: 110,
          ease: 'none',
        },
        index * 0.08,
      )
    })
  }, [])

  return (
    <section
      ref={sectionRef}
      className="min-h-[80dvh] w-full grid grid-cols-5 px-20"
    >
      <div className="flex flex-col gap-4 col-start-1 col-span-1 justify-center items-start font-jetbrains text-sm">
        <h1 className="border-b w-full pb-4 border-black/30 uppercase">
          Our Philosophy
        </h1>

        <div className="capitalize leading-relaxed">
          {PHILOSOPHY_LINES.map((line, index) => (
            <MaskedSideLine key={line} order={index}>
              {line}
            </MaskedSideLine>
          ))}
        </div>
      </div>
      <div
        ref={SubsectionRef}
        className="flex flex-col gap-4 col-start-2 col-span-3 justify-center items-center text-center text-6xl uppercase font-black leading-12"
      >
        {STATEMENT_LINES.map((line) => (
          <AnimatedLine key={line.text} {...line} />
        ))}
      </div>
      <div className="flex flex-col gap-4 col-start-5 col-span-1 justify-center items-start font-jetbrains text-sm">
        <h1 className="border-b w-full pb-4 border-black/30 uppercase">
          Our purpose
        </h1>
        <div className="capitalize leading-relaxed">
          {PURPOSE_LINES.map((line, index) => (
            <MaskedSideLine
              key={line}
              order={index}
              className={
                index === PURPOSE_LINES.length - 1 ? 'max-w-[30ch]' : ''
              }
            >
              {line}
            </MaskedSideLine>
          ))}
        </div>
      </div>
    </section>
  )
}

function MaskedSideLine({
  children,
  className = '',
  order,
}: {
  children: string
  className?: string
  order: number
}) {
  return (
    <h2 className={`relative isolate overflow-hidden ${className}`}>
      <span className="relative z-0">{children}</span>
      <span
        aria-hidden="true"
        className="absolute inset-0 z-10 bg-[#F8F6F2]"
        data-line-cover
        data-line-order={order}
      />
    </h2>
  )
}

function AnimatedLine({
  text,
  targetColor,
  suffix,
}: {
  text: string
  targetColor: string
  suffix?: ReactNode
}) {
  return (
    <h1 aria-label={`${text}${suffix ? '.' : ''}`}>
      {Array.from(text).map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          aria-hidden="true"
          className="inline-block text-black/5"
          data-letter
          data-target-color={targetColor}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </span>
      ))}
      {suffix}
    </h1>
  )
}

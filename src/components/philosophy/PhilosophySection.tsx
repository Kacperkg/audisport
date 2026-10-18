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

export default function PhilosophySection() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const statementRef = useRef<HTMLDivElement | null>(null)

  useGSAP(() => {
    if (!sectionRef.current || !statementRef.current) return

    const letters = gsap.utils.toArray<HTMLElement>(
      statementRef.current.querySelectorAll('[data-letter]'),
    )
    const lineCovers = gsap.utils.toArray<HTMLElement>(
      sectionRef.current.querySelectorAll('[data-line-cover]'),
    )
    const sideLineCount = Math.max(
      PHILOSOPHY_LINES.length,
      PURPOSE_LINES.length,
    )

    gsap
      .timeline({
        scrollTrigger: {
          trigger: statementRef.current,
          start: '75% 75%',
          end: '75% center',
          scrub: true,
        },
      })
      .to(
        letters,
        {
          color: (_, letter) =>
            letter.dataset.targetColor ?? 'rgba(0, 0, 0, 1)',
          ease: 'none',
          stagger: 0.03,
        },
        0,
      )

    const sideTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: statementRef.current,
        start: 'bottom 75%',
        end: 'bottom center',
        scrub: true,
      },
    })

    Array.from({ length: sideLineCount }).forEach((_, index) => {
      const coversForRow = lineCovers.filter(
        (cover) => cover.dataset.lineOrder === String(index),
      )

      sideTimeline.to(
        coversForRow,
        { yPercent: 110, ease: 'none' },
        index * 0.08,
      )
    })
  }, [])

  return (
    <section
      ref={sectionRef}
      className="z-10 grid min-h-screen w-full grid-cols-1 gap-12 px-6 py-28 sm:px-10 2xl:sticky 2xl:top-0 2xl:grid-cols-5 2xl:gap-0 2xl:px-20 2xl:py-0"
    >
      <SideCopy title="Our Philosophy" lines={PHILOSOPHY_LINES} />

      <div
        ref={statementRef}
        className="order-1 flex flex-col items-center justify-center gap-4 text-center text-4xl font-black uppercase leading-[0.9] sm:text-5xl 2xl:order-none 2xl:col-span-3 2xl:col-start-2 2xl:text-6xl 2xl:leading-12"
      >
        {STATEMENT_LINES.map((line) => (
          <AnimatedLine key={line.text} {...line} />
        ))}
      </div>

      <SideCopy title="Our purpose" lines={PURPOSE_LINES} position="right" />
    </section>
  )
}

function SideCopy({
  lines,
  position = 'left',
  title,
}: {
  lines: string[]
  position?: 'left' | 'right'
  title: string
}) {
  const placement =
    position === 'left'
      ? 'order-2 2xl:order-none 2xl:col-start-1'
      : 'order-3 2xl:order-none 2xl:col-start-5'

  return (
    <div
      className={`font-jetbrains flex flex-col items-start justify-center gap-4 text-sm 2xl:col-span-1 ${placement}`}
    >
      <h2 className="border-b w-full pb-4 border-black/30 uppercase">
        {title}
      </h2>
      <div className="capitalize leading-relaxed">
        {lines.map((line, index) => (
          <MaskedSideLine
            key={line}
            order={index}
            className={
              position === 'right' && index === lines.length - 1
                ? 'max-w-[30ch]'
                : ''
            }
          >
            {line}
          </MaskedSideLine>
        ))}
      </div>
    </div>
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
    <p className={`relative isolate overflow-hidden ${className}`}>
      <span className="relative z-0">{children}</span>
      <span
        aria-hidden="true"
        className="absolute inset-0 z-10 bg-[#F8F6F2]"
        data-line-cover
        data-line-order={order}
      />
    </p>
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
    <h2 aria-label={`${text}${suffix ? '.' : ''}`}>
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
    </h2>
  )
}

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'

gsap.registerPlugin(ScrollTrigger)

const CHAPTERS = [
  {
    year: '1980',
    title: 'The quattro Revolution',
    subtitle: 'The moment everything changed.',
    copy: 'Audi introduced quattro all-wheel drive to world rallying, changing the way performance was understood on loose surfaces.',
    detail:
      'It was not just traction. It was a new way to carry speed, rotate a car, and attack terrain that had previously belonged to compromise.',
    note: 'Group B rewrote the rules.',
    layout: 'split-right',
    image: '/audi-quattro-1980-bw.webp',
    imageAlt: 'The original Audi quattro displayed at its 1980 debut',
  },
  {
    year: '1987',
    title: 'Pikes Peak',
    subtitle: 'The mountain was never the same.',
    copy: "Walter Rohrl's Sport quattro S1 became one of Audi's most iconic motorsport moments, turning engineering into legend.",
    detail:
      'The climb turned quattro into theatre: altitude, dust, boost and bravery compressed into one brutal ascent.',
    note: '14,115 ft above sea level.',
    layout: 'image-left',
    image: '/audi-pikes-peak-1987-bw.webp',
    imageAlt: 'Walter Röhrl driving the Audi Sport quattro S1 at Pikes Peak',
  },
  {
    year: '1990s',
    title: 'Touring Car Dominance',
    subtitle: 'quattro conquered the circuit.',
    copy: 'After rallying, Audi carried its technology onto asphalt, proving itself across touring car championships.',
    detail:
      'The surfaces changed, but the idea remained the same: make technology invisible by making the car feel inevitable.',
    note: 'From stages to circuits.',
    layout: 'centered',
    image: '/audi-touring-1990s-bw.webp',
    imageAlt: 'Hans-Joachim Stuck in the Audi V8 quattro touring car',
  },
  {
    year: '2000-2014',
    title: 'The Le Mans Era',
    subtitle: 'Endurance redefined.',
    copy: "Audi built one of endurance racing's greatest dynasties, with the R8, R10 and R18 collecting 13 Le Mans victories.",
    detail:
      'Speed mattered, but so did silence, rhythm and repeatability. Audi made endurance feel engineered down to the second.',
    note: '13 victories at Le Mans.',
    layout: 'wide-image',
    image: '/audi-le-mans-2013-bw.webp',
    imageAlt: 'Audi R18 e-tron quattro race cars at the 24 Hours of Le Mans',
  },
  {
    year: '2024',
    title: 'Dakar Reinvented',
    subtitle: 'Innovation never stops.',
    copy: "The RS Q e-tron continued Audi's tradition of challenging convention, bringing electrified performance to the desert.",
    detail:
      'Dakar demanded a different kind of answer: range, recovery, heat and control across a landscape that refused certainty.',
    note: 'Electrified performance, off road.',
    layout: 'offset',
    image: '/audi-dakar-2024-bw.webp',
    imageAlt: 'The Audi RS Q e-tron Dakar prototype on display',
  },
]

const F1_REVEAL_ROWS = 5
const STORY_IMAGE_SOURCES = [
  ...CHAPTERS.map(({ image }) => image),
  '/audi-r26-f1.jpg',
]

export default function SectionOne() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false

    const preloadStoryImages = async () => {
      for (const source of STORY_IMAGE_SOURCES) {
        if (cancelled) return

        const image = new Image()
        image.decoding = 'async'
        image.src = source

        try {
          await image.decode()
        } catch {
          // The visible image can still load normally if decoding is interrupted.
        }
      }
    }

    void preloadStoryImages()

    return () => {
      cancelled = true
    }
  }, [])

  useGSAP(() => {
    if (!sectionRef.current || !trackRef.current) return

    const media = gsap.matchMedia()

    const getScrollDistance = () =>
      trackRef.current ? trackRef.current.scrollWidth - window.innerWidth : 0

    const createRevealController = () => {
      if (!trackRef.current) return null

      const revealItems = gsap.utils.toArray<HTMLElement>(
        trackRef.current.querySelectorAll('[data-story-reveal-item]'),
      )
      const textContents = gsap.utils.toArray<HTMLElement>(
        trackRef.current.querySelectorAll('[data-text-content]'),
      )
      const textWipes = gsap.utils.toArray<HTMLSpanElement>(
        trackRef.current.querySelectorAll('[data-text-wipe]'),
      )
      const redBlocks = gsap.utils.toArray<HTMLElement>(
        trackRef.current.querySelectorAll('[data-red-block]'),
      )
      const f1Reveal =
        trackRef.current.querySelector<HTMLElement>('[data-f1-reveal]')
      const f1Rows = gsap.utils.toArray<HTMLElement>(
        trackRef.current.querySelectorAll('[data-f1-row]'),
      )
      const f1CopyLabel = trackRef.current.querySelector<HTMLElement>(
        '[data-f1-copy-label]',
      )
      const f1CopyOverlay = trackRef.current.querySelector<HTMLElement>(
        '[data-f1-copy-overlay]',
      )
      const f1CopyRule = trackRef.current.querySelector<HTMLElement>(
        '[data-f1-copy-rule]',
      )
      const f1TitleContent = trackRef.current.querySelector<HTMLElement>(
        '[data-f1-title-content]',
      )
      const f1TitleWipe = trackRef.current.querySelector<HTMLElement>(
        '[data-f1-title-wipe]',
      )
      const f1CopySupport = trackRef.current.querySelector<HTMLElement>(
        '[data-f1-copy-support]',
      )
      const revealedItems = new Set<HTMLElement>()

      gsap.set(textContents, { opacity: 0 })
      gsap.set(textWipes, { scaleX: 0, transformOrigin: 'left center' })
      gsap.set(redBlocks, { opacity: 0, y: 24 })
      gsap.set(f1Rows, {
        height: '0%',
        transformOrigin: 'bottom center',
      })
      gsap.set([f1CopyLabel, f1CopySupport], { opacity: 0, y: 14 })
      gsap.set(f1CopyOverlay, { visibility: 'hidden' })
      gsap.set(f1CopyRule, { scaleX: 0, transformOrigin: 'left center' })
      gsap.set(f1TitleContent, { opacity: 0 })
      gsap.set(f1TitleWipe, { scaleX: 0, transformOrigin: 'left center' })

      const getTrackOffset = (element: HTMLElement) => {
        let offset = 0
        let current: HTMLElement | null = element

        while (current && current !== trackRef.current) {
          offset += current.offsetLeft
          current = current.offsetParent as HTMLElement | null
        }

        return offset
      }

      const revealTextItem = (item: HTMLElement) => {
        if (item.dataset.revealType === 'soft') {
          gsap.to(item, {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 0.65,
            ease: 'power3.out',
          })
          return
        }

        const content = item.querySelector<HTMLElement>('[data-text-content]')
        const wipe = item.querySelector<HTMLSpanElement>('[data-text-wipe]')

        if (!content || !wipe) return

        gsap
          .timeline()
          .set(wipe, { transformOrigin: 'left center' })
          .to(wipe, { scaleX: 1, duration: 0.2, ease: 'power3.inOut' })
          .set(content, { opacity: 1 }, 0.16)
          .set(wipe, { transformOrigin: 'right center' }, 0.2)
          .to(wipe, { scaleX: 0, duration: 0.24, ease: 'power3.inOut' }, 0.2)
      }

      const revealItem = (item: HTMLElement) => {
        if (revealedItems.has(item)) return

        revealedItems.add(item)

        if (item.dataset.redBlock !== undefined) {
          gsap.to(item, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power2.out',
            overwrite: 'auto',
          })
          return
        }

        revealTextItem(item)
      }

      const revealActiveItems = () => {
        const trackPosition = Math.abs(
          Number(gsap.getProperty(trackRef.current, 'x')),
        )
        const revealPoint = trackPosition + window.innerWidth * 0.75

        ;[...revealItems, ...redBlocks].forEach((item) => {
          if (revealPoint >= getTrackOffset(item)) {
            revealItem(item)
          }
        })
      }

      const revealOnScroll = () => {
        ;[...revealItems, ...redBlocks].forEach((item) => {
          ScrollTrigger.create({
            trigger: item,
            start: 'top 82%',
            once: true,
            onEnter: () => revealItem(item),
          })
        })
      }

      return {
        f1Reveal,
        f1Rows,
        f1CopyLabel,
        f1CopyOverlay,
        f1CopyRule,
        f1CopySupport,
        f1TitleContent,
        f1TitleWipe,
        revealActiveItems,
        revealItem,
        revealOnScroll,
      }
    }

    media.add('(min-width: 1024px)', () => {
      const revealController = createRevealController()
      if (!revealController || !sectionRef.current || !trackRef.current) return

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: () => `+=${getScrollDistance() + window.innerHeight}`,
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: revealController.revealActiveItems,
          onUpdate: revealController.revealActiveItems,
        },
      })

      timeline.to(
        trackRef.current,
        {
          x: () => -getScrollDistance(),
          ease: 'none',
          duration: getScrollDistance,
        },
        0,
      )

      timeline.to(revealController.f1Rows, {
        height: '100%',
        duration: window.innerHeight * 0.42,
        ease: 'power3.inOut',
        stagger: {
          each: window.innerHeight * 0.07,
          from: 'end',
        },
      })

      timeline
        .set(revealController.f1CopyOverlay, { visibility: 'visible' })
        .to(revealController.f1CopyRule, {
          scaleX: 1,
          duration: window.innerHeight * 0.05,
          ease: 'power2.out',
        })
        .to(
          revealController.f1CopyLabel,
          {
            opacity: 1,
            y: 0,
            duration: window.innerHeight * 0.06,
            ease: 'power2.out',
          },
          '<',
        )
        .to(revealController.f1TitleWipe, {
          scaleX: 1,
          duration: window.innerHeight * 0.06,
          ease: 'power3.inOut',
        })
        .set(revealController.f1TitleContent, { opacity: 1 })
        .set(revealController.f1TitleWipe, {
          transformOrigin: 'right center',
        })
        .to(revealController.f1TitleWipe, {
          scaleX: 0,
          duration: window.innerHeight * 0.08,
          ease: 'power3.inOut',
        })
        .to(revealController.f1CopySupport, {
          opacity: 1,
          y: 0,
          duration: window.innerHeight * 0.05,
          ease: 'power2.out',
        })
    })

    media.add('(max-width: 1023px)', () => {
      const revealController = createRevealController()
      if (!revealController) return

      if (trackRef.current) {
        gsap.set(trackRef.current, { clearProps: 'transform' })
      }

      revealController.revealOnScroll()

      if (revealController.f1Reveal) {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: revealController.f1Reveal,
              start: 'top 80%',
              end: 'top 10%',
              scrub: true,
            },
          })
          .to(revealController.f1Rows, {
            height: '100%',
            duration: 0.7,
            ease: 'power3.inOut',
            stagger: {
              each: 0.08,
              from: 'end',
            },
          })
          .set(revealController.f1CopyOverlay, { visibility: 'visible' })
          .to(revealController.f1CopyRule, {
            scaleX: 1,
            duration: 0.08,
          })
          .to(
            revealController.f1CopyLabel,
            { opacity: 1, y: 0, duration: 0.1 },
            '<',
          )
          .to(revealController.f1TitleWipe, {
            scaleX: 1,
            duration: 0.1,
          })
          .set(revealController.f1TitleContent, { opacity: 1 })
          .set(revealController.f1TitleWipe, {
            transformOrigin: 'right center',
          })
          .to(revealController.f1TitleWipe, {
            scaleX: 0,
            duration: 0.12,
          })
          .to(revealController.f1CopySupport, {
            opacity: 1,
            y: 0,
            duration: 0.1,
          })
      }

      const firstPanelItems = gsap.utils.toArray<HTMLElement>(
        trackRef.current?.querySelectorAll(
          '[data-story-panel]:first-child [data-story-reveal-item]',
        ) ?? [],
      )

      firstPanelItems.forEach((item) => {
        if (item.getBoundingClientRect().top < window.innerHeight) {
          revealController.revealItem(item)
        }
      })
    })

    return () => media.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative bg-black lg:h-screen lg:overflow-hidden"
    >
      <div
        ref={trackRef}
        className="flex w-full flex-col lg:h-full lg:w-max lg:flex-row"
      >
        <IntroPanel />
        {CHAPTERS.map((chapter) => (
          <StoryChapter key={chapter.title} chapter={chapter} />
        ))}
        <FinalChapter />
      </div>
    </section>
  )
}

function IntroPanel() {
  return (
    <article
      className="relative flex min-h-screen w-full shrink-0 items-center justify-center overflow-hidden bg-black px-6 py-28 text-white sm:px-10 lg:h-full lg:w-screen lg:px-20 lg:py-0"
      data-header-theme="dark"
      data-story-panel
    >
      <p className="font-jetbrains absolute bottom-12 right-6 text-[10px] uppercase tracking-[0.3em] text-white/35 sm:right-10 lg:bottom-20 lg:right-20 lg:text-[11px]">
        Scroll to begin
      </p>
      <div className="text-center">
        <h1 className="font-jetbrains text-xs uppercase tracking-[0.35em] text-white/40">
          Audi Motorsport
        </h1>
        <h1 className="mt-8 max-w-[12ch] text-5xl font-black uppercase leading-[0.86] tracking-tight text-white sm:text-7xl lg:text-8xl">
          Where it all started<span className="text-red-500">.</span>
        </h1>
      </div>
    </article>
  )
}

function StoryChapter({ chapter }: { chapter: (typeof CHAPTERS)[number] }) {
  const isImageLeft = chapter.layout === 'image-left'
  const isCentered = chapter.layout === 'centered'
  const isWideImage = chapter.layout === 'wide-image'
  const isOffset = chapter.layout === 'offset'

  return (
    <article
      className="relative grid min-h-screen w-full shrink-0 grid-cols-1 gap-12 overflow-hidden bg-black px-6 py-24 text-white sm:px-10 lg:h-full lg:w-[128vw] lg:grid-cols-12 lg:gap-0 lg:px-24 lg:py-16"
      data-header-theme="dark"
      data-story-panel
    >
      <p
        className={`pointer-events-none absolute font-jetbrains text-[32vw] font-black leading-none text-white/[0.035] lg:text-[20vw] ${
          isImageLeft
            ? 'right-6 top-14 lg:right-24'
            : 'left-6 top-12 lg:left-20'
        }`}
      >
        {chapter.year}
      </p>

      <div
        className={`relative z-10 flex flex-col justify-center ${
          isCentered
            ? 'lg:col-span-5 lg:col-start-5 lg:items-center lg:text-center'
            : isImageLeft
              ? 'lg:col-span-4 lg:col-start-8'
              : isOffset
                ? 'lg:col-span-4 lg:col-start-2 lg:justify-end lg:pb-24'
                : 'lg:col-span-4 lg:col-start-2'
        }`}
      >
        <WipeText className="font-jetbrains mb-8 flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-white/50 sm:text-[11px] sm:tracking-[0.28em]">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          <span>{chapter.year}</span>
        </WipeText>

        <WipeText
          as="h2"
          className="max-w-[10ch] text-5xl font-black uppercase leading-[0.9] tracking-tight text-white sm:text-6xl lg:text-7xl"
        >
          {chapter.title}
          <span className="text-red-500">.</span>
        </WipeText>
        <WipeText className="font-jetbrains mt-7 text-xs uppercase tracking-[0.18em] text-white/60 sm:text-sm sm:tracking-[0.2em]">
          {chapter.subtitle}
        </WipeText>
        <SoftRevealText className="mt-8 max-w-[46ch] text-base leading-7 text-white/70">
          {chapter.copy}
        </SoftRevealText>
        <SoftRevealText className="mt-8 max-w-[50ch] text-sm leading-6 text-white/45">
          {chapter.detail}
        </SoftRevealText>
        <SoftRevealText className="mt-10 font-jetbrains text-[11px] uppercase tracking-[0.22em] text-white/45">
          {chapter.note}
        </SoftRevealText>
      </div>

      <div
        className={`relative flex ${
          isCentered
            ? 'items-end lg:col-span-9 lg:col-start-2 lg:row-start-1 lg:pb-14'
            : isImageLeft
              ? 'items-center lg:col-span-5 lg:col-start-2 lg:-translate-y-24'
              : isWideImage
                ? 'items-end lg:col-span-6 lg:col-start-7 lg:pb-20'
                : isOffset
                  ? 'items-start lg:col-span-5 lg:col-start-8 lg:pt-24'
                  : 'items-center lg:col-span-5 lg:col-start-8'
        }`}
      >
        <div
          className={`overflow-hidden bg-red-600/90 ${
            isCentered
              ? 'h-[26vh] w-full lg:h-[18vh]'
              : isWideImage
                ? 'h-[34vh] w-full lg:h-[42vh]'
                : isOffset
                  ? 'h-[42vh] w-[74%] lg:h-[52vh]'
                  : 'h-[42vh] w-full lg:h-[66vh]'
          }`}
          data-red-block
        >
          <img
            alt={chapter.imageAlt}
            className="h-full w-full object-cover"
            decoding="async"
            loading="eager"
            src={chapter.image}
          />
        </div>
      </div>
    </article>
  )
}

function FinalChapter() {
  return (
    <article
      className="relative flex min-h-screen w-full shrink-0 items-center justify-center overflow-hidden bg-black px-6 py-28 text-center text-white sm:px-10 lg:h-full lg:w-screen lg:px-20 lg:py-0"
      data-header-theme="dark"
      data-story-panel
    >
      <p className="absolute inset-x-0 top-12 font-jetbrains text-[16vw] font-black uppercase leading-none text-white/[0.035]"></p>
      <div className="relative z-10">
        <WipeText
          as="h2"
          className="text-5xl font-black uppercase tracking-tight text-white sm:text-7xl lg:text-8xl"
        >
          What's next<span className="text-red-500">?</span>
        </WipeText>
      </div>
      <div className="absolute inset-0 z-20" data-f1-reveal>
        <span className="sr-only">
          Audi R26 Formula 1 car in its special 2026 Singapore livery
        </span>
        {Array.from({ length: F1_REVEAL_ROWS }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="absolute inset-x-0 h-1/5 overflow-hidden"
            style={{ top: `${index * 20}%` }}
          >
            <div
              className="absolute inset-x-0 bottom-0 overflow-hidden"
              data-f1-row
              data-header-theme="light"
            >
              <img
                alt=""
                className="pointer-events-none absolute left-0 h-[100dvh] w-full max-w-none object-cover object-center"
                decoding="async"
                src="/audi-r26-f1.jpg"
                style={{ bottom: `${-(F1_REVEAL_ROWS - index - 1) * 20}dvh` }}
              />
            </div>
          </div>
        ))}

        <div
          className="absolute inset-0 z-30 text-left text-black"
          data-f1-copy-overlay
          data-header-theme="light"
        >
          <div className="absolute left-6 top-28 sm:left-10 sm:top-32 lg:left-20">
            <div className="h-px w-16 bg-red-600 sm:w-24" data-f1-copy-rule />
            <p
              className="font-jetbrains mt-4 text-[10px] font-semibold uppercase leading-5 tracking-[0.24em] sm:text-xs"
              data-f1-copy-label
            >
              The next chapter
              <br />
              Formula 1 / 2026
            </p>
          </div>

          <div className="absolute bottom-10 left-6 sm:bottom-12 sm:left-10 lg:bottom-16 lg:left-20">
            <h2 className="relative inline-block overflow-hidden text-7xl font-black uppercase leading-[0.78] tracking-[-0.06em] sm:text-9xl lg:text-[10rem]">
              <span data-f1-title-content>
                R26<span className="text-red-600">.</span>
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-0 z-10 origin-left scale-x-0 bg-black"
                data-f1-title-wipe
              />
            </h2>
            <p
              className="font-jetbrains mt-5 text-[10px] font-semibold uppercase tracking-[0.26em] sm:text-xs"
              data-f1-copy-support
            >
              Built to challenge.
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}

function WipeText({
  as: Component = 'p',
  children,
  className,
}: {
  as?: 'p' | 'h2'
  children: ReactNode
  className: string
}) {
  return (
    <Component
      className={`relative inline-block overflow-hidden ${className}`}
      data-story-reveal-item
    >
      <span data-text-content>{children}</span>
      <span
        aria-hidden="true"
        className="absolute inset-0 z-10 origin-left scale-x-0 bg-white"
        data-text-wipe
      />
    </Component>
  )
}

function SoftRevealText({
  as: Component = 'p',
  children,
  className,
}: {
  as?: 'p' | 'h2'
  children: ReactNode
  className: string
}) {
  return (
    <Component
      className={`translate-y-5 opacity-0 blur-sm [clip-path:inset(0_0_100%_0)] ${className}`}
      data-reveal-type="soft"
      data-story-reveal-item
    >
      {children}
    </Component>
  )
}
